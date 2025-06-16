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
		
		// Function to drop vector tables (safely)
		const dropAllVectorTables = (db, xLog, specifiedVectorTableName) => {
			// CRITICAL SAFETY CHECK: Only drop tables matching our specific vector table name
			// This prevents accidental deletion of other tables like CEDS tables
			if (!specifiedVectorTableName) {
				xLog.error("ERROR: No vector table name specified. Cannot safely drop tables.");
				return;
			}
			
			xLog.status(`Will drop all tables matching the pattern: ${specifiedVectorTableName}*`);
			
			// Find ALL tables that start with the specified vector table name
			// This includes the main table and all sqlite-vec related tables (_chunks, _info, _rowids, etc.)
			const vecTables = db
				.prepare(`SELECT name FROM sqlite_master WHERE name LIKE ? AND type='table'`)
				.all(`${specifiedVectorTableName}%`);
			
			if (vecTables.length === 0) {
				xLog.status(`No vector tables found matching "${specifiedVectorTableName}*".`);
				return;
			}
			
			xLog.status(`Found ${vecTables.length} tables to drop:`);
			vecTables.forEach(({ name }) => {
				xLog.status(`  - ${name}`);
			});
			
			// Drop each matching table
			let count = 0;
			vecTables.forEach(({ name }) => {
				try {
					// Get count before dropping (if possible)
					let countBefore = 0;
					try {
						const countResult = db.prepare(`SELECT COUNT(*) as count FROM "${name}"`).get();
						countBefore = countResult.count;
					} catch (e) {
						// Ignore count errors for system tables
					}
					
					xLog.status(`Dropping table "${name}"${countBefore > 0 ? ` with ${countBefore} records` : ''}...`);
					db.exec(`DROP TABLE IF EXISTS "${name}"`);
					count++;
					xLog.status(`Successfully dropped vector table: "${name}"`);
				} catch (error) {
					xLog.error(`Failed to drop table "${name}": ${error.message}`);
					// Try alternative approach - just clear the data
					try {
						xLog.status(`Attempting to clear all data from table "${name}" instead...`);
						db.exec(`DELETE FROM "${name}"`);
						xLog.status(`Cleared all data from table "${name}" since drop failed`);
					} catch (innerError) {
						xLog.error(`Also failed to clear table "${name}": ${innerError.message}`);
					}
				}
			});
			
			// Final verification - check for any remaining tables with the pattern
			const remainingTables = db
				.prepare(`SELECT name FROM sqlite_master WHERE name LIKE ? AND type='table'`)
				.all(`${specifiedVectorTableName}%`);
				
			if (remainingTables.length === 0) {
				xLog.status(`Successfully removed all vector tables matching "${specifiedVectorTableName}*".`);
			} else {
				xLog.status(`WARNING: ${remainingTables.length} tables still remain:`);
				remainingTables.forEach(({ name }) => {
					xLog.status(`  - ${name}`);
				});
			}
		};

		return { dropAllVectorTables };
	};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction({ moduleName })({}); //runs it right now