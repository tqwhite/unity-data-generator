'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = function(args = {}) {
    const { xLog, getConfig } = process.global;

    // ---------------------------------------------------------------------
    // processXPathValue - transforms XPath strings for better embedding quality
    
    const processXPathValue = (value) => {
        if (!value) return '';
        
        // Step 1: Replace slashes with spaces
        let processed = value.replace(/\//g, ' ');
        
        // Step 2: Split words on camel case
        // Insert spaces before capital letters that are preceded by lowercase letters
        // This handles camelCase -> camel Case
        processed = processed.replace(/([a-z])([A-Z])/g, '$1 $2');
        
        // Step 3: Remove leading 'x' or 'X' characters from each word
        // Split into words, process each word, then rejoin
        processed = processed.split(' ')
            .map(word => {
                // Remove leading 'x' or 'X' from words
                return word.replace(/^[xX](?=[a-zA-Z])/g, '');
            })
            .join(' ');
        
        return processed;
    };

    // ---------------------------------------------------------------------
    // extractAtomicFactsAndGenerateEmbeddings - main vector generation function
    
    const extractAtomicFactsAndGenerateEmbeddings = async (args) => {
        const {
            sourceRowList,
            sourceEmbeddableContentName,
            sourcePrivateKeyName,
            openai,
            vectorDb,
            tableName,
            dataProfile,
            // Progress tracking parameters
            batchId = null,
            progressTracker = null,
            alreadyProcessedCount = 0
        } = args;

        const generatedVectors = [];

        // Log batch processing parameters
        const batchParams = {
            sourceRowCount: sourceRowList.length,
            tableName,
            dataProfile,
            sourceEmbeddableContentName,
            sourcePrivateKeyName,
            batchId,
            alreadyProcessedCount
        };
        
        xLog.saveProcessFile(`${moduleName}_promptList.log`, `Simple Vector Batch Processing:\n${JSON.stringify(batchParams, null, 2)}`, {append:true});

        // Ensure table exists - use vec0 format for backward compatibility
        const createTableSql = `CREATE VIRTUAL TABLE IF NOT EXISTS ${tableName} USING vec0(embedding float[1536])`;
        vectorDb.exec(createTableSql);

        // Process each source row
        for (let i = 0; i < sourceRowList.length; i++) {
            const sourceRow = sourceRowList[i];
            const embeddableContent = sourceRow[sourceEmbeddableContentName];
            const privateKey = sourceRow[sourcePrivateKeyName];

            if (!embeddableContent) {
                xLog.verbose(`Skipping ${privateKey} - no embeddable content`);
                continue;
            }

            // Process content based on dataProfile
            let processedContent = embeddableContent;
            if (dataProfile === 'ceds' && sourceEmbeddableContentName === 'XPath') {
                processedContent = processXPathValue(embeddableContent);
            }

            try {
                // Generate embedding
                const response = await openai.embeddings.create({
                    model: 'text-embedding-3-small',
                    input: processedContent,
                    encoding_format: 'float'
                });

                const embedding = response.data[0].embedding;

                // DirectQueryUtility is REQUIRED - no fallbacks
                if (!vectorDb.execute || typeof vectorDb.execute !== 'function') {
                    throw new Error('DirectQueryUtility required - received invalid database interface');
                }

                // Insert using parameterized query for binary embedding
                const insertSql = `INSERT INTO ${tableName} (embedding) VALUES (?)`;
                await new Promise((resolve, reject) => {
                    vectorDb.execute(insertSql, [new Float32Array(embedding)], (err, res) => {
                        if (err) reject(err);
                        else resolve(res);
                    });
                });

                generatedVectors.push({
                    refId: privateKey,
                    content: processedContent,
                    processed: true
                });

                xLog.verbose(`Generated vector for ${privateKey}`);

                // Update progress tracking if available
                if (batchId && progressTracker) {
                    const currentCount = alreadyProcessedCount + i + 1;
                    progressTracker.updateProgress(vectorDb, batchId, currentCount, privateKey.toString());
                    
                    // Log progress every 10 records
                    if (currentCount % 10 === 0) {
                        xLog.status(`Progress: ${currentCount} records processed`);
                    }
                }
            } catch (err) {
                xLog.error(`Failed to generate embedding for ${privateKey}: ${err.message}`);
            }
        }

        xLog.status(`Generated ${generatedVectors.length} vectors`);
        
        // Log completion results
        const completionResults = {
            totalProcessed: generatedVectors.length,
            successfulVectors: generatedVectors.filter(v => v.processed).length,
            tableName,
            dataProfile,
            batchId
        };
        
        xLog.saveProcessFile(`${moduleName}_responseList.log`, `Simple Vector Generation Results:\n${JSON.stringify(completionResults, null, 2)}`, {append:true});
        
        return generatedVectors;
    };

    return { extractAtomicFactsAndGenerateEmbeddings };
};

module.exports = moduleFunction;