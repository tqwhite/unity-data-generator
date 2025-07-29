'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = function(args = {}) {
    const { xLog, getConfig } = process.global;

    // ---------------------------------------------------------------------
    // processQueryString - transforms query strings for better search results
    
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
            sourceEmbeddableContentName
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
        const rows = vectorDb
            .prepare(
                `SELECT rowid as '${sourcePrivateKeyName}', distance FROM ${tableName} WHERE embedding MATCH ? ORDER BY distance LIMIT ${resultCount}`
            )
            .all(new Float32Array(queryEmbedding));

        // Look up source records and format results
        const scoredResults = [];
        
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

            scoredResults.push({
                rank: index + 1,
                refId: record[sourcePrivateKeyName],
                distance: vectorChoice.distance,
                score: vectorChoice.distance, // For simple-vector, score equals distance
                record
            });
        });

        xLog.verbose(`Found ${scoredResults.length} matches`);
        return scoredResults;
    };

    return { scoreDistanceResults };
};

module.exports = moduleFunction;