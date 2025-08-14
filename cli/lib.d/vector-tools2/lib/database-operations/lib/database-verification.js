#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

// =====================================================================
// DATABASE VERIFICATION - Utilities to verify database state and integrity
// =====================================================================

const moduleFunction = ({ dbUtility } = {}) => {
	const { xLog } = process.global;

	// Validate required dependency
	if (!dbUtility) {
		const traceId = Math.floor(Math.random() * 1e9);
		throw new Error(`DirectQueryUtility required for database verification [trace:${traceId}]`);
	}

	// ---------------------------------------------------------------------
	// checkVectorExtension - Verify sqlite-vec extension availability
	
	const checkVectorExtension = async () => {
		try {
			const result = await new Promise((resolve, reject) => {
				dbUtility.query(`SELECT vec_version() as version`, [], (err, results) => {
					if (err) resolve(null);
					else resolve(results[0]);
				});
			});

			if (result) {
				return {
					available: true,
					version: result.version,
					message: `sqlite-vec extension v${result.version} is available`
				};
			} else {
				return {
					available: false,
					version: null,
					message: 'sqlite-vec extension is not available - vector operations will be limited'
				};
			}

		} catch (error) {
			return {
				available: false,
				version: null,
				error: error.message,
				message: 'Error checking vector extension availability'
			};
		}
	};

	// ---------------------------------------------------------------------
	// verifyTableIntegrity - Check table structure and basic integrity
	
	const verifyTableIntegrity = async (tableName) => {
		const traceId = Math.floor(Math.random() * 1e9);
		
		try {
			// Check if table exists
			const exists = await new Promise((resolve, reject) => {
				dbUtility.tableExists(tableName, (err, result) => {
					if (err) reject(err);
					else resolve(result);
				});
			});

			if (!exists) {
				return {
					valid: false,
					error: `Table ${tableName} does not exist`,
					traceId
				};
			}

			// Get table schema
			const schema = await new Promise((resolve, reject) => {
				dbUtility.getTableSchema(tableName, (err, result) => {
					if (err) reject(err);
					else resolve(result);
				});
			});

			// Get table statistics
			const stats = await new Promise((resolve, reject) => {
				dbUtility.getTableStats(tableName, (err, result) => {
					if (err) reject(err);
					else resolve(result);
				});
			});

			// Determine table type and verify structure
			const tableType = determineTableType(schema);
			const structureValid = validateTableStructure(tableType, schema);

			// Check for orphaned records (if applicable)
			const orphanCheck = await checkOrphanedRecords(tableName, tableType);

			return {
				valid: structureValid.valid,
				tableName,
				tableType,
				schema,
				stats,
				structure: structureValid,
				orphans: orphanCheck,
				traceId
			};

		} catch (error) {
			xLog.error(`[${traceId}] Table verification failed for ${tableName}: ${error.message}`);
			return {
				valid: false,
				tableName,
				error: error.message,
				traceId
			};
		}
	};

	// ---------------------------------------------------------------------
	// determineTableType - Identify the type of vector table
	
	const determineTableType = (schema) => {
		const columnNames = schema.map(col => col.name);
		
		// Check for simple vector table (sqlite-vec virtual table)
		if (columnNames.includes('embedding') && schema.find(col => col.name === 'embedding').type === '') {
			return 'simple_vector';
		}
		
		// Check for atomic vector table
		if (columnNames.includes('factType') && columnNames.includes('factText') && columnNames.includes('embedding')) {
			return 'atomic_vector';
		}
		
		// Check for progress table
		if (columnNames.includes('batch_id') && columnNames.includes('data_profile')) {
			return 'progress';
		}
		
		// Check for source data tables
		if (columnNames.includes('ElementName') || columnNames.includes('Definition')) {
			return 'ceds_source';
		}
		
		if (columnNames.includes('Name') && columnNames.includes('Description') && columnNames.includes('XPath')) {
			return 'sif_source';
		}
		
		return 'unknown';
	};

	// ---------------------------------------------------------------------
	// validateTableStructure - Verify table has expected columns for its type
	
	const validateTableStructure = (tableType, schema) => {
		const columnNames = schema.map(col => col.name);
		const issues = [];
		
		switch (tableType) {
			case 'simple_vector':
				const simpleRequired = ['embedding', 'sourceRefId', 'sourceTableName', 'sourceContent', 'metadata'];
				const simpleMissing = simpleRequired.filter(col => !columnNames.includes(col));
				if (simpleMissing.length > 0) {
					issues.push(`Missing required simple vector columns: ${simpleMissing.join(', ')}`);
				}
				break;
				
			case 'atomic_vector':
				const atomicRequired = ['refId', 'sourceRefId', 'factType', 'factText', 'embedding'];
				const atomicMissing = atomicRequired.filter(col => !columnNames.includes(col));
				if (atomicMissing.length > 0) {
					issues.push(`Missing required atomic vector columns: ${atomicMissing.join(', ')}`);
				}
				break;
				
			case 'progress':
				const progressRequired = ['batch_id', 'data_profile', 'semantic_mode', 'total_records'];
				const progressMissing = progressRequired.filter(col => !columnNames.includes(col));
				if (progressMissing.length > 0) {
					issues.push(`Missing required progress columns: ${progressMissing.join(', ')}`);
				}
				break;
		}
		
		return {
			valid: issues.length === 0,
			issues,
			tableType
		};
	};

	// ---------------------------------------------------------------------
	// checkOrphanedRecords - Look for records without valid references
	
	const checkOrphanedRecords = async (tableName, tableType) => {
		if (tableType !== 'atomic_vector' && tableType !== 'simple_vector') {
			return { checked: false, reason: 'Not a vector table' };
		}

		try {
			// For now, just check if sourceRefId references exist in potential source tables
			// This could be expanded to actually verify foreign key relationships
			const sql = `
				SELECT COUNT(*) as orphan_count
				FROM ${tableName}
				WHERE sourceRefId IS NULL OR sourceRefId = ''
			`;
			
			const result = await new Promise((resolve, reject) => {
				dbUtility.query(sql, [], (err, results) => {
					if (err) reject(err);
					else resolve(results[0]);
				});
			});

			return {
				checked: true,
				orphanCount: result.orphan_count,
				hasOrphans: result.orphan_count > 0
			};

		} catch (error) {
			return {
				checked: false,
				error: error.message
			};
		}
	};

	// ---------------------------------------------------------------------
	// verifyDatabaseHealth - Comprehensive database health check
	
	const verifyDatabaseHealth = async () => {
		const traceId = Math.floor(Math.random() * 1e9);
		const healthReport = {
			timestamp: new Date().toISOString(),
			traceId,
			overall: 'unknown',
			checks: {}
		};

		try {
			xLog.status('Performing database health verification...');

			// Check vector extension
			healthReport.checks.vectorExtension = await checkVectorExtension();

			// Get all tables
			const tables = await new Promise((resolve, reject) => {
				dbUtility.listTables((err, tableList) => {
					if (err) reject(err);
					else resolve(tableList);
				});
			});

			healthReport.checks.tableCount = tables.length;

			// Categorize tables
			const vectorTables = [];
			const sourceTables = [];
			const progressTables = [];
			const otherTables = [];

			for (const tableName of tables) {
				const verification = await verifyTableIntegrity(tableName);
				
				switch (verification.tableType) {
					case 'simple_vector':
					case 'atomic_vector':
						vectorTables.push(verification);
						break;
					case 'progress':
						progressTables.push(verification);
						break;
					case 'ceds_source':
					case 'sif_source':
						sourceTables.push(verification);
						break;
					default:
						otherTables.push(verification);
				}
			}

			healthReport.checks.vectorTables = {
				count: vectorTables.length,
				tables: vectorTables,
				allValid: vectorTables.every(t => t.valid)
			};

			healthReport.checks.sourceTables = {
				count: sourceTables.length,
				tables: sourceTables,
				allValid: sourceTables.every(t => t.valid)
			};

			healthReport.checks.progressTables = {
				count: progressTables.length,
				tables: progressTables,
				allValid: progressTables.every(t => t.valid)
			};

			healthReport.checks.otherTables = {
				count: otherTables.length,
				tables: otherTables
			};

			// Determine overall health
			const allTablesValid = [
				...vectorTables,
				...sourceTables,
				...progressTables
			].every(t => t.valid);

			if (allTablesValid && tables.length > 0) {
				healthReport.overall = 'healthy';
			} else if (tables.length === 0) {
				healthReport.overall = 'empty';
			} else {
				healthReport.overall = 'issues_detected';
			}

			xLog.status(`Database health check completed: ${healthReport.overall}`);

			return healthReport;

		} catch (error) {
			xLog.error(`[${traceId}] Database health verification failed: ${error.message}`);
			healthReport.overall = 'error';
			healthReport.error = error.message;
			return healthReport;
		}
	};

	// ---------------------------------------------------------------------
	// getDetailedStats - Get comprehensive database statistics
	
	const getDetailedStats = async () => {
		const stats = {
			database: {},
			tables: {},
			vector: {},
			performance: {}
		};

		try {
			// Database-level info
			const dbInfo = await new Promise((resolve, reject) => {
				const sql = `
					SELECT 
						(SELECT COUNT(*) FROM sqlite_master WHERE type = 'table') as table_count,
						(SELECT COUNT(*) FROM sqlite_master WHERE type = 'index') as index_count,
						(SELECT page_count * page_size FROM pragma_page_count(), pragma_page_size()) as size_bytes
				`;
				
				dbUtility.query(sql, [], (err, results) => {
					if (err) reject(err);
					else resolve(results[0]);
				});
			});

			stats.database = {
				...dbInfo,
				sizeMB: Math.round(dbInfo.size_bytes / 1024 / 1024 * 100) / 100
			};

			// Vector extension info
			stats.vector = await checkVectorExtension();

			// Performance metrics (if available)
			try {
				const perfSql = `
					SELECT 
						name,
						(SELECT COUNT(*) FROM sqlite_master WHERE type = 'index' AND tbl_name = t.name) as index_count
					FROM sqlite_master t
					WHERE type = 'table'
					ORDER BY name
				`;
				
				const perfResults = await new Promise((resolve, reject) => {
					dbUtility.query(perfSql, [], (err, results) => {
						if (err) reject(err);
						else resolve(results);
					});
				});

				stats.performance.tablesWithIndexes = perfResults.filter(t => t.index_count > 0).length;
				stats.performance.tablesWithoutIndexes = perfResults.filter(t => t.index_count === 0).length;
				
			} catch (error) {
				stats.performance.error = error.message;
			}

			return stats;

		} catch (error) {
			const traceId = Math.floor(Math.random() * 1e9);
			xLog.error(`[${traceId}] Failed to get detailed stats: ${error.message}`);
			return { error: error.message, traceId };
		}
	};

	// =====================================================================
	// PUBLIC INTERFACE
	// =====================================================================
	
	return {
		checkVectorExtension,
		verifyTableIntegrity,
		verifyDatabaseHealth,
		getDetailedStats,
		determineTableType,
		validateTableStructure,
		checkOrphanedRecords
	};
};

module.exports = moduleFunction;