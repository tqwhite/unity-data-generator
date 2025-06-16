#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

const qt = require('qtools-functional-library'); //also exposes qtLog(); qt.help({printOutput:true, queryString:'.*', sendJson:false});

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
		
		// Function to show database statistics
		const showDatabaseStats = (db, xLog) => {
			try {
			// Show SQLite and vec versions
			const sqlite_version = db.prepare('select sqlite_version() as version').get().version;
			const vec_version = db.prepare('select vec_version() as version').get().version;
			
			// Get list of all tables
			const allTables = db
				.prepare(`SELECT name, type FROM sqlite_master WHERE type='table' ORDER BY name`)
				.all();
			
			// Find vector tables specifically
			const vecTables = allTables.filter(table => {
				try {
					const tableInfo = db.prepare(`SELECT sql FROM sqlite_master WHERE name = ?`).get(table.name);
					return tableInfo?.sql?.includes('USING vec0') || false;
				} catch (error) {
					return false;
				}
			});
			
			// Build vector tables section
			let vectorTablesSection = '';
			if (vecTables.length === 0) {
				vectorTablesSection = 'No vector tables found';
			} else {
				vecTables.forEach(table => {
					try {
						const count = db.prepare(`SELECT COUNT(*) as count FROM "${table.name}"`).get().count;
						const status = count > 0 ? 'READY' : 'EMPTY';
						const paddedName = table.name.padEnd(25);
						const paddedCount = count.toLocaleString().padStart(8);
						vectorTablesSection += `${status.padEnd(6)} ${paddedName} ${paddedCount} records\n`;
					} catch (error) {
						vectorTablesSection += `ERROR  ${table.name.padEnd(25)} (failed to query)\n`;
					}
				});
			}
			
			// Calculate summary stats
			const totalVecRecords = vecTables.reduce((sum, table) => {
				try {
					return sum + db.prepare(`SELECT COUNT(*) as count FROM "${table.name}"`).get().count;
				} catch (error) {
					return sum;
				}
			}, 0);
			
			const regularTables = allTables.filter(table => !vecTables.includes(table));
			const totalRegularRecords = regularTables.reduce((sum, table) => {
				try {
					return sum + db.prepare(`SELECT COUNT(*) as count FROM "${table.name}"`).get().count;
				} catch (error) {
					return sum;
				}
			}, 0);
			
			// Build top tables section
			let topTablesSection = '';
			if (regularTables.length > 0) {
				const tablesWithCounts = regularTables.map(table => {
					try {
						const count = db.prepare(`SELECT COUNT(*) as count FROM "${table.name}"`).get().count;
						return { name: table.name, count };
					} catch (error) {
						return { name: table.name, count: 0 };
					}
				}).sort((a, b) => b.count - a.count);
				
				tablesWithCounts.slice(0, 10).forEach(table => {
					const paddedName = table.name.padEnd(30);
					const paddedCount = table.count.toLocaleString().padStart(8);
					topTablesSection += `${paddedName} ${paddedCount} records\n`;
				});
				
				if (regularTables.length > 10) {
					topTablesSection += `... and ${regularTables.length - 10} more tables\n`;
				}
			}
			
			// Assemble complete report
			const report = `
================================================================
                    DATABASE STATISTICS
================================================================
SQLite: ${sqlite_version} | Vec Extension: ${vec_version}

--- VECTOR TABLES ---
${vectorTablesSection}
--- SUMMARY ---
Vector Tables:  ${vecTables.length.toString().padStart(2)} (${totalVecRecords.toLocaleString().padStart(8)} records)
Regular Tables: ${regularTables.length.toString().padStart(2)} (${totalRegularRecords.toLocaleString().padStart(8)} records)
Total Tables:   ${allTables.length.toString().padStart(2)} (${(totalVecRecords + totalRegularRecords).toLocaleString().padStart(8)} records)

--- TOP REGULAR TABLES BY RECORD COUNT ---
${topTablesSection}================================================================`;

			xLog.result(report);
			
			} catch (error) {
				xLog.error(`Error in showDatabaseStats: ${error.message}`);
				xLog.error(`Stack: ${error.stack}`);
			}
		};

		return { showDatabaseStats };
	};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction({ moduleName })({}); //runs it right now