'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = function(args = {}) {
    const { xLog, getConfig } = process.global;
    
    // ---------------------------------------------------------------------
    // processQueryString - Transform query strings for better search results
    
    const processQueryString = (value) => {
        if (!value) return '';
        
        // Apply the same transformations as we do for XPath fields
        // Step 1: Replace slashes with spaces
        let processed = value.replace(/\//g, ' ');
        
        // Step 2: Split words on camel case
        processed = processed.replace(/([a-z])([A-Z])/g, '$1 $2');
        
        // Step 3: Remove leading 'x' or 'X' characters from each word
        processed = processed.split(' ')
            .map(word => word.replace(/^[xX](?=[a-zA-Z])/g, ''))
            .join(' ');
        
        return processed;
    };

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
    // scoringMethod - Score distance results for simple vector search
    
    const scoringMethod = (rawResults, options = {}) => {
        // For simple-vector, score equals distance (no complex composite scoring)
        const scoredResults = rawResults.map((result, index) => ({
            rank: index + 1,
            refId: result.refId,
            distance: result.distance,
            score: result.distance, // Simple scoring: score = distance
            record: result.record
        }));

        xLog.verbose(`Scored ${scoredResults.length} matches using simple distance scoring`);
        xLog.verbose(`Simple vector scoring: score = distance (lower is better)`);

        return scoredResults;
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
            // Check if vectorDb is DirectQueryUtility or raw database
            if (vectorDb.query && typeof vectorDb.query === 'function') {
                // Using DirectQueryUtility
                const sql = `SELECT rowid as '${sourcePrivateKeyName}', distance FROM ${tableName} WHERE embedding MATCH ? ORDER BY distance LIMIT ${resultCount}`;
                rows = await new Promise((resolve, reject) => {
                    vectorDb.query(sql, [new Float32Array(queryEmbedding)], (err, res) => {
                        if (err) reject(err);
                        else resolve(res);
                    });
                });
            } else if (vectorDb.prepare) {
                // Direct database access
                rows = vectorDb
                    .prepare(
                        `SELECT rowid as '${sourcePrivateKeyName}', distance FROM ${tableName} WHERE embedding MATCH ? ORDER BY distance LIMIT ${resultCount}`
                    )
                    .all(new Float32Array(queryEmbedding));
            } else {
                throw new Error('Invalid database interface provided');
            }
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
        
        for (const vectorChoice of rows) {
            const searchValue = vectorChoice[sourcePrivateKeyName];
            
            // Use the strategy to format the key for lookup
            const formattedKey = strategy.formatKeyForLookup(searchValue);
            xLog.verbose(`Looking up record with ${sourcePrivateKeyName}=${searchValue} (formatted as: ${formattedKey})`);
            
            // Use the formatted key for lookup
            let record;
            if (vectorDb.query && typeof vectorDb.query === 'function') {
                // Using DirectQueryUtility
                const lookupSql = `select * from ${sourceTableName} where ${sourcePrivateKeyName}=?`;
                const records = await new Promise((resolve, reject) => {
                    vectorDb.query(lookupSql, [formattedKey], (err, res) => {
                        if (err) reject(err);
                        else resolve(res);
                    });
                });
                record = records && records[0];
            } else if (vectorDb.prepare) {
                // Direct database access
                record = vectorDb.prepare(
                    `select * from ${sourceTableName} where ${sourcePrivateKeyName}=?`
                ).get(formattedKey);
            }
            
            if (!record) {
                xLog.error(`No record found for ${sourcePrivateKeyName}=${formattedKey} using ${strategy.name} strategy`);
                continue;
            }

            xLog.verbose(`Found record using ${strategy.name} strategy`);

            rawResults.push({
                refId: record[sourcePrivateKeyName],
                distance: vectorChoice.distance,
                record
            });
        }

        // Score results using simple scoring method
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

    // ---------------------------------------------------------------------
    // prettyPrintResults - Optional pretty print function for results display
    
    const prettyPrintResults = (results) => {
        if (!results || results.length === 0) {
            return 'No results found';
        }

        let output = '\nSimple Vector Search Results:\n';
        output += '═'.repeat(50) + '\n';
        
        results.forEach((result, index) => {
            output += `${index + 1}. [${result.refId}] Score: ${result.score.toFixed(4)}\n`;
            
            // Display key fields from the record
            if (result.record) {
                Object.keys(result.record).forEach(key => {
                    if (key !== 'refId' && result.record[key]) {
                        const value = result.record[key].toString();
                        const truncated = value.length > 100 ? value.substring(0, 97) + '...' : value;
                        output += `   ${key}: ${truncated}\n`;
                    }
                });
            }
            output += '\n';
        });
        
        return output;
    };

    return { 
        scoreDistanceResults,
        prettyPrintResults
    };
};

module.exports = moduleFunction;