'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = function(args = {}) {
    const { xLog, getConfig } = process.global;
    // Accept atomicFactExtractor from parent module
    const { atomicFactExtractor } = args;
    const { extractAtomicFacts, convertAtomicFactsToEmbeddingStrings } = atomicFactExtractor || require('./atomic-fact-extractor')();

    const extractAtomicFactsAndGenerateEmbeddings = async (args) => {
        const { 
            sourceRowList, 
            sourceEmbeddableContentName, 
            sourcePrivateKeyName, 
            openai, 
            vectorDb, 
            tableName,
            atomicTableName,
            dataProfile,
            // Progress tracking parameters
            batchId = null,
            progressTracker = null,
            alreadyProcessedCount = 0
        } = args;

        const generatedVectors = [];
        // atomicTableName now passed as parameter instead of constructed

        // Log batch processing parameters
        const batchParams = {
            sourceRowCount: sourceRowList.length,
            tableName,
            atomicTableName,
            dataProfile,
            sourceEmbeddableContentName,
            sourcePrivateKeyName,
            batchId,
            alreadyProcessedCount
        };
        
        xLog.saveProcessFile(`${moduleName}_promptList.log`, `Atomic Vector Batch Processing:\n${JSON.stringify(batchParams, null, 2)}`, {append:true});

        // Note: Individual transactions will be used for each source record

        // Create atomic table with version support
        const createTableSql = `CREATE TABLE IF NOT EXISTS ${atomicTableName} (
            refId TEXT PRIMARY KEY,
            sourceRefId TEXT,
            factType TEXT,
            factText TEXT,
            embedding BLOB,
            semanticCategory TEXT,
            conceptualDimension TEXT,
            factIndex INTEGER,
            semanticAnalyzerVersion TEXT DEFAULT 'atomic_version2',
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        )`;
        // Execute table creation with proper callback handling
        await new Promise((resolve, reject) => {
            vectorDb.execute(createTableSql, [], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Create indexes including version for performance
        await new Promise((resolve, reject) => {
            vectorDb.execute(`CREATE INDEX IF NOT EXISTS idx_${atomicTableName}_sourceRefId ON ${atomicTableName}(sourceRefId)`, [], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        await new Promise((resolve, reject) => {
            vectorDb.execute(`CREATE INDEX IF NOT EXISTS idx_${atomicTableName}_factType ON ${atomicTableName}(factType)`, [], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        await new Promise((resolve, reject) => {
            vectorDb.execute(`CREATE INDEX IF NOT EXISTS idx_${atomicTableName}_semanticAnalyzerVersion ON ${atomicTableName}(semanticAnalyzerVersion)`, [], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Process each source row
        for (let i = 0; i < sourceRowList.length; i++) {
            const sourceRow = sourceRowList[i];
            const privateKey = sourceRow[sourcePrivateKeyName];

            // Build embeddable content from single field or multiple fields
            let embeddableContent = '';
            if (Array.isArray(sourceEmbeddableContentName)) {
                embeddableContent = sourceEmbeddableContentName
                    .map((field) => sourceRow[field] || '')
                    .filter((value) => value)
                    .join(' | ');
            } else {
                embeddableContent = sourceRow[sourceEmbeddableContentName] || '';
            }

            if (!embeddableContent) {
                xLog.verbose(`Skipping ${privateKey} - no embeddable content`);
                continue;
            }

            try {
                // Begin transaction for this source record
                await new Promise((resolve, reject) => {
                    vectorDb.execute('BEGIN TRANSACTION;', [], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });

                // Extract atomic facts
                xLog.verbose(`Extracting atomic facts for ${privateKey} [${moduleName}]`);
                const extractedData = await extractAtomicFacts(embeddableContent, openai);
                
                // Get the semantic analyzer version from the extracted data
                const { semanticAnalyzerVersion } = extractedData;

                // Generate embedding strings
                const embeddingStrings = convertAtomicFactsToEmbeddingStrings(extractedData, embeddableContent);
                xLog.verbose(`Generated ${embeddingStrings.length} embedding strings for ${privateKey} using version ${semanticAnalyzerVersion}`);

                // Create embeddings for each string
                for (const embeddingData of embeddingStrings) {
                    const response = await openai.embeddings.create({
                        model: 'text-embedding-3-small',
                        input: embeddingData.text
                    });

                    const embedding = response.data[0].embedding;
                    const atomicRefId = `${privateKey}_${embeddingData.type}_${embeddingData.factIndex || 0}`;

                    // DirectQueryUtility is REQUIRED - no fallbacks
                    if (!vectorDb.execute || typeof vectorDb.execute !== 'function') {
                        throw new Error('DirectQueryUtility required - received invalid database interface');
                    }

                    // Store in atomic table with parameterized query for binary embedding
                    const sql = `INSERT OR REPLACE INTO ${atomicTableName} 
                        (refId, sourceRefId, factType, factText, embedding, semanticCategory, conceptualDimension, factIndex, semanticAnalyzerVersion) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

                    const embeddingBuffer = Buffer.from(new Float32Array(embedding).buffer);
                    
                    await new Promise((resolve, reject) => {
                        vectorDb.execute(sql, [
                            atomicRefId,
                            privateKey,
                            embeddingData.type,
                            embeddingData.text,
                            embeddingBuffer,
                            embeddingData.semanticCategory || null,
                            embeddingData.conceptualDimension || null,
                            embeddingData.factIndex || 0,
                            semanticAnalyzerVersion
                        ], (err, res) => {
                            if (err) {
                                xLog.error(`Failed to insert atomic vector ${atomicRefId}: ${err.message}`);
                                reject(err);
                            } else {
                                xLog.verbose(`Successfully inserted atomic vector ${atomicRefId}`);
                                resolve(res);
                            }
                        });
                    });

                    generatedVectors.push({
                        refId: atomicRefId,
                        sourceRefId: privateKey,
                        factType: embeddingData.type,
                        content: embeddingData.text,
                        processed: true
                    });

                }

                // Update progress tracking if available (after processing each source record)
                if (batchId && progressTracker) {
                    const currentCount = alreadyProcessedCount + i + 1;
                    progressTracker.updateProgress(batchId, currentCount, privateKey.toString());
                    
                    // Log progress every 5 records for atomic (since it's more intensive)
                    if (currentCount % 5 === 0) {
                        xLog.status(`Progress: ${currentCount} records processed (atomic mode)`);
                    }
                }

                // Commit transaction for this source record
                await new Promise((resolve, reject) => {
                    vectorDb.execute('COMMIT;', [], (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });

            } catch (err) {
                // Rollback transaction on error
                await new Promise((resolve, reject) => {
                    vectorDb.execute('ROLLBACK;', [], (err) => {
                        if (err) xLog.error(`Failed to rollback transaction: ${err.message}`);
                        resolve(); // Continue even if rollback fails
                    });
                });
                xLog.error(`Failed to process ${privateKey}: ${err.message}`);
            }
        }

        // All transactions have been committed individually per source record

        // Verify vectors were actually written
        await new Promise((resolve, reject) => {
            vectorDb.execute(`SELECT COUNT(*) as count FROM ${atomicTableName}`, [], (err, result) => {
                if (err) {
                    xLog.error(`Failed to verify vectors: ${err.message}`);
                    reject(err);
                } else {
                    const count = result && result[0] ? result[0].count : 0;
                    xLog.status(`Database verification: ${count} vectors found in ${atomicTableName}`);
                    resolve();
                }
            });
        });

        xLog.status(`Generated ${generatedVectors.length} atomic vectors`);
        
        // Log completion results
        const completionResults = {
            totalAtomicVectors: generatedVectors.length,
            successfulVectors: generatedVectors.filter(v => v.processed).length,
            atomicTableName,
            dataProfile,
            batchId,
            uniqueSourceRecords: new Set(generatedVectors.map(v => v.sourceRefId)).size
        };
        
        xLog.saveProcessFile(`${moduleName}_responseList.log`, `Atomic Vector Generation Results:\n${JSON.stringify(completionResults, null, 2)}`, {append:true});
        
        return generatedVectors;
    };

    return { extractAtomicFactsAndGenerateEmbeddings };
};

module.exports = moduleFunction;