'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = function(args = {}) {
    const { xLog, getConfig } = process.global;
    const { extractAtomicFacts, generateEmbeddingStrings } = require('./atomic-fact-extractor')();

    const generateVectors = async (args) => {
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
        const atomicTableName = `${tableName}_atomic`;

        // Create atomic table
        const createTableSql = `CREATE TABLE IF NOT EXISTS ${atomicTableName} (
            refId TEXT PRIMARY KEY,
            sourceRefId TEXT,
            factType TEXT,
            factText TEXT,
            embedding BLOB,
            semanticCategory TEXT,
            conceptualDimension TEXT,
            factIndex INTEGER,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        )`;
        vectorDb.exec(createTableSql);

        // Create indexes
        vectorDb.exec(`CREATE INDEX IF NOT EXISTS idx_${atomicTableName}_sourceRefId ON ${atomicTableName}(sourceRefId)`);
        vectorDb.exec(`CREATE INDEX IF NOT EXISTS idx_${atomicTableName}_factType ON ${atomicTableName}(factType)`);

        // Process each source row
        for (let i = 0; i < sourceRowList.length; i++) {
            const sourceRow = sourceRowList[i];
            const embeddableContent = sourceRow[sourceEmbeddableContentName];
            const privateKey = sourceRow[sourcePrivateKeyName];

            if (!embeddableContent) {
                xLog.verbose(`Skipping ${privateKey} - no embeddable content`);
                continue;
            }

            try {
                // Extract atomic facts
                xLog.verbose(`Extracting atomic facts for ${privateKey} [${moduleName}]`);
                const extractedData = await extractAtomicFacts(embeddableContent, openai);

                // Generate embedding strings
                const embeddingStrings = generateEmbeddingStrings(extractedData, embeddableContent);
                xLog.verbose(`Generated ${embeddingStrings.length} embedding strings for ${privateKey}`);

                // Create embeddings for each string
                for (const embeddingData of embeddingStrings) {
                    const response = await openai.embeddings.create({
                        model: 'text-embedding-3-small',
                        input: embeddingData.text
                    });

                    const embedding = response.data[0].embedding;
                    const atomicRefId = `${privateKey}_${embeddingData.type}_${embeddingData.factIndex || 0}`;

                    // Store in atomic table
                    const sql = `INSERT OR REPLACE INTO ${atomicTableName} 
                        (refId, sourceRefId, factType, factText, embedding, semanticCategory, conceptualDimension, factIndex) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

                    const embeddingBuffer = Buffer.from(new Float32Array(embedding).buffer);

                    const insertStmt = vectorDb.prepare(sql);
                    insertStmt.run(
                        atomicRefId,
                        privateKey,
                        embeddingData.type,
                        embeddingData.text,
                        embeddingBuffer,
                        embeddingData.category || null,
                        embeddingData.dimension || null,
                        embeddingData.factIndex || null
                    );

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
                    progressTracker.updateProgress(vectorDb, batchId, currentCount, privateKey.toString());
                    
                    // Log progress every 5 records for atomic (since it's more intensive)
                    if (currentCount % 5 === 0) {
                        xLog.status(`Progress: ${currentCount} records processed (atomic mode)`);
                    }
                }
            } catch (err) {
                xLog.error(`Failed to process ${privateKey}: ${err.message}`);
            }
        }

        xLog.status(`Generated ${generatedVectors.length} atomic vectors`);
        return generatedVectors;
    };

    return { generateVectors };
};

module.exports = moduleFunction;