'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = function(args = {}) {
    const { xLog, getConfig } = process.global;
    const { extractAtomicFacts, generateEmbeddingStrings } = require('./atomic-fact-extractor')();

    // ---------------------------------------------------------------------
    // dataProfileStrategies - defines key formatting strategies for different data profiles
    
    const dataProfileStrategies = {
        sif: {
            formatKeyForLookup: (key) => key.toString(), // Standard string conversion
            name: 'SIF'
        },
        ceds: {
            formatKeyForLookup: (key) => key.toString().padStart(6, '0'), // Zero-pad to 6 digits
            name: 'CEDS'
        }
    };

    const scoreDistanceResults = async (args) => {
        const { 
            queryString, 
            vectorDb, 
            openai, 
            tableName, 
            resultCount = 5,
            dataProfile,
            sourceTableName,
            sourcePrivateKeyName,
            sourceEmbeddableContentName,
            // Verbose tracking parameters
            collectVerboseData = false
        } = args;

        const atomicTableName = `${tableName}_atomic`;

        // Get the strategy for this data profile
        const strategy = dataProfileStrategies[dataProfile];
        if (!strategy) {
            xLog.error(`Unknown data profile: ${dataProfile}. Supported profiles: ${Object.keys(dataProfileStrategies).join(', ')}`);
            return [];
        }

        // Extract atomic facts from query
        xLog.verbose(`Extracting atomic facts from query: ${queryString}`);
        const extractedData = await extractAtomicFacts(queryString, openai);
        const embeddingStrings = generateEmbeddingStrings(extractedData, queryString);

        xLog.saveProcessFile(`${moduleName}_atomicQueryParameters`, `QUERY STRING\n${queryString}\nATOMIC EXTRACTION\n${JSON.stringify(extractedData, '', '\t')}\n${'='.repeat(50)}\nEMBEDDING STRINGS\n${JSON.stringify(embeddingStrings, '', '\t')}`);

        // Generate embeddings for each query string
        const queryEmbeddings = [];
        for (const embeddingData of embeddingStrings) {
            const response = await openai.embeddings.create({
                model: 'text-embedding-3-small',
                input: embeddingData.text
            });
            queryEmbeddings.push({
                ...embeddingData,
                embedding: response.data[0].embedding
            });
        }

        // Collect matches for each query embedding
        const allMatches = new Map(); // sourceRefId -> match data
        const verboseData = collectVerboseData ? {
            originalQuery: queryString,
            enrichedStrings: [],
            queryExpansionAnalysis: []
        } : null;

        for (const queryEmb of queryEmbeddings) {
            const queryBuffer = Buffer.from(new Float32Array(queryEmb.embedding).buffer);

            // Find K nearest for this query embedding using L2 distance
            const sql = `
                SELECT sourceRefId, factType, factText, 
                       vec_distance_L2(embedding, ?) as distance
                FROM ${atomicTableName}
                WHERE embedding IS NOT NULL
                ORDER BY distance
                LIMIT ?
            `;

            const results = vectorDb.prepare(sql).all(queryBuffer, resultCount * 2);

            // Collect verbose data for this enriched string
            if (collectVerboseData) {
                const enrichedStringData = {
                    enrichedString: queryEmb.text,
                    type: queryEmb.type,
                    matches: results.slice(0, Math.min(results.length, resultCount)).map(row => ({
                        sourceRefId: row.sourceRefId,
                        factType: row.factType,
                        factText: row.factText,
                        distance: row.distance
                    }))
                };
                verboseData.enrichedStrings.push(enrichedStringData);
            }

            // Aggregate by sourceRefId
            results.forEach(row => {
                if (!allMatches.has(row.sourceRefId)) {
                    allMatches.set(row.sourceRefId, {
                        refId: row.sourceRefId,
                        distances: [],
                        matchedFacts: [],
                        factTypes: new Set()
                    });
                }
                const match = allMatches.get(row.sourceRefId);
                match.distances.push(row.distance);
                match.matchedFacts.push({ 
                    type: row.factType, 
                    text: row.factText,
                    queryType: queryEmb.type 
                });
                match.factTypes.add(row.factType);
            });
        }

        // Score and rank aggregated results
        const scoredResults = Array.from(allMatches.values()).map(match => {
            // Primary score: number of unique fact types matched
            const uniqueFactTypesCount = match.factTypes.size;

            // Secondary score: average distance (lower is better)
            const avgDistance = match.distances.reduce((a, b) => a + b, 0) / match.distances.length;

            // Composite score: more matched types is better, lower distance is better
            const compositeScore = uniqueFactTypesCount - (avgDistance * 0.1);

            return {
                refId: match.refId,
                score: compositeScore,
                distance: avgDistance,
                factTypesMatched: uniqueFactTypesCount,
                totalMatches: match.distances.length
            };
        });

        // Sort by composite score (higher is better)
        scoredResults.sort((a, b) => b.score - a.score);

        // Look up source records and format final results
        const finalResults = [];
        
        for (let i = 0; i < Math.min(scoredResults.length, resultCount); i++) {
            const result = scoredResults[i];
            const searchValue = result.refId;
            
            // Use the strategy to format the key for lookup
            const formattedKey = strategy.formatKeyForLookup(searchValue);
            xLog.verbose(`Looking up record with ${sourcePrivateKeyName}=${searchValue} (formatted as: ${formattedKey})`);
            
            // Use the formatted key for lookup
            const record = vectorDb.prepare(
                `select * from ${sourceTableName} where ${sourcePrivateKeyName}=?`
            ).get(formattedKey);
            
            if (!record) {
                xLog.error(`No record found for ${sourcePrivateKeyName}=${formattedKey} using ${strategy.name} strategy`);
                continue;
            }

            xLog.verbose(`Found record using ${strategy.name} strategy`);

            finalResults.push({
                rank: i + 1,
                refId: record[sourcePrivateKeyName],
                distance: result.distance,
                score: result.score, // Use composite score for atomic-vector
                factTypesMatched: result.factTypesMatched,
                totalMatches: result.totalMatches,
                record
            });
        }

        xLog.verbose(`Found ${finalResults.length} matches using atomic scoring`);
        
        // Return results with optional verbose data
        if (collectVerboseData) {
            return {
                results: finalResults,
                verboseData: verboseData
            };
        }
        
        return finalResults;
    };

    return { scoreDistanceResults };
};

module.exports = moduleFunction;