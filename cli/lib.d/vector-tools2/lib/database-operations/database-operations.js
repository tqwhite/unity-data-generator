#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const qt = require('qtools-functional-library');
const os = require('os');
const path = require('path');
const fs = require('fs');

// =====================================================================
// DATABASE OPERATIONS - Centralized database management for vector-tools2
// =====================================================================

const moduleFunction = ({ dbUtility } = {}) => {
	const { xLog, getConfig, rawConfig, commandLineParameters } = process.global;
	const localConfig = getConfig(moduleName);

	// Validate required dependency
	if (!dbUtility) {
		const traceId = Math.floor(Math.random() * 1e9);
		throw new Error(`DirectQueryUtility required for database operations [trace:${traceId}]`);
	}

	// Import utility modules
	const tableDropUtilities = require('./lib/table-drop-utilities')({ dbUtility });
	const databaseVerification = require('./lib/database-verification')({ dbUtility });

	// ---------------------------------------------------------------------
	// displayComprehensiveDatabaseStatistics - Display comprehensive database statistics
	
	const displayComprehensiveDatabaseStatistics = async () => {
		const traceId = Math.floor(Math.random() * 1e9);
		
		try {
			xLog.status('Database Statistics', 'title');
			xLog.status('==================');
			
			// Get detailed statistics using verification utilities
			const detailedStats = await databaseVerification.getDetailedStats();
			
			if (detailedStats.error) {
				xLog.error(`Failed to get database statistics: ${detailedStats.error}`);
				return { success: false, shouldExit: false };
			}
			
			// Show database overview
			xLog.status(`Database Path: ${dbUtility.databasePath}`);
			xLog.status(`Total Tables: ${detailedStats.database.table_count}`);
			xLog.status(`Total Indexes: ${detailedStats.database.index_count}`);
			xLog.status(`Database Size: ${detailedStats.database.sizeMB} MB`);
			
			// Show vector extension status
			if (detailedStats.vector.available) {
				xLog.status(`Vector Extension: ${detailedStats.vector.message}`, 'success');
			} else {
				xLog.status(`Vector Extension: ${detailedStats.vector.message}`, 'warning');
			}
			xLog.status('');

			// Get all tables
			const tables = await new Promise((resolve, reject) => {
				dbUtility.listTables((err, tableList) => {
					if (err) reject(err);
					else resolve(tableList);
				});
			});

			if (tables.length === 0) {
				xLog.status('No tables found in database');
				return { success: true, shouldExit: false };
			}

			// Categorize and show tables
			const vectorTables = tables.filter(name => 
				name.includes('vector') || 
				name.includes('embedding') ||
				name.includes('simple_') ||
				name.includes('atomic_')
			);
			
			const sourceTables = tables.filter(name => 
				name.includes('CEDS') || 
				name === 'naDataModel' ||
				name.includes('Elements')
			);
			
			const systemTables = tables.filter(name => 
				name.startsWith('vectorTools_') ||
				name.startsWith('_')
			);
			
			const otherTables = tables.filter(name => 
				!vectorTables.includes(name) && 
				!sourceTables.includes(name) && 
				!systemTables.includes(name)
			);

			// Show Vector Tables
			if (vectorTables.length > 0) {
				xLog.status('Vector Tables:', 'subtitle');
				for (const tableName of vectorTables) {
					await displayIndividualTableStatistics(tableName);
				}
				xLog.status('');
			}

			// Show Source Tables  
			if (sourceTables.length > 0) {
				xLog.status('Source Data Tables:', 'subtitle');
				for (const tableName of sourceTables) {
					await displayIndividualTableStatistics(tableName);
				}
				xLog.status('');
			}

			// Show System Tables
			if (systemTables.length > 0) {
				xLog.status('System Tables:', 'subtitle');
				for (const tableName of systemTables) {
					await displayIndividualTableStatistics(tableName);
				}
				xLog.status('');
			}

			// Show Other Tables
			if (otherTables.length > 0) {
				xLog.status('Other Tables:', 'subtitle');
				for (const tableName of otherTables) {
					await displayIndividualTableStatistics(tableName);
				}
			}

			// Check vector extension
			try {
				const vecResult = await new Promise((resolve, reject) => {
					dbUtility.query(`SELECT vec_version() as version`, [], (err, results) => {
						if (err) resolve(null);
						else resolve(results[0]);
					});
				});
				
				if (vecResult) {
					xLog.status('');
					xLog.status(`sqlite-vec extension: v${vecResult.version}`, 'success');
				}
			} catch (error) {
				// Vector extension not available - not an error
			}

			return { success: true, shouldExit: false };

		} catch (error) {
			xLog.error(`[${traceId}] Failed to show database stats: ${error.message}`);
			throw error;
		}
	};

	// ---------------------------------------------------------------------
	// displayIndividualTableStatistics - Helper to show individual table statistics
	
	const displayIndividualTableStatistics = async (tableName) => {
		try {
			const stats = await new Promise((resolve, reject) => {
				dbUtility.getTableStats(tableName, (err, result) => {
					if (err) reject(err);
					else resolve(result);
				});
			});
			
			const rowCount = stats.rowCount.toLocaleString();
			xLog.status(`  ${tableName}: ${rowCount} rows`);
			
		} catch (error) {
			xLog.status(`  ${tableName}: <error getting stats>`);
		}
	};

	// ---------------------------------------------------------------------
	// dropVectorTablesWithConfirmation - Drop vector tables with confirmation
	
	const dropVectorTablesWithConfirmation = async (config = {}) => {
		const traceId = Math.floor(Math.random() * 1e9);
		
		try {
			xLog.status('Drop Table Operation', 'title');
			xLog.status('===================');
			
			// Validate and prepare drop operation using enhanced utilities
			const validation = await tableDropUtilities.validateTableDropSafety(config);
			
			if (!validation.success) {
				xLog.error(`Drop validation failed: ${validation.error}`);
				return { success: false, shouldExit: false };
			}

			if (validation.tablesToDrop.length === 0) {
				xLog.status(validation.message || 'No tables found to drop');
				return { success: true, shouldExit: false };
			}

			// Show detailed information about what will be dropped
			xLog.status('Tables to be dropped:');
			validation.statistics.forEach(table => {
				const statusInfo = table.rowCount > 0 ? ` (${table.rowCount.toLocaleString()} records)` : ' (empty)';
				xLog.status(`  - ${table.name}${statusInfo} [${table.status}]`);
			});
			
			if (validation.totalRecords > 0) {
				xLog.status('');
				xLog.status(`Total records to be deleted: ${validation.totalRecords.toLocaleString()}`);
			}

			// Show table categories
			if (validation.categories) {
				const { simple, atomic, progress, other } = validation.categories;
				if (simple.length > 0) xLog.status(`Simple vector tables: ${simple.length}`);
				if (atomic.length > 0) xLog.status(`Atomic vector tables: ${atomic.length}`);
				if (progress.length > 0) xLog.status(`Progress tables: ${progress.length}`);
				if (other.length > 0) xLog.status(`Other tables: ${other.length}`);
			}
			xLog.status('');

			// Check for --yesAll flag to skip confirmation
			const skipConfirmation = commandLineParameters.qtGetSurePath('switches.yesAll', false);
			
			if (!skipConfirmation) {
				xLog.status('WARNING: This operation cannot be undone!');
				xLog.status('Use --yesAll to skip this confirmation.');
				return { success: false, shouldExit: true };
			}

			// Execute the drop operation using enhanced utilities
			const dropResult = await tableDropUtilities.executeDrop(validation.tablesToDrop);

			xLog.status('');
			if (dropResult.success) {
				xLog.status(`✓ Drop operation completed successfully`);
				xLog.status(`  ${dropResult.droppedCount} tables dropped`);
				if (dropResult.failedCount > 0) {
					xLog.status(`  ${dropResult.failedCount} tables failed to drop`);
				}
			} else {
				xLog.error(`✗ Drop operation completed with errors`);
				xLog.status(`  ${dropResult.droppedCount} tables dropped successfully`);
				xLog.status(`  ${dropResult.failedCount} tables failed to drop`);
				dropResult.errors.forEach(error => {
					xLog.error(`    ${error.table}: ${error.error}`);
				});
			}
			
			// Show updated database state
			xLog.status('');
			xLog.status('Updated database state:');
			await displayComprehensiveDatabaseStatistics();

			return { success: dropResult.success, shouldExit: false };

		} catch (error) {
			xLog.error(`[${traceId}] Drop table operation failed: ${error.message}`);
			return { success: false, shouldExit: false };
		}
	};

	// ---------------------------------------------------------------------
	// createDatabase - Create new vector tables
	
	const createDatabase = async (config = {}) => {
		const traceId = Math.floor(Math.random() * 1e9);
		const { dataProfile, semanticAnalysisMode, semanticAnalyzerVersion } = config;
		
		try {
			xLog.status('Create Database Operation', 'title');
			xLog.status('========================');
			
			if (!dataProfile || !semanticAnalysisMode) {
				xLog.error('Missing required configuration: dataProfile and semanticAnalysisMode required');
				return { success: false, shouldExit: false };
			}

			// Determine table names to create
			const tablesToCreate = await determineTargetTables(config);
			
			if (tablesToCreate.length === 0) {
				xLog.error('No table configuration found for the specified parameters');
				return { success: false, shouldExit: false };
			}

			xLog.status(`Data Profile: ${dataProfile}`);
			xLog.status(`Semantic Analysis Mode: ${semanticAnalysisMode}`);
			if (semanticAnalyzerVersion) {
				xLog.status(`Analyzer Version: ${semanticAnalyzerVersion}`);
			}
			xLog.status('');
			xLog.status('Tables to create:');
			tablesToCreate.forEach(table => {
				xLog.status(`  - ${table}`);
			});
			xLog.status('');

			// Create tables based on semantic analysis mode
			let createdCount = 0;
			for (const tableName of tablesToCreate) {
				try {
					// Check if table already exists
					const exists = await new Promise((resolve, reject) => {
						dbUtility.tableExists(tableName, (err, result) => {
							if (err) reject(err);
							else resolve(result);
						});
					});

					if (exists) {
						xLog.status(`- Table already exists: ${tableName}`);
						continue;
					}

					// Create table based on type
					if (semanticAnalysisMode === 'simple' || tableName.includes('simple_')) {
						// Simple vector table (sqlite-vec virtual table)
						await new Promise((resolve, reject) => {
							dbUtility.createVectorTable(tableName, 1536, (err, result) => {
								if (err) reject(err);
								else resolve(result);
							});
						});
					} else if (semanticAnalysisMode === 'atomic' || tableName.includes('atomic_')) {
						// Atomic vector table (regular table with rich metadata)
						const sql = dbUtility.statements.vectorStatements.createAtomicVectorTable(tableName);
						await new Promise((resolve, reject) => {
							dbUtility.execute(sql, [], (err, result) => {
								if (err) reject(err);
								else resolve(result);
							});
						});
					}

					xLog.status(`✓ Created table: ${tableName}`);
					createdCount++;

				} catch (error) {
					// Check if it's a vector extension issue
					if (error.message.includes('sqlite-vec extension not available')) {
						xLog.warning(`Cannot create vector table ${tableName}: sqlite-vec extension not available`);
						xLog.warning('Vector similarity search will not be available');
						continue;
					}
					xLog.error(`✗ Failed to create ${tableName}: ${error.message}`);
				}
			}

			// Create progress tracking table
			try {
				const progressSql = dbUtility.statements.progressStatements.createProgressTable();
				await new Promise((resolve, reject) => {
					dbUtility.execute(progressSql, [], (err, result) => {
						if (err) reject(err);
						else resolve(result);
					});
				});
				xLog.status(`✓ Created progress tracking table`);
			} catch (error) {
				xLog.warning(`Failed to create progress table: ${error.message}`);
			}

			xLog.status('');
			xLog.status(`Create operation completed: ${createdCount} tables created`);
			
			// Show updated database state
			xLog.status('');
			xLog.status('Updated database state:');
			await displayComprehensiveDatabaseStatistics();

			return { success: true, shouldExit: false };

		} catch (error) {
			xLog.error(`[${traceId}] Create database operation failed: ${error.message}`);
			return { success: false, shouldExit: false };
		}
	};

	// ---------------------------------------------------------------------
	// determineTargetTables - Helper to determine table names from config
	
	const determineTargetTables = async (config) => {
		const { dataProfile, semanticAnalysisMode, semanticAnalyzerVersion, targetTableName } = config;
		const tables = [];

		// If explicit table name provided, use it
		if (targetTableName) {
			return Array.isArray(targetTableName) ? targetTableName : [targetTableName];
		}

		// Generate table names based on profile and mode
		if (dataProfile && semanticAnalysisMode) {
			if (semanticAnalysisMode === 'simple') {
				tables.push(`simple_${dataProfile}_vectors`);
			} else if (semanticAnalysisMode === 'atomic') {
				if (semanticAnalyzerVersion) {
					tables.push(`atomic_${dataProfile}_vectors_${semanticAnalyzerVersion}`);
				} else {
					tables.push(`atomic_${dataProfile}_vectors`);
				}
			}
		}

		return tables;
	};

	// ---------------------------------------------------------------------
	// healthCheck - Perform comprehensive database health verification
	
	const healthCheck = async () => {
		const traceId = Math.floor(Math.random() * 1e9);
		
		try {
			xLog.status('Database Health Check', 'title');
			xLog.status('====================');
			
			const healthReport = await databaseVerification.verifyDatabaseHealth();
			
			if (healthReport.error) {
				xLog.error(`Health check failed: ${healthReport.error}`);
				return { success: false, shouldExit: false };
			}
			
			// Display health status
			switch (healthReport.overall) {
				case 'healthy':
					xLog.status('✓ Database is healthy', 'success');
					break;
				case 'empty':
					xLog.status('⚠ Database is empty', 'warning');
					break;
				case 'issues_detected':
					xLog.status('⚠ Issues detected in database', 'warning');
					break;
				case 'error':
					xLog.status('✗ Database has errors', 'error');
					break;
				default:
					xLog.status(`Status: ${healthReport.overall}`);
			}
			
			xLog.status('');
			xLog.status('Vector Tables Health:');
			if (healthReport.checks.vectorTables.count === 0) {
				xLog.status('  No vector tables found');
			} else {
				xLog.status(`  Count: ${healthReport.checks.vectorTables.count}`);
				xLog.status(`  All Valid: ${healthReport.checks.vectorTables.allValid ? 'Yes' : 'No'}`);
				
				// Show invalid tables if any
				const invalidTables = healthReport.checks.vectorTables.tables.filter(t => !t.valid);
				if (invalidTables.length > 0) {
					xLog.status('  Invalid tables:');
					invalidTables.forEach(table => {
						xLog.status(`    - ${table.tableName}: ${table.error || 'Structure issues'}`);
					});
				}
			}
			
			xLog.status('');
			xLog.status('Source Tables Health:');
			if (healthReport.checks.sourceTables.count === 0) {
				xLog.status('  No source tables found');
			} else {
				xLog.status(`  Count: ${healthReport.checks.sourceTables.count}`);
				xLog.status(`  All Valid: ${healthReport.checks.sourceTables.allValid ? 'Yes' : 'No'}`);
			}
			
			// Show vector extension status
			xLog.status('');
			if (healthReport.checks.vectorExtension.available) {
				xLog.status(`Vector Extension: ${healthReport.checks.vectorExtension.message}`, 'success');
			} else {
				xLog.status(`Vector Extension: ${healthReport.checks.vectorExtension.message}`, 'warning');
			}
			
			return { 
				success: true, 
				shouldExit: false,
				healthReport
			};
			
		} catch (error) {
			xLog.error(`[${traceId}] Health check failed: ${error.message}`);
			return { success: false, shouldExit: false };
		}
	};

	// =====================================================================
	// PUBLIC INTERFACE
	// =====================================================================
	
	return {
		displayComprehensiveDatabaseStatistics,
		dropVectorTablesWithConfirmation,
		createDatabase,
		healthCheck,
		// Expose utility modules for advanced use
		utilities: {
			tableDropUtilities,
			databaseVerification
		}
	};
};

module.exports = moduleFunction;