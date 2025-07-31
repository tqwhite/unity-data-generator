'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = ({ moduleName } = {}) => ({ unused } = {}) => {
	const { xLog, getConfig, rawConfig, commandLineParameters, projectRoot } = process.global;
	const moduleConfig = getConfig(moduleName);

	// ---------------------------------------------------------------------
	// initProgressTable - creates progress tracking table if it doesn't exist
	
	const initProgressTable = (vectorDb) => {
		const createTableSql = `CREATE TABLE IF NOT EXISTS vectorTools_progress (
			batch_id TEXT PRIMARY KEY,
			data_profile TEXT,
			semantic_mode TEXT,
			source_table TEXT,
			target_table TEXT,
			source_key_field TEXT,
			total_records INTEGER,
			processed_records INTEGER DEFAULT 0,
			last_processed_key TEXT,
			start_time TEXT,
			last_update_time TEXT,
			status TEXT DEFAULT 'running',
			command_params TEXT,
			created_at TEXT DEFAULT CURRENT_TIMESTAMP
		)`;
		
		vectorDb.exec(createTableSql);
		
		// Create index for faster lookups
		vectorDb.exec(`CREATE INDEX IF NOT EXISTS idx_progress_profile_mode 
					   ON vectorTools_progress(data_profile, semantic_mode)`);
	};

	// ---------------------------------------------------------------------
	// generateBatchId - creates unique batch identifier
	
	const generateBatchId = (dataProfile, semanticMode) => {
		// Include milliseconds and a random component for uniqueness
		const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 18);
		const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
		return `${dataProfile}_${semanticMode}_${timestamp}_${random}`;
	};

	// ---------------------------------------------------------------------
	// createBatch - starts new progress tracking batch
	
	const createBatch = (vectorDb, config, semanticMode, totalRecords, commandParams) => {
		initProgressTable(vectorDb);
		
		const batchId = generateBatchId(config.dataProfile, semanticMode);
		const actualTableName = semanticMode === 'atomicVector' ? 
			`${config.vectorTableName}_atomic` : config.vectorTableName;
		
		const sql = `INSERT INTO vectorTools_progress 
			(batch_id, data_profile, semantic_mode, source_table, target_table, 
			 source_key_field, total_records, start_time, last_update_time, command_params)
			VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?)`;
		
		vectorDb.prepare(sql).run(
			batchId,
			config.dataProfile,
			semanticMode,
			config.sourceTableName,
			actualTableName,
			config.sourcePrivateKeyName,
			totalRecords,
			JSON.stringify(commandParams)
		);
		
		xLog.status(`Created progress batch: ${batchId}`);
		return batchId;
	};

	// ---------------------------------------------------------------------
	// updateProgress - updates batch progress after processing records
	
	const updateProgress = (vectorDb, batchId, processedCount, lastProcessedKey) => {
		const sql = `UPDATE vectorTools_progress 
					 SET processed_records = ?, last_processed_key = ?, 
						 last_update_time = datetime('now')
					 WHERE batch_id = ?`;
		
		vectorDb.prepare(sql).run(processedCount, lastProcessedKey, batchId);
	};

	// ---------------------------------------------------------------------
	// completeBatch - marks batch as completed
	
	const completeBatch = (vectorDb, batchId) => {
		const sql = `UPDATE vectorTools_progress 
					 SET status = 'completed', last_update_time = datetime('now')
					 WHERE batch_id = ?`;
		
		vectorDb.prepare(sql).run(batchId);
		xLog.status(`Batch completed: ${batchId}`);
	};

	// ---------------------------------------------------------------------
	// getIncompleteBatches - gets batches that can be resumed
	
	const getIncompleteBatches = (vectorDb, dataProfile = null) => {
		initProgressTable(vectorDb);
		
		let sql = `SELECT * FROM vectorTools_progress 
				   WHERE status IN ('running', 'interrupted') 
				   ORDER BY start_time DESC`;
		let params = [];
		
		if (dataProfile) {
			sql = `SELECT * FROM vectorTools_progress 
				   WHERE status IN ('running', 'interrupted') 
				   AND data_profile = ?
				   ORDER BY start_time DESC`;
			params = [dataProfile];
		}
		
		return vectorDb.prepare(sql).all(...params);
	};

	// ---------------------------------------------------------------------
	// getBatchProgress - gets specific batch details
	
	const getBatchProgress = (vectorDb, batchId) => {
		initProgressTable(vectorDb);
		
		const sql = `SELECT * FROM vectorTools_progress WHERE batch_id = ?`;
		return vectorDb.prepare(sql).get(batchId);
	};

	// ---------------------------------------------------------------------
	// getProcessedKeys - gets list of already processed keys for batch
	
	const getProcessedKeys = (vectorDb, batchId) => {
		const batch = getBatchProgress(vectorDb, batchId);
		if (!batch) return [];
		
		// For atomic mode, check the atomic table
		const tableName = batch.semantic_mode === 'atomicVector' ? 
			batch.target_table : batch.target_table;
			
		if (batch.semantic_mode === 'atomicVector') {
			// Get unique sourceRefIds from atomic table
			const sql = `SELECT DISTINCT sourceRefId FROM ${tableName} WHERE sourceRefId IS NOT NULL`;
			try {
				return vectorDb.prepare(sql).all().map(row => row.sourceRefId);
			} catch (err) {
				xLog.verbose(`No atomic vectors found yet for batch ${batchId}`);
				return [];
			}
		} else {
			// For simple mode, get rowids from vec0 table
			try {
				const sql = `SELECT rowid FROM ${tableName}`;
				return vectorDb.prepare(sql).all().map(row => row.rowid.toString());
			} catch (err) {
				xLog.verbose(`No simple vectors found yet for batch ${batchId}`);
				return [];
			}
		}
	};

	// ---------------------------------------------------------------------
	// purgeProgressTable - clears progress for specific data profile
	
	const purgeProgressTable = (vectorDb, dataProfile) => {
		initProgressTable(vectorDb);
		
		const sql = `DELETE FROM vectorTools_progress WHERE data_profile = ?`;
		const result = vectorDb.prepare(sql).run(dataProfile);
		
		xLog.status(`Purged ${result.changes} progress entries for ${dataProfile} profile`);
		return result.changes;
	};

	// ---------------------------------------------------------------------
	// showProgress - displays all progress entries
	
	const showProgress = (vectorDb) => {
		initProgressTable(vectorDb);
		
		const sql = `SELECT batch_id, data_profile, semantic_mode, 
						processed_records, total_records, status,
						start_time, last_update_time
				 FROM vectorTools_progress 
				 ORDER BY start_time DESC`;
		
		const batches = vectorDb.prepare(sql).all();
		
		if (batches.length === 0) {
			xLog.status('No progress entries found');
			return;
		}
		
		xLog.status('\nProgress Tracking Summary:');
		xLog.status('=' .repeat(80));
		
		batches.forEach(batch => {
			const progress = batch.total_records > 0 ? 
				Math.round((batch.processed_records / batch.total_records) * 100) : 0;
			
			xLog.status(`${batch.batch_id}`);
			xLog.status(`  Profile: ${batch.data_profile} | Mode: ${batch.semantic_mode} | Status: ${batch.status}`);
			xLog.status(`  Progress: ${batch.processed_records}/${batch.total_records} (${progress}%)`);
			xLog.status(`  Started: ${batch.start_time} | Updated: ${batch.last_update_time}`);
			xLog.status('');
		});
	};

	return {
		initProgressTable,
		createBatch,
		updateProgress,
		completeBatch,
		getIncompleteBatches,
		getBatchProgress,
		getProcessedKeys,
		purgeProgressTable,
		showProgress
	};
};

module.exports = moduleFunction({ moduleName }); //returns initialized moduleFunction