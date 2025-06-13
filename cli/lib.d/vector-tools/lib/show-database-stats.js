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
			// Show SQLite and vec versions
			try {
				const { sqlite_version, vec_version } = db
					.prepare('select sqlite_version() as sqlite_version, vec_version() as vec_version;')
					.get();
				xLog.result(`SQLite version: ${sqlite_version}, vec extension version: ${vec_version}`);
			} catch (error) {
				xLog.error(`Error getting version info: ${error.message}`);
			}
			
			// Get list of all tables
			const allTables = db
				.prepare(`SELECT name, type FROM sqlite_master WHERE type='table' ORDER BY name`)
				.all();
			
			xLog.result(`Database contains ${allTables.length} tables total`);
			
			// Find vector tables specifically
			const vecTables = allTables.filter(table => 
				db.prepare(`SELECT sql FROM sqlite_master WHERE name = ?`).get(table.name)?.sql?.includes('USING vec0')
			);
			
			xLog.result(`Vector tables (${vecTables.length}):`);
			
			// For each vector table, show stats
			vecTables.forEach(table => {
				try {
					const count = db.prepare(`SELECT COUNT(*) as count FROM "${table.name}"`).get().count;
					xLog.result(`- ${table.name}: ${count} records`);
					
					// Show sample IDs if there are records
					if (count > 0) {
						const sampleIds = db.prepare(`SELECT rowid FROM "${table.name}" LIMIT 5`).all();
						xLog.result(`  Sample rowids: ${sampleIds.map(r => r.rowid).join(', ')}${count > 5 ? '...' : ''}`);
					}
				} catch (error) {
					xLog.error(`Error getting stats for ${table.name}: ${error.message}`);
				}
			});
			
			// Show info about non-vector tables too
			const regularTables = allTables.filter(table => !vecTables.includes(table));
			if (regularTables.length > 0) {
				xLog.result(`\nRegular tables (${regularTables.length}):`);
				regularTables.forEach(table => {
					try {
						const count = db.prepare(`SELECT COUNT(*) as count FROM "${table.name}"`).get().count;
						xLog.result(`- ${table.name}: ${count} records`);
					} catch (error) {
						xLog.error(`Error getting stats for ${table.name}: ${error.message}`);
					}
				});
			}
		};

		return { showDatabaseStats };
	};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction({ moduleName })({}); //runs it right now