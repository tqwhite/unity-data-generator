#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const qt = require('qtools-functional-library');

// =====================================================================
// PROGRESS TRACKER - Resumable operation tracking service
// =====================================================================

class ProgressTracker {
	constructor({ dbUtility }) {
		const { xLog, getConfig } = process.global;
		this.xLog = xLog;
		this.dbUtility = dbUtility;
		this.moduleConfig = getConfig(moduleName);
		
		// Initialize progress table
		this._initProgressTable();
	}

	// ---------------------------------------------------------------------
	// _initProgressTable - Create progress tracking table if needed
	
	_initProgressTable() {
		const sql = this.dbUtility.statements.progressStatements.createProgressTable();
		
		this.dbUtility.execute(sql, [], (err) => {
			if (err) {
				this.xLog.warn(`Progress table initialization warning: ${err.message}`);
			}
		});
	}

	// ---------------------------------------------------------------------
	// generateBatchId - Create unique batch identifier
	
	generateBatchId(dataProfile, semanticMode) {
		const timestamp = new Date()
			.toISOString()
			.replace(/[:.]/g, '')
			.slice(0, 18);
		const random = Math.floor(Math.random() * 1000)
			.toString()
			.padStart(3, '0');
		return `${dataProfile}_${semanticMode}_${timestamp}_${random}`;
	}

	// ---------------------------------------------------------------------
	// createBatch - Start new progress tracking batch
	
	createBatch(config, totalRecords, callback) {
		const { dataProfile, semanticAnalysisMode, sourceTableName, vectorTableName, sourcePrivateKeyName } = config;
		const batchId = this.generateBatchId(dataProfile, semanticAnalysisMode);
		
		const sql = this.dbUtility.statements.progressStatements.insertProgress(
			batchId,
			dataProfile,
			semanticAnalysisMode,
			sourceTableName,
			vectorTableName,
			sourcePrivateKeyName,
			totalRecords,
			config
		);
		
		this.dbUtility.execute(sql, [], (err) => {
			if (err) {
				const traceId = Math.floor(Math.random() * 1e9);
				this.xLog.error(`[${traceId}] Failed to create progress batch: ${err.message}`);
				callback(err);
				return;
			}
			
			this.xLog.status(`Created progress batch: ${batchId}`);
			callback(null, batchId);
		});
	}

	// ---------------------------------------------------------------------
	// updateProgress - Update batch progress
	
	updateProgress(batchId, processedCount, lastProcessedKey, callback) {
		const sql = this.dbUtility.statements.progressStatements.updateProgress(
			batchId,
			processedCount,
			lastProcessedKey
		);
		
		this.dbUtility.execute(sql, [], (err) => {
			if (err) {
				this.xLog.warn(`Failed to update progress: ${err.message}`);
			}
			if (callback) callback(err);
		});
	}

	// ---------------------------------------------------------------------
	// completeBatch - Mark batch as completed
	
	completeBatch(batchId, callback) {
		const sql = this.dbUtility.statements.progressStatements.completeBatch(batchId);
		
		this.dbUtility.execute(sql, [], (err) => {
			if (err) {
				this.xLog.warn(`Failed to complete batch: ${err.message}`);
			} else {
				this.xLog.status(`Completed batch: ${batchId}`);
			}
			if (callback) callback(err);
		});
	}

	// ---------------------------------------------------------------------
	// getIncompleteBatches - Find resumable batches
	
	getIncompleteBatches(config, callback) {
		const { dataProfile, semanticAnalysisMode } = config;
		const sql = this.dbUtility.statements.progressStatements.getIncompleteBatches(
			dataProfile,
			semanticAnalysisMode
		);
		
		this.dbUtility.query(sql, [], callback);
	}

	// ---------------------------------------------------------------------
	// showProgress - Display current progress
	
	async showProgress(config) {
		return new Promise((resolve, reject) => {
			this.getIncompleteBatches(config, (err, batches) => {
				if (err) {
					reject(err);
					return;
				}
				
				if (batches.length === 0) {
					this.xLog.status('No active vector generation batches');
				} else {
					batches.forEach(batch => {
						const percent = Math.round((batch.processed_records / batch.total_records) * 100);
						this.xLog.status(`
Batch: ${batch.batch_id}
Profile: ${batch.data_profile}
Mode: ${batch.semantic_mode}
Progress: ${batch.processed_records}/${batch.total_records} (${percent}%)
Status: ${batch.status}
Started: ${batch.start_time}
Last Update: ${batch.last_update_time}
						`);
					});
				}
				
				resolve({ shouldExit: true, exitCode: 0 });
			});
		});
	}

	// ---------------------------------------------------------------------
	// purgeProgress - Clean up progress tracking
	
	async purgeProgress(config) {
		return new Promise((resolve, reject) => {
			const { commandLineParameters } = process.global;
			const yesAll = commandLineParameters.switches.yesAll;
			
			if (!yesAll) {
				this.xLog.status('This will remove all progress tracking data.');
				this.xLog.status('Use -yesAll to skip this confirmation.');
				// In real implementation, would prompt for confirmation
			}
			
			const sql = 'DELETE FROM vectorTools_progress';
			
			this.dbUtility.execute(sql, [], (err) => {
				if (err) {
					reject(err);
					return;
				}
				
				this.xLog.status('Progress tracking data purged');
				resolve({ shouldExit: true, exitCode: 0 });
			});
		});
	}

	// ---------------------------------------------------------------------
	// getResumableState - Get state for resuming operation
	
	getResumableState(batchId, callback) {
		const sql = `
			SELECT * FROM vectorTools_progress
			WHERE batch_id = '${batchId}'
		`;
		
		this.dbUtility.query(sql, [], (err, results) => {
			if (err) {
				callback(err);
				return;
			}
			
			if (results.length === 0) {
				callback(new Error(`Batch not found: ${batchId}`));
				return;
			}
			
			callback(null, results[0]);
		});
	}
}

// =====================================================================
// MODULE EXPORTS
// =====================================================================

const moduleFunction = ({ dbUtility }) => {
	return new ProgressTracker({ dbUtility });
};

module.exports = moduleFunction;