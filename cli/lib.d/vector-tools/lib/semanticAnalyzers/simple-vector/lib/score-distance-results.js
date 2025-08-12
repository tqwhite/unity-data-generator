'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = function(args = {}) {
    const { xLog, getConfig } = process.global;
    
    // Import query processing methods from version-specific queryString
    const queryProcessorGen = require('./query-processor')();
    const { processQueryString, scoringMethod } = queryProcessorGen;

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

    // ---------------------------------------------------------------------
    // scoreDistanceResults - main scoring function
    
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

        // Get the strategy for this data profile
        const strategy = dataProfileStrategies[dataProfile];
        if (!strategy) {
            xLog.error(`Unknown data profile: ${dataProfile}. Supported profiles: ${Object.keys(dataProfileStrategies).join(', ')}`);
            return [];
        }

        xLog.verbose(`Using ${strategy.name} lookup strategy for data profile: ${dataProfile}`);

        // Process the query string
        const processedQueryString = processQueryString(queryString);
        xLog.verbose(`Original query: "${queryString}"`);
        xLog.verbose(`Processed query: "${processedQueryString}"`);

        // Generate embedding for query
        const response = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: processedQueryString,
            encoding_format: 'float'
        });

        const queryEmbedding = response.data[0].embedding;

        // Find closest matches using vec0 format
        let rows;
        try {
            rows = vectorDb
                .prepare(
                    `SELECT rowid as '${sourcePrivateKeyName}', distance FROM ${tableName} WHERE embedding MATCH ? ORDER BY distance LIMIT ${resultCount}`
                )
                .all(new Float32Array(queryEmbedding));
        } catch (error) {
            if (error.message.includes('no such table')) {
                throw new Error(`No simpleVectors found. Missing table ${tableName}. THIS PROBABLY IS BECAUSE YOU HAVE NOT GENERATED ANY SIMPLEVECTORS. Use vectorTools --dataProfile=${dataProfile} -writeVectorDatabase --semanticAnalysisMode=simpleVector`);
            }
            throw error; // Re-throw other errors
        }

        // Collect verbose data for simple vector (single enriched string)
        const verboseData = collectVerboseData ? {
            originalQuery: queryString,
            enrichedStrings: [{
                enrichedString: processedQueryString,
                type: 'processed_query',
                matches: rows.map(row => ({
                    sourceRefId: row[sourcePrivateKeyName],
                    distance: row.distance
                }))
            }],
            queryExpansionAnalysis: []
        } : null;

        // Look up source records and prepare for scoring
        const rawResults = [];
        
        rows.forEach((vectorChoice, index) => {
            const searchValue = vectorChoice[sourcePrivateKeyName];
            
            // Use the strategy to format the key for lookup
            const formattedKey = strategy.formatKeyForLookup(searchValue);
            xLog.verbose(`Looking up record with ${sourcePrivateKeyName}=${searchValue} (formatted as: ${formattedKey})`);
            
            // Use the formatted key for lookup
            const record = vectorDb.prepare(
                `select * from ${sourceTableName} where ${sourcePrivateKeyName}=?`
            ).get(formattedKey);
            
            if (!record) {
                xLog.error(`No record found for ${sourcePrivateKeyName}=${formattedKey} using ${strategy.name} strategy`);
                return;
            }

            xLog.verbose(`Found record using ${strategy.name} strategy`);

            rawResults.push({
                refId: record[sourcePrivateKeyName],
                distance: vectorChoice.distance,
                record
            });
        });

        // Score results using version-specific scoring method
        const scoredResults = scoringMethod(rawResults);

        xLog.verbose(`Found ${scoredResults.length} matches`);
        
        // Return results with optional verbose data
        if (collectVerboseData) {
            return {
                results: scoredResults,
                verboseData: verboseData
            };
        }
        
        return scoredResults;
    };

    return { scoreDistanceResults };
};

module.exports = moduleFunction;