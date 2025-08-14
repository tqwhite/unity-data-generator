#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

// =====================================================================
// VECTOR GENERATOR - Incremental vector generation with progress tracking
// =====================================================================

class VectorGenerator {
	constructor({ dbUtility, analyzerRegistry, progressTracker }) {
		const { xLog, getConfig } = process.global;
		this.xLog = xLog;
		this.dbUtility = dbUtility;
		this.analyzerRegistry = analyzerRegistry;
		this.progressTracker = progressTracker;
		this.moduleConfig = getConfig(moduleName);
	}

	// ---------------------------------------------------------------------
	// generateVectorsFromSourceRecords - Start new vector generation process
	
	async generateVectorsFromSourceRecords(config) {
		const { commandLineParameters } = process.global;
		
		try {
			// Extract configuration
			const {
				dataProfile,
				semanticAnalysisMode,
				sourceTableName,
				vectorTableName,
				sourcePrivateKeyName,
				sourceEmbeddableContentName
			} = config;

			// Get processing parameters
			const limit = commandLineParameters.values.limit
				? parseInt(commandLineParameters.values.limit[0], 10)
				: null;
			const offset = commandLineParameters.values.offset
				? parseInt(commandLineParameters.values.offset[0], 10)
				: 0;

			this.xLog.status(`Starting Vector Generation for ${dataProfile.toUpperCase()} profile...`);
			this.xLog.status(`Semantic Mode: ${semanticAnalysisMode}`);
			this.xLog.status(`Source Table: ${sourceTableName}`);
			this.xLog.status(`Vector Table: ${vectorTableName}`);

			// Get total records and create batch
			const totalRecords = await this._querySourceTableRecordCount(sourceTableName, limit, offset);
			const batchId = await this._createProgressBatch(config, totalRecords);

			// Get source records for processing
			const sourceRecords = await this._fetchSourceRecordsWithPagination(sourceTableName, limit, offset);
			
			this.xLog.status(`Processing ${sourceRecords.length} records from ${sourceTableName}`);

			// Generate vectors using semantic analyzer
			await this._generateEmbeddingsUsingSemanticAnalyzer(config, sourceRecords, batchId);

			// Mark batch as completed
			await this._completeBatch(batchId);

			this.xLog.status(`Vector generation completed successfully`);
			return { success: true, batchId, totalRecords: sourceRecords.length };

		} catch (error) {
			const traceId = Math.floor(Math.random() * 1e9);
			this.xLog.error(`[${traceId}] Vector generation failed: ${error.message}`);
			throw new Error(`Vector generation failed [trace:${traceId}]`);
		}
	}

	// ---------------------------------------------------------------------
	// resumeInterruptedVectorGeneration - Resume interrupted vector generation
	
	async resumeInterruptedVectorGeneration(config) {
		const { commandLineParameters } = process.global;
		
		try {
			// Find resumable batches
			const incompleteBatches = await this._getIncompleteBatches(config);
			
			if (incompleteBatches.length === 0) {
				this.xLog.status(`No incomplete batches found for ${config.dataProfile} profile`);
				return { success: true, resumed: false };
			}

			// Get specific batch ID or use most recent
			const batchId = commandLineParameters.values.batchId?.[0] || incompleteBatches[0].batch_id;
			const batch = incompleteBatches.find(b => b.batch_id === batchId) || incompleteBatches[0];

			this.xLog.status(`Resuming batch: ${batch.batch_id}`);
			this.xLog.status(`Progress: ${batch.processed_records}/${batch.total_records} records`);

			// Get unprocessed records
			const processedKeys = await this._fetchAlreadyProcessedSourceKeys(batch.batch_id);
			const allRecords = await this._fetchAllSourceRecordsForResume(config.sourceTableName);
			
			const unprocessedRecords = allRecords.filter(record => {
				const keyValue = record[config.sourcePrivateKeyName];
				return !processedKeys.includes(keyValue.toString());
			});

			this.xLog.status(`Remaining to process: ${unprocessedRecords.length} records`);

			if (unprocessedRecords.length === 0) {
				this.xLog.status('All records already processed, marking batch as complete');
				await this._completeBatch(batch.batch_id);
				return { success: true, resumed: true, completed: true };
			}

			// Resume processing
			await this._generateEmbeddingsUsingSemanticAnalyzer(config, unprocessedRecords, batch.batch_id, batch.processed_records);

			// Mark batch as completed
			await this._completeBatch(batch.batch_id);

			this.xLog.status(`Vector generation resumed and completed successfully`);
			return { success: true, resumed: true, batchId: batch.batch_id, processedRecords: unprocessedRecords.length };

		} catch (error) {
			const traceId = Math.floor(Math.random() * 1e9);
			this.xLog.error(`[${traceId}] Vector generation resume failed: ${error.message}`);
			throw new Error(`Vector generation resume failed [trace:${traceId}]`);
		}
	}

