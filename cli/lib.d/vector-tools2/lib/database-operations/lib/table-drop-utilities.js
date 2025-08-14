#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

// =====================================================================
// TABLE DROP UTILITIES - Enhanced table drop operations with safety
// =====================================================================

const moduleFunction = ({ dbUtility } = {}) => {
	const { xLog } = process.global;

	// Validate required dependency
	if (!dbUtility) {
		const traceId = Math.floor(Math.random() * 1e9);
		throw new Error(`DirectQueryUtility required for table drop operations [trace:${traceId}]`);
	}

	// ---------------------------------------------------------------------
	// findTargetTables - Find tables matching specified patterns
	
	const findTargetTables = async (tablePattern) => {
		return new Promise((resolve, reject) => {
			const sql = `
				SELECT name FROM sqlite_master 
				WHERE type = 'table' 
				AND name LIKE ?
				ORDER BY name
			`;
			
			dbUtility.query(sql, [tablePattern], (err, results) => {
				if (err) {
					reject(err);
					return;
				}
				
				const tables = results.map(row => row.name);
				resolve(tables);
			});
		});
	};

	// ---------------------------------------------------------------------
	// categorizeVectorTables - Identify different types of vector tables
	
	const categorizeVectorTables = async (tableNames) => {
		const categories = {
			simple: [],
			atomic: [],
			progress: [],
			other: []
		};

		for (const tableName of tableNames) {
			try {
				const schema = await new Promise((resolve, reject) => {
					dbUtility.getTableSchema(tableName, (err, result) => {
						if (err) reject(err);
						else resolve(result);
					});
				});

				// Check for simple vector tables (sqlite-vec virtual tables)
				const isVirtualTable = schema.some(col => col.name === 'embedding' && col.type === '');
				
				// Check for atomic vector tables (regular tables with rich metadata)
				const hasFactColumns = schema.some(col => col.name === 'factType' || col.name === 'factText');
				const hasEmbeddingBlob = schema.some(col => col.name === 'embedding' && col.type.includes('BLOB'));
				
				// Check for progress tables
				const isProgressTable = tableName.includes('progress') || 
					schema.some(col => col.name === 'batch_id');

				if (isProgressTable) {
					categories.progress.push(tableName);
				} else if (isVirtualTable) {
					categories.simple.push(tableName);
				} else if (hasFactColumns && hasEmbeddingBlob) {
					categories.atomic.push(tableName);
				} else {
					categories.other.push(tableName);
				}

			} catch (error) {
				// If we can't determine the schema, categorize as other
				categories.other.push(tableName);
			}
		}

		return categories;
	};

	// ---------------------------------------------------------------------
	// getTableStatistics - Get row counts and basic info for tables
	
	const getTableStatistics = async (tableNames) => {
		const statistics = [];

		for (const tableName of tableNames) {
			try {
				const stats = await new Promise((resolve, reject) => {
					dbUtility.getTableStats(tableName, (err, result) => {
						if (err) reject(err);
						else resolve(result);
					});
				});

				statistics.push({
					name: tableName,
					rowCount: stats.rowCount,
					status: stats.rowCount > 0 ? 'POPULATED' : 'EMPTY'
				});

			} catch (error) {
				statistics.push({
					name: tableName,
					rowCount: 0,
					status: 'ERROR',
					error: error.message
				});
			}
		}

		return statistics;
	};

	// ---------------------------------------------------------------------
	// isSystemTableThatShouldNeverBeDropped - Check if table should never be dropped
	
	const isSystemTableThatShouldNeverBeDropped = (tableName) => {
		const protectedPatterns = [
			'sqlite_',
			'CEDS_',
			'_CEDSElements',
			'naDataModel',
			'users',
			'auth',
			'system'
		];

		return protectedPatterns.some(pattern => 
			tableName.toLowerCase().includes(pattern.toLowerCase())
		);
	};

	// ---------------------------------------------------------------------
	// validateTableDropSafety - Perform safety checks before dropping
	
	const validateTableDropSafety = async (config = {}) => {
		const { dataProfile, targetTableName, semanticAnalysisMode, semanticAnalyzerVersion } = config;
		const traceId = Math.floor(Math.random() * 1e9);
		
		try {
			// Determine target tables
			let tablesToDrop = [];
			
			if (targetTableName) {
				// Explicit table name provided
				tablesToDrop = Array.isArray(targetTableName) ? targetTableName : [targetTableName];
			} else if (dataProfile && semanticAnalysisMode) {
				// Generate table pattern based on profile and mode
				if (semanticAnalysisMode === 'simple') {
					tablesToDrop = [`simple_${dataProfile}_vectors`];
				} else if (semanticAnalysisMode === 'atomic') {
					if (semanticAnalyzerVersion) {
						tablesToDrop = [`atomic_${dataProfile}_vectors_${semanticAnalyzerVersion}`];
					} else {
						// Find all atomic tables for this profile
						const pattern = `atomic_${dataProfile}_vectors%`;
						tablesToDrop = await findTargetTables(pattern);
					}
				}
			} else {
				throw new Error('Insufficient parameters: need targetTableName OR (dataProfile + semanticAnalysisMode)');
			}

			// Check for protected tables
			const protectedTables = tablesToDrop.filter(isSystemTableThatShouldNeverBeDropped);
			if (protectedTables.length > 0) {
				throw new Error(`Cannot drop protected tables: ${protectedTables.join(', ')}`);
			}

			// Verify tables exist and get statistics
			const existingTables = [];
			for (const tableName of tablesToDrop) {
				const exists = await new Promise((resolve, reject) => {
					dbUtility.tableExists(tableName, (err, result) => {
						if (err) reject(err);
						else resolve(result);
					});
				});
				
				if (exists) {
					existingTables.push(tableName);
				}
			}

			if (existingTables.length === 0) {
				return {
					success: true,
					tablesToDrop: [],
					message: 'No matching tables found to drop'
				};
			}

			// Get table statistics
			const statistics = await getTableStatistics(existingTables);
			const totalRecords = statistics.reduce((sum, table) => sum + table.rowCount, 0);

			// Categorize tables
			const categories = await categorizeVectorTables(existingTables);

			return {
				success: true,
				tablesToDrop: existingTables,
				statistics,
				categories,
				totalRecords,
				traceId
			};

		} catch (error) {
			xLog.error(`[${traceId}] Drop validation failed: ${error.message}`);
			return {
				success: false,
				error: error.message,
				traceId
			};
		}
	};

	// ---------------------------------------------------------------------
	// executeDrop - Perform the actual table dropping
	
	const executeDrop = async (tablesToDrop) => {
		const results = {
			success: true,
			droppedCount: 0,
			failedCount: 0,
			details: [],
			errors: []
		};

		for (const tableName of tablesToDrop) {
			try {
				xLog.verbose(`Dropping table: ${tableName}`);
				
				await new Promise((resolve, reject) => {
					const sql = `DROP TABLE IF EXISTS ${tableName}`;
					dbUtility.execute(sql, [], (err, result) => {
						if (err) reject(err);
						else resolve(result);
					});
				});

				results.droppedCount++;
				results.details.push({
					table: tableName,
					status: 'dropped'
				});
				
				xLog.verbose(`✓ Successfully dropped: ${tableName}`);

			} catch (error) {
				results.failedCount++;
				results.errors.push({
					table: tableName,
					error: error.message
				});
				
				xLog.error(`✗ Failed to drop ${tableName}: ${error.message}`);
				
				// If any table fails, mark overall operation as failed
				results.success = false;
			}
		}

		return results;
	};

	// =====================================================================
	// PUBLIC INTERFACE
	// =====================================================================
	
	return {
		findTargetTables,
		categorizeVectorTables,
		getTableStatistics,
		isSystemTableThatShouldNeverBeDropped,
		validateTableDropSafety,
		executeDrop
	};
};

module.exports = moduleFunction;