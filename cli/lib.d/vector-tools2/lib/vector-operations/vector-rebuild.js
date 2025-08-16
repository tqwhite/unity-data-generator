#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

// =====================================================================
// VECTOR REBUILD - Complete rebuild of vector databases
// =====================================================================

class VectorRebuild {
	constructor({ dbUtility, analyzerRegistry, progressTracker }) {
		const { xLog, getConfig } = process.global;
		this.xLog = xLog;
		this.dbUtility = dbUtility;
		this.analyzerRegistry = analyzerRegistry;
		this.progressTracker = progressTracker;
		this.moduleConfig = getConfig(moduleName);
	}

	// ---------------------------------------------------------------------
	// rebuild - Complete rebuild of vector database
	
	async rebuild(config) {
		const { commandLineParameters } = process.global;
		
		try {
			// Extract configuration
			const {
				dataProfile,
				semanticAnalysisMode,
				sourceTableName,
				vectorTableName,
				atomicVectorTableName,
				sourcePrivateKeyName,
				sourceEmbeddableContentName
			} = config;

			// Handle command line override at point of use
			const workingVectorTableName = commandLineParameters.qtGetSurePath('values.targetTableName[0]') || vectorTableName;
			const workingAtomicTableName = commandLineParameters.qtGetSurePath('values.targetTableName[0]') 
				? `${commandLineParameters.qtGetSurePath('values.targetTableName[0]')}_atomic`
				: atomicVectorTableName;

			// Determine actual table name based on semantic mode
			const actualTableName = semanticAnalysisMode === 'atomicVector'
				? workingAtomicTableName
				: workingVectorTableName;

			this.xLog.status(`Starting Vector Database Rebuild for ${dataProfile.toUpperCase()} profile...`);
			this.xLog.status(`Semantic Mode: ${semanticAnalysisMode}`);
			this.xLog.status(`Source Table: ${sourceTableName}`);
			this.xLog.status(`Vector Table: ${actualTableName}`);

			// Check for confirmation unless -yesAll is provided
			if (!commandLineParameters.switches.yesAll) {
				this.xLog.status('\nWARNING: This will completely rebuild the vector database.');
				this.xLog.status('All existing vectors will be deleted and regenerated.');
				this.xLog.status('Use -yesAll to skip this confirmation.');
				this.xLog.status('Proceeding with rebuild...');
			}

			// Step 1: Clean up existing data
			await this._cleanupExistingData(actualTableName, dataProfile, semanticAnalysisMode);

			// Step 2: Create fresh vector tables
			await this._createVectorTables(actualTableName, semanticAnalysisMode);

			// Step 3: Get total record count
			const totalRecords = await this._getTotalSourceRecords(sourceTableName);
			this.xLog.status(`Total records to rebuild: ${totalRecords}`);

			// Step 4: Create rebuild batch
			const batchId = await this._createRebuildBatch(config, totalRecords);

			// Step 5: Process all source records
			const sourceRecords = await this._getAllSourceRecords(sourceTableName);
			await this._generateEmbeddingsUsingSemanticAnalyzer(config, sourceRecords, batchId);

			// Step 6: Complete batch and optimize
			await this._completeBatch(batchId);
			await this._optimizeDatabase();

			// Step 7: Verify rebuild
			const verification = await this._verifyRebuild(actualTableName, totalRecords);

			this.xLog.status(`Vector database rebuild completed successfully`);
			this.xLog.status(`Records processed: ${totalRecords}`);
			this.xLog.status(`Vectors created: ${verification.vectorCount}`);

			return { 
				success: true, 
				batchId, 
				totalRecords, 
				vectorsCreated: verification.vectorCount,
				verification 
			};

		} catch (error) {
			const traceId = Math.floor(Math.random() * 1e9);
			this.xLog.error(`[${traceId}] Vector rebuild failed: ${error.message}`);
			throw new Error(`Vector rebuild failed [trace:${traceId}]`);
		}
	}

	// ---------------------------------------------------------------------
	// _cleanupExistingData - Remove existing vectors and progress
	
	async _cleanupExistingData(tableName, dataProfile, semanticMode) {
		this.xLog.status('Cleaning up existing vector data...');
		
		// Drop existing vector table
		const dropSql = this.dbUtility.statements.utilityStatements.dropTable(tableName);
		await this._executeQuery(dropSql);

		// Clean up progress tracking for this profile/mode
		const cleanupProgressSql = `
			DELETE FROM vectorTools_progress 
			WHERE data_profile = '${dataProfile}' 
			AND semantic_mode = '${semanticMode}'
		`;
		await this._executeQuery(cleanupProgressSql);

		this.xLog.status('Cleanup completed');
	}