	// ---------------------------------------------------------------------
	// _querySourceTableRecordCount - Get total number of source records
	
	async _querySourceTableRecordCount(tableName, limit, offset) {
		return new Promise((resolve, reject) => {
			if (limit !== null) {
				resolve(limit);
				return;
			}

			const sql = this.dbUtility.statements.sourceTableStatements.countSourceRecords(tableName);
			
			this.dbUtility.query(sql, [], (err, results) => {
				if (err) {
					reject(err);
					return;
				}
				resolve(results[0].count - offset);
			});
		});
	}

	// ---------------------------------------------------------------------
	// _fetchSourceRecordsWithPagination - Get source records for processing
	
	async _fetchSourceRecordsWithPagination(tableName, limit, offset) {
		return new Promise((resolve, reject) => {
			let sql = `SELECT * FROM ${tableName}`;
			const params = [];

			if (limit !== null) {
				sql += ` LIMIT ? OFFSET ?`;
				params.push(limit, offset);
			} else if (offset > 0) {
				sql += ` OFFSET ?`;
				params.push(offset);
			}

			this.dbUtility.query(sql, params, (err, results) => {
				if (err) {
					reject(err);
					return;
				}
				resolve(results);
			});
		});
	}

	// ---------------------------------------------------------------------
	// _fetchAllSourceRecordsForResume - Get all source records (for resume)
	
	async _fetchAllSourceRecordsForResume(tableName) {
		return new Promise((resolve, reject) => {
			const sql = `SELECT * FROM ${tableName}`;
			
			this.dbUtility.query(sql, [], (err, results) => {
				if (err) {
					reject(err);
					return;
				}
				resolve(results);
			});
		});
	}

	// ---------------------------------------------------------------------
	// _createProgressBatch - Create new progress tracking batch
	
	async _createProgressBatch(config, totalRecords) {
		return new Promise((resolve, reject) => {
			this.progressTracker.createBatch(config, totalRecords, (err, batchId) => {
				if (err) {
					reject(err);
					return;
				}
				resolve(batchId);
			});
		});
	}

	// ---------------------------------------------------------------------
	// _getIncompleteBatches - Find batches that can be resumed
	
	async _getIncompleteBatches(config) {
		return new Promise((resolve, reject) => {
			this.progressTracker.getIncompleteBatches(config, (err, batches) => {
				if (err) {
					reject(err);
					return;
				}
				resolve(batches);
			});
		});
	}

	// ---------------------------------------------------------------------
	// _fetchAlreadyProcessedSourceKeys - Get list of already processed keys
	
	async _fetchAlreadyProcessedSourceKeys(batchId) {
		return new Promise((resolve, reject) => {
			const sql = `
				SELECT DISTINCT last_processed_key 
				FROM vectorTools_progress 
				WHERE batch_id = '${batchId}' 
				AND last_processed_key IS NOT NULL
			`;
			
			this.dbUtility.query(sql, [], (err, results) => {
				if (err) {
					reject(err);
					return;
				}
				resolve(results.map(r => r.last_processed_key));
			});
		});
	}

	// ---------------------------------------------------------------------
	// _generateEmbeddingsUsingSemanticAnalyzer - Use semantic analyzer to process records
	
	async _generateEmbeddingsUsingSemanticAnalyzer(config, sourceRecords, batchId, alreadyProcessedCount = 0) {
		// Get semantic analyzer instance
		const analyzer = this.analyzerRegistry.getAnalyzer(config.semanticAnalysisMode);
		
		// Validate analyzer interface
		this.analyzerRegistry.validateAnalyzer(analyzer);

		// Process records using analyzer's method
		const processingConfig = {
			sourceRowList: sourceRecords,
			sourceEmbeddableContentName: config.sourceEmbeddableContentName,
			sourcePrivateKeyName: config.sourcePrivateKeyName,
			vectorDb: this.dbUtility, // Pass dbUtility as vectorDb for compatibility
			tableName: config.vectorTableName,
			dataProfile: config.dataProfile,
			batchId,
			progressTracker: this.progressTracker,
			alreadyProcessedCount
		};

		// Get OpenAI instance from global if available
		const { openai } = process.global || {};
		if (openai) {
			processingConfig.openai = openai;
		}

		await analyzer.extractAtomicFactsAndGenerateEmbeddings(processingConfig);
	}

	// ---------------------------------------------------------------------
	// _completeBatch - Mark batch as completed
	
	async _completeBatch(batchId) {
		return new Promise((resolve, reject) => {
			this.progressTracker.completeBatch(batchId, (err) => {
				if (err) {
					reject(err);
					return;
				}
				resolve();
			});
		});
	}
}

// =====================================================================
// MODULE EXPORTS
// =====================================================================

const moduleFunction = ({ dbUtility, analyzerRegistry, progressTracker }) => {
	return new VectorGenerator({ dbUtility, analyzerRegistry, progressTracker });
};

module.exports = moduleFunction;