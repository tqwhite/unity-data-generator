#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const qt = require('qtools-functional-library');
const { getTableCount, tableExists, getVectorTables } = require('./vector-database-operations');

const os = require('os');
const path = require('path');
const fs = require('fs');

// --------------------------------------------------------------------------------
// FIND PROJECT ROOT
const findProjectRoot = ({ rootFolderName = 'system', closest = true } = {}) =>
	__dirname.replace(
		new RegExp(`^(.*${closest ? '' : '?'}\/${rootFolderName}).*$`),
		'$1',
	);
const applicationBasePath = findProjectRoot(); // call with {closest:false} if there are nested rootFolderName directories and you want the top level one

//START OF moduleFunction() ============================================================
const moduleFunction =
	({ moduleName } = {}) =>
	({ unused }) => {
		
		/**
		 * Safely drops vector tables with enhanced safety checks
		 * @param {Object} db - Database connection
		 * @param {Object} xLog - Logging object
		 * @param {string} specifiedVectorTableName - Base name of vector table to drop
		 * @param {Object} options - Additional options
		 * @param {boolean} options.dryRun - If true, only show what would be dropped
		 * @param {boolean} options.skipConfirmation - If true, skip safety prompts
		 * @param {string[]} options.excludePatterns - Patterns to exclude from dropping
		 * @returns {Object} Results of drop operation
		 */
		const dropAllVectorTables = (db, xLog, specifiedVectorTableName, options = {}) => {
			const { dryRun = false, skipConfirmation = false, excludePatterns = [] } = options;
			
			// CRITICAL SAFETY CHECK: Only drop tables matching our specific vector table name
			if (!specifiedVectorTableName) {
				xLog.error("ERROR: No vector table name specified. Cannot safely drop tables.");
				return { success: false, error: "No table name specified" };
			}
			
			// Additional safety check - prevent dropping critical system tables
			const protectedPatterns = ['sqlite_', 'CEDS_', '_CEDS', 'naDataModel', 'users'];
			const isProtected = protectedPatterns.some(pattern => 
				specifiedVectorTableName.toLowerCase().includes(pattern.toLowerCase())
			);
			
			if (isProtected) {
				xLog.error(`ERROR: Cannot drop protected table pattern: ${specifiedVectorTableName}`);
				return { success: false, error: "Protected table pattern" };
			}
			
			const searchPattern = `${specifiedVectorTableName}%`;
			xLog.status(`${dryRun ? 'Would drop' : 'Will drop'} all tables matching the pattern: ${searchPattern}`);
			
			// Find ALL tables that start with the specified vector table name
			const candidateTables = db
				.prepare(`SELECT name FROM sqlite_master WHERE name LIKE ? AND type='table'`)
				.all(searchPattern);
			
			// Apply exclusion patterns
			const filteredTables = candidateTables.filter(({ name }) => {
				return !excludePatterns.some(pattern => name.includes(pattern));
			});
			
			if (filteredTables.length === 0) {
				xLog.status(`No vector tables found matching "${searchPattern}".`);
				return { success: true, droppedCount: 0, tables: [] };
			}
			
			// Get table information before dropping
			const tableInfo = filteredTables.map(({ name }) => {
				const count = getTableCount(db, name);
				const isVector = getVectorTables(db).some(vt => vt.name === name);
				return { name, count, isVector };
			});
			
			const totalRecords = tableInfo.reduce((sum, table) => sum + table.count, 0);
			
			xLog.status(`Found ${filteredTables.length} tables to ${dryRun ? 'analyze' : 'drop'}:`);
			tableInfo.forEach(({ name, count, isVector }) => {
				const typeLabel = isVector ? '(vector)' : '(support)';
				xLog.status(`  - ${name} ${typeLabel}: ${count.toLocaleString()} records`);
			});
			
			if (totalRecords > 0) {
				xLog.status(`Total records to be ${dryRun ? 'affected' : 'deleted'}: ${totalRecords.toLocaleString()}`);
			}
			
			// Dry run - just return what would happen
			if (dryRun) {
				return { 
					success: true, 
					dryRun: true, 
					wouldDropCount: filteredTables.length,
					tables: tableInfo,
					totalRecords
				};
			}
			
			// Safety confirmation for large operations
			if (!skipConfirmation && (filteredTables.length > 5 || totalRecords > 1000)) {
				xLog.status('');
				xLog.status('⚠️  CAUTION: This will permanently delete significant data!');
				xLog.status('Use { skipConfirmation: true } option to bypass this check.');
				return { success: false, error: "User confirmation required" };
			}
			
			// Perform the actual dropping
			const results = {
				success: true,
				droppedCount: 0,
				failedCount: 0,
				tables: [],
				errors: []
			};
			
			for (const { name, count } of tableInfo) {
				try {
					xLog.status(`Dropping table "${name}"${count > 0 ? ` with ${count.toLocaleString()} records` : ''}...`);
					db.exec(`DROP TABLE IF EXISTS "${name}"`);
					results.droppedCount++;
					results.tables.push({ name, status: 'dropped', recordCount: count });
					xLog.status(`✓ Successfully dropped: "${name}"`);
				} catch (error) {
					xLog.error(`✗ Failed to drop table "${name}": ${error.message}`);
					results.failedCount++;
					results.errors.push({ table: name, error: error.message });
					
					// Try alternative approach - clear the data
					try {
						xLog.status(`Attempting to clear data from "${name}" instead...`);
						db.exec(`DELETE FROM "${name}"`);
						results.tables.push({ name, status: 'cleared', recordCount: count });
						xLog.status(`✓ Cleared data from: "${name}"`);
					} catch (innerError) {
						xLog.error(`✗ Also failed to clear "${name}": ${innerError.message}`);
						results.tables.push({ name, status: 'failed', recordCount: count });
						results.errors.push({ table: name, error: innerError.message });
					}
				}
			}
			
			// Final verification
			const remainingTables = db
				.prepare(`SELECT name FROM sqlite_master WHERE name LIKE ? AND type='table'`)
				.all(searchPattern);
			
			if (remainingTables.length === 0) {
				xLog.status(`✓ Successfully removed all tables matching "${searchPattern}"`);
			} else {
				xLog.status(`⚠️  WARNING: ${remainingTables.length} tables still remain:`);
				remainingTables.forEach(({ name }) => {
					xLog.status(`  - ${name}`);
				});
				results.success = false;
				results.remainingTables = remainingTables.map(t => t.name);
			}
			
			return results;
		};

		/**
		 * Safely drops only production vector tables (excludes _NEW tables)
		 * @param {Object} db - Database connection
		 * @param {Object} xLog - Logging object
		 * @param {string} specifiedVectorTableName - Base name of vector table
		 * @param {Object} options - Additional options
		 * @returns {Object} Results of drop operation
		 */
		const dropProductionVectorTables = (db, xLog, specifiedVectorTableName, options = {}) => {
			return dropAllVectorTables(db, xLog, specifiedVectorTableName, {
				...options,
				excludePatterns: ['_NEW', ...(options.excludePatterns || [])]
			});
		};

		return { dropAllVectorTables, dropProductionVectorTables };
	};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction({ moduleName })({}); //runs it right now