	// ---------------------------------------------------------------------
	// _createVectorTables - Create fresh vector tables
	
	async _createVectorTables(tableName, semanticMode) {
		this.xLog.status('Creating fresh vector tables...');
		
		let createSql;
		if (semanticMode === 'atomicVector') {
			createSql = this.dbUtility.statements.vectorStatements.createAtomicVectorTable(tableName);
		} else {
			// Default dimensions for simple vectors
			createSql = this.dbUtility.statements.vectorStatements.createVectorTable(tableName, 1536);
		}
		
		await this._executeQuery(createSql);
		this.xLog.status(`Created vector table: ${tableName}`);
	}

	// ---------------------------------------------------------------------
	// _getTotalSourceRecords - Get count of source records
	
	async _getTotalSourceRecords(tableName) {
		const sql = this.dbUtility.statements.sourceTableStatements.countSourceRecords(tableName);
		const results = await this._query(sql);
		return results[0].count;
	}

	// ---------------------------------------------------------------------
	// _getAllSourceRecords - Get all source records for processing
	
	async _getAllSourceRecords(tableName) {
		const sql = `SELECT * FROM ${tableName} ORDER BY rowid`;
		return await this._query(sql);
	}

	// ---------------------------------------------------------------------
	// _createRebuildBatch - Create progress tracking for rebuild
	
	async _createRebuildBatch(config, totalRecords) {
		return new Promise((resolve, reject) => {
			// Add rebuild-specific metadata to config
			const rebuildConfig = {
				...config,
				operation: 'rebuild',
				startTime: new Date().toISOString()
			};

			this.progressTracker.createBatch(rebuildConfig, totalRecords, (err, batchId) => {
				if (err) {
					reject(err);
					return;
				}
				this.xLog.status(`Created rebuild batch: ${batchId}`);
				resolve(batchId);
			});
		});
	}

	// ---------------------------------------------------------------------
	// _generateEmbeddingsUsingSemanticAnalyzer - Process all records through analyzer
	
	async _generateEmbeddingsUsingSemanticAnalyzer(config, sourceRecords, batchId) {
		// Get semantic analyzer instance
		const analyzer = this.analyzerRegistry.getAnalyzer(config.semanticAnalysisMode);
		this.analyzerRegistry.validateAnalyzer(analyzer);

		this.xLog.status(`Processing ${sourceRecords.length} records with ${config.semanticAnalysisMode} analyzer...`);

		// Handle command line override at point of use  
		const workingVectorTableName = commandLineParameters.qtGetSurePath('values.targetTableName[0]') || config.vectorTableName;
		const workingAtomicTableName = commandLineParameters.qtGetSurePath('values.targetTableName[0]') 
			? `${commandLineParameters.qtGetSurePath('values.targetTableName[0]')}_atomic`
			: config.atomicVectorTableName;

		// Debug logging to see what we have
		this.xLog.status(`Debug: vectorTableName = ${config.vectorTableName}`);
		this.xLog.status(`Debug: atomicVectorTableName = ${config.atomicVectorTableName}`);
		this.xLog.status(`Debug: workingAtomicTableName = ${workingAtomicTableName}`);

		// Process records using analyzer's method
		const processingConfig = {
			sourceRowList: sourceRecords,
			sourceEmbeddableContentName: config.sourceEmbeddableContentName,
			sourcePrivateKeyName: config.sourcePrivateKeyName,
			vectorDb: this.dbUtility, // Pass dbUtility as vectorDb for compatibility
			tableName: workingVectorTableName,
			atomicTableName: workingAtomicTableName,
			dataProfile: config.dataProfile,
			batchId,
			progressTracker: this.progressTracker,
			alreadyProcessedCount: 0,
			isRebuild: true // Flag to indicate this is a rebuild operation
		};

		// Get OpenAI instance from global if available
		const { openai } = process.global || {};
		if (openai) {
			processingConfig.openai = openai;
		}

		await analyzer.extractAtomicFactsAndGenerateEmbeddings(processingConfig);
	}

	// ---------------------------------------------------------------------
	// _completeBatch - Mark rebuild batch as completed
	
	async _completeBatch(batchId) {
		return new Promise((resolve, reject) => {
			this.progressTracker.completeBatch(batchId, (err) => {
				if (err) {
					reject(err);
					return;
				}
				this.xLog.status(`Completed rebuild batch: ${batchId}`);
				resolve();
			});
		});
	}

	// ---------------------------------------------------------------------
	// _optimizeDatabase - Run database optimization after rebuild
	
