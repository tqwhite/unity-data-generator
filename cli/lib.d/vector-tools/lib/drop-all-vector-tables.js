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
		
		// Function to drop SIF vector tables (safely)
		const dropAllVectorTables = (db, xLog, specifiedVectorTableName) => {
			// CRITICAL SAFETY CHECK: Only drop tables matching our specific vector table name
			// This prevents accidental deletion of other tables like CEDS tables
			if (!specifiedVectorTableName) {
				xLog.error("ERROR: No vector table name specified. Cannot safely drop tables.");
				return;
			}
			
			xLog.status(`Will only drop tables matching the pattern: ${specifiedVectorTableName}`);
			
			// Find only the specific vector tables
			const vecTables = db
				.prepare(`SELECT name FROM sqlite_master WHERE name = ? AND type='table' AND sql LIKE '%USING vec0%'`)
				.all(specifiedVectorTableName);
			
			if (vecTables.length === 0) {
				xLog.status(`No vector tables found matching "${specifiedVectorTableName}".`);
				return;
			}
			
			// Drop each matching table
			let count = 0;
			vecTables.forEach(({ name }) => {
				try {
					// Get count before dropping
					let countBefore = 0;
					try {
						const countResult = db.prepare(`SELECT COUNT(*) as count FROM "${name}"`).get();
						countBefore = countResult.count;
					} catch (e) {
						// Ignore count errors
					}
					
					xLog.status(`Dropping table "${name}" with ${countBefore} records...`);
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
			
			// Final verification
			const remainingTables = db
				.prepare(`SELECT name FROM sqlite_master WHERE name = ? AND type='table'`)
				.all(specifiedVectorTableName);
				
			if (remainingTables.length === 0) {
				xLog.status(`Successfully removed vector table "${specifiedVectorTableName}".`);
			} else {
				xLog.status(`WARNING: Table "${specifiedVectorTableName}" could not be completely removed.`);
			}
		};

		return { dropAllVectorTables };
	};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction({ moduleName })({}); //runs it right now