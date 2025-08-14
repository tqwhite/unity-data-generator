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
            // Check if vectorDb is DirectQueryUtility
            if (!vectorDb.query || typeof vectorDb.query !== 'function') {
                throw new Error('DirectQueryUtility required - received invalid database interface');
            }
            
            // Using DirectQueryUtility with parameterized query for binary embedding
            const sql = `SELECT rowid as '${sourcePrivateKeyName}', distance FROM ${tableName} WHERE embedding MATCH ? ORDER BY distance LIMIT ${resultCount}`;
            
            // Log the SQL query for debugging
            xLog.saveProcessFile(
                `${moduleName}_vectorMatching.log`,
                `\n=== Simple Vector Matching ===\nSQL: ${sql}\nResult Count: ${resultCount}\nQuery: ${processedQueryString}\n`,
                { append: true }
            );
            
            rows = await new Promise((resolve, reject) => {
                vectorDb.query(sql, [new Float32Array(queryEmbedding)], (err, res) => {
                    if (err) reject(err);
                    else resolve(res);
                });
            });
            
            // Log the raw vector search results
            xLog.saveProcessFile(
                `${moduleName}_vectorMatching.log`,
                `Found ${rows.length} matches:\n${JSON.stringify(rows.slice(0, 10), null, 2)}\n`,
                { append: true }
            );
        } catch (error) {
            if (error.message.includes('no such table')) {
                throw new Error(`No simpleVectors found. Missing table ${tableName}. THIS PROBABLY IS BECAUSE YOU HAVE NOT GENERATED ANY SIMPLEVECTORS. Use vectorTools --dataProfile=${dataProfile} -writeVectorDatabase --semanticAnalysisMode=simpleVector`);
            }
            throw error; // Re-throw other errors
        }

        // Initialize verbose data structure
        const verboseData = collectVerboseData ? {
            originalQuery: queryString,
            processedQuery: processedQueryString,
            sourcePrivateKeyName,
            vectorMatches: rows,
            enrichedStrings: [{
                enrichedString: processedQueryString,
                type: 'processed_query',
                matches: rows.map(row => ({
                    sourceRefId: row[sourcePrivateKeyName],
                    distance: row.distance
                }))
            }],
            results: [] // Will be populated after scoring
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
                // Using DirectQueryUtility with qtTemplateReplace
                require('qtools-functional-library');
                const lookupSql = `select * from <!tableName!> where <!keyName!>='<!keyValue!>'`.qtTemplateReplace({
                    tableName: sourceTableName,
                    keyName: sourcePrivateKeyName,
                    keyValue: formattedKey.replace(/'/g, "''")  // Escape single quotes
                });
                
                // Log source record lookup
                xLog.saveProcessFile(
                    `${moduleName}_sourceLookup.log`,
                    `Looking up source: ${lookupSql}\n`,
                    { append: true }
                );
                
                const records = await new Promise((resolve, reject) => {
                    vectorDb.query(lookupSql, [], (err, res) => {
                        if (err) reject(err);
                        else resolve(res);
                    });
                });
                record = records && records[0];
                
                if (record) {
                    xLog.saveProcessFile(
                        `${moduleName}_sourceLookup.log`,
                        `Found: ${JSON.stringify(record).substring(0, 200)}...\n`,
                        { append: true }
                    );
                }
            } else {
                // No fallback - DirectQueryUtility is required
                throw new Error('DirectQueryUtility required - received invalid database interface');
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
        
        // Update verbose data with final results
        if (verboseData) {
            verboseData.results = scoredResults;
        }
        
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
    // prettyPrintResults - Optional pretty print function for verbose data display
    
    const prettyPrintResults = (verboseData) => {
        if (!verboseData) {
            return 'No verbose data available';
        }

        let output = '\n╔═══════════════════════════════════════════════════════════════════════════════════════════════════════╗\n';
        output += '║                                    SIMPLE VECTOR SEARCH ANALYSIS                                     ║\n';
        output += '╚═══════════════════════════════════════════════════════════════════════════════════════════════════════╝\n';
        
        if (verboseData.originalQuery) {
            output += `├─ Original Query: "${verboseData.originalQuery}"\n`;
        }
        
        if (verboseData.processedQuery) {
            output += `├─ Processed Query: "${verboseData.processedQuery}"\n`;
        }
        
        if (verboseData.vectorMatches && verboseData.vectorMatches.length > 0) {
            output += `│\n├─ Vector Matches (${verboseData.vectorMatches.length} found):\n`;
            verboseData.vectorMatches.forEach((match, index) => {
                const prefix = index === verboseData.vectorMatches.length - 1 ? '└─' : '├─';
                output += `│  ${prefix} [${match.distance.toFixed(4)}] RefID: ${match[verboseData.sourcePrivateKeyName || 'refId']}\n`;
            });
        }
        
        if (verboseData.results && verboseData.results.length > 0) {
            output += `│\n├─ Final Results (${verboseData.results.length} records):\n`;
            verboseData.results.forEach((result, index) => {
                const prefix = index === verboseData.results.length - 1 ? '└─' : '├─';
                // Get display content from various possible fields
                const content = result.content || result.description || result.Description || 
                               (result.record && (result.record.Description || result.record.description)) || 
                               'No description available';
                const truncated = content.length > 80 ? content.substring(0, 77) + '...' : content;
                output += `│  ${prefix} [${result.score.toFixed(4)}] ${result.refId}: ${truncated}\n`;
            });
        }
        
        return output;
    };

    return { 
        scoreDistanceResults,
        prettyPrintResults
    };
};

module.exports = moduleFunction;