	async _optimizeDatabase() {
		this.xLog.status('Optimizing database...');
		
		try {
			// Run ANALYZE to update query planner statistics
			await this._executeQuery(this.dbUtility.statements.utilityStatements.analyze());
			
			// Run VACUUM to compact database
			await this._executeQuery(this.dbUtility.statements.utilityStatements.vacuum());
			
			this.xLog.status('Database optimization completed');
		} catch (error) {
			this.xLog.warn(`Database optimization failed: ${error.message}`);
			// Don't fail the rebuild for optimization issues
		}
	}

	// ---------------------------------------------------------------------
	// _verifyRebuild - Verify the rebuild was successful
	
	async _verifyRebuild(tableName, expectedCount) {
		this.xLog.status('Verifying rebuild...');
		
		try {
			// Count vectors in the new table
			const countSql = `SELECT COUNT(*) as count FROM ${tableName}`;
			const countResults = await this._query(countSql);
			const vectorCount = countResults[0].count;

			// Get table schema info
			const schemaSql = `PRAGMA table_info(${tableName})`;
			const schemaResults = await this._query(schemaSql);
			
			// Check if table exists and has expected structure
			const hasEmbedding = schemaResults.some(col => col.name === 'embedding');
			const hasSourceRefId = schemaResults.some(col => col.name === 'sourceRefId');

			const verification = {
				vectorCount,
				expectedCount,
				completionRate: Math.round((vectorCount / expectedCount) * 100),
				hasEmbedding,
				hasSourceRefId,
				tableExists: schemaResults.length > 0,
				columnsFound: schemaResults.length
			};

			if (verification.completionRate >= 95) {
				this.xLog.status(`Verification passed: ${verification.completionRate}% completion rate`);
			} else {
				this.xLog.warn(`Verification warning: Only ${verification.completionRate}% completion rate`);
			}

			return verification;

		} catch (error) {
			this.xLog.warn(`Verification failed: ${error.message}`);
			return {
				error: error.message,
				vectorCount: 0,
				expectedCount,
				completionRate: 0
			};
		}
	}

	// ---------------------------------------------------------------------
	// _query - Execute query and return results
	
	async _query(sql, params = []) {
		return new Promise((resolve, reject) => {
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
	// _executeQuery - Execute non-select query
	
	async _executeQuery(sql, params = []) {
		return new Promise((resolve, reject) => {
			this.dbUtility.execute(sql, params, (err, result) => {
				if (err) {
					reject(err);
					return;
				}
				resolve(result);
			});
		});
	}

	// ---------------------------------------------------------------------
	// rebuildWithBackup - Rebuild with backup of existing data
	
	async rebuildWithBackup(config) {
		const backupTableName = `${config.vectorTableName}_backup_${Date.now()}`;
		
		try {
			// Create backup if table exists
			const tableExists = await this._checkTableExists(config.vectorTableName);
			if (tableExists) {
				this.xLog.status(`Creating backup table: ${backupTableName}`);
				await this._createBackup(config.vectorTableName, backupTableName);
			}

			// Perform rebuild
			const result = await this.rebuild(config);

			// Clean up backup on success
			if (tableExists) {
				this.xLog.status('Rebuild successful, removing backup');
				await this._executeQuery(this.dbUtility.statements.utilityStatements.dropTable(backupTableName));
			}

			return result;

		} catch (error) {
			// Restore from backup on failure
			const tableExists = await this._checkTableExists(backupTableName);
			if (tableExists) {
				this.xLog.status('Rebuild failed, restoring from backup');
				await this._restoreFromBackup(backupTableName, config.vectorTableName);
			}
			throw error;
		}
	}

	// ---------------------------------------------------------------------
	// _checkTableExists - Check if table exists
	
	async _checkTableExists(tableName) {
		try {
			const sql = `SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`;
			const results = await this._query(sql);
			return results.length > 0;
		} catch (error) {
			return false;
		}
	}

	// ---------------------------------------------------------------------
	// _createBackup - Create backup of existing table
	
	async _createBackup(originalTable, backupTable) {
		const sql = `CREATE TABLE ${backupTable} AS SELECT * FROM ${originalTable}`;
		await this._executeQuery(sql);
	}

	// ---------------------------------------------------------------------
	// _restoreFromBackup - Restore table from backup
	
	async _restoreFromBackup(backupTable, originalTable) {
		// Drop current table and rename backup
		await this._executeQuery(this.dbUtility.statements.utilityStatements.dropTable(originalTable));
		await this._executeQuery(`ALTER TABLE ${backupTable} RENAME TO ${originalTable}`);
	}
}

// =====================================================================
// MODULE EXPORTS
// =====================================================================

const moduleFunction = ({ dbUtility, analyzerRegistry, progressTracker }) => {
	return new VectorRebuild({ dbUtility, analyzerRegistry, progressTracker });
};

module.exports = moduleFunction;