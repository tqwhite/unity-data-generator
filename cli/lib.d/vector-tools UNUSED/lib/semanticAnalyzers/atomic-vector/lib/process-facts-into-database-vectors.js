'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = function(args = {}) {
    const { xLog, getConfig } = process.global;
    const { extractAtomicFacts, convertAtomicFactsToEmbeddingStrings } = require('./atomic-fact-extractor')();

    const processFactsIntoDatabaseVectors = async (args) => {
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
        vectorDb.exec(createTableSql);

        // Create indexes including version for performance
        vectorDb.exec(`CREATE INDEX IF NOT EXISTS idx_${atomicTableName}_sourceRefId ON ${atomicTableName}(sourceRefId)`);
        vectorDb.exec(`CREATE INDEX IF NOT EXISTS idx_${atomicTableName}_factType ON ${atomicTableName}(factType)`);
        vectorDb.exec(`CREATE INDEX IF NOT EXISTS idx_${atomicTableName}_semanticAnalyzerVersion ON ${atomicTableName}(semanticAnalyzerVersion)`);

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

                    // Store in atomic table with semanticAnalyzerVersion
                    const sql = `INSERT OR REPLACE INTO ${atomicTableName} 
                        (refId, sourceRefId, factType, factText, embedding, semanticCategory, conceptualDimension, factIndex, semanticAnalyzerVersion) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

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
                        embeddingData.factIndex || null,
                        semanticAnalyzerVersion
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

    return { processFactsIntoDatabaseVectors };
};

module.exports = moduleFunction;