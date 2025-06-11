#!/usr/bin/env node
'use strict';

// Suppress punycode deprecation warning
process.noDeprecation = true;

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

const commandLineParser = require('qtools-parse-command-line');
const commandLineParameters = commandLineParser.getParameters({
	applicationControls: ['-writeVectorDatabase', '-newDatabase', '-dropTable', '-showStats', '--offset', '--limit', '--resultCount'],
});
const generateEmbeddings = require('./lib/generate-embeddings');
const getClosestRecords = require('./lib/get-closest-records');

// =============================================================================
// MODULE IMPORTS

//HACKERY: from some reason, putting require('generate-embeddings') AFTER this causes sqlite to screw up

// process.global.configPath=process.env.udgConfigPath; // unused, jina finds the config on its own, see node_modules/qtools-ai-thought-processor/...figure-out-config-path.js
const initAtp = require('../../../lib/qtools-ai-framework/jina')({
	configFileBaseName: moduleName,
	applicationBasePath,
	applicationControls: ['-writeVectorDatabase', '-newDatabase', '-dropTable', '-showStats', '--queryString', '--offset', '--limit', '--resultCount'],
}); // SIDE EFFECTS: Initializes xLog and getConfig in process.global


const initVectorDatabase = (databaseFilePath, vectorTableName, xLog) => {
	const sqliteVec = require('sqlite-vec');
	const db = require('better-sqlite3')(databaseFilePath, {});
	sqliteVec.load(db);
	return db;
};

// Function to drop SIF vector tables (safely)
const dropAllVectorTables = (db, xLog, specifiedVectorTableName) => {
	// CRITICAL SAFETY CHECK: Only drop tables matching our specific vector table name
	// This prevents accidental deletion of other tables like CEDS tables
	if (!specifiedVectorTableName) {
		xLog.error("ERROR: No vector table name specified. Cannot safely drop tables.");
		return;
	}
	
	xLog.status(`Will only drop tables matching the pattern: ${specifiedVectorTableName}`);
	
	// Find only the specific SIF vector tables
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
			// Double check the name for extra safety
			if (name === specifiedVectorTableName) {
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
			} else {
				xLog.status(`Skipping table "${name}" as it doesn't exactly match "${specifiedVectorTableName}"`);
			}
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

//START OF moduleFunction() ============================================================
const moduleFunction =
	({ moduleName } = {}) =>
	({ unused }) => {
		const { xLog, getConfig, rawConfig, commandLineParameters } =
			process.global;
		const { databaseFilePath, openAiApiKey } = getConfig(moduleName); //moduleName is closure

		const initOpenAi = () => {
			const OpenAI = require('openai');
			const openai = new OpenAI({
				apiKey: openAiApiKey,
			});
			return openai;
		};

		// ================================================================================
		const openai = initOpenAi();

		// ================================================================================
		
		const sourceTableName = 'naDataModel';
		const vectorTableName = 'sifElementVectors';
		const sourcePrivateKeyName = 'refId';
		const sourceEmbeddableContentName = ['Description', 'XPath'];
		
		const vectorDb = initVectorDatabase(
			databaseFilePath,
			vectorTableName,
			xLog,
		); // showVecVersion(db);
		
		// Show database stats if requested
		if (commandLineParameters.switches.showStats) {
			xLog.status('Showing database statistics...');
			showDatabaseStats(vectorDb, xLog);
			return {}; // Exit after showing stats
		}
		
		// Handle -dropTable independently - SAFELY now only drops specified SIF vector table
		if (commandLineParameters.switches.dropTable) {
			xLog.status(`Safely dropping SIF vector table "${vectorTableName}" only...`);
			xLog.status(`IMPORTANT: This will NOT affect CEDS tables or other database tables`);
			
			// Pass the specific vector table name to ensure we only drop SIF tables
			dropAllVectorTables(vectorDb, xLog, vectorTableName);
			
			// Show the empty state after dropping tables
			xLog.status('Database state after dropping tables:');
			showDatabaseStats(vectorDb, xLog);
			
			// Only exit if we're not also writing to the database
			if (!commandLineParameters.switches.writeVectorDatabase) {
				return {}; // Exit after dropping tables
			}
		}
		
		if (commandLineParameters.switches.writeVectorDatabase) {
			generateEmbeddings({
				openai,
				vectorDb,
			}).workingFunction({
				sourceTableName,
				vectorTableName,
				sourcePrivateKeyName,
				sourceEmbeddableContentName,
			});
		}
		
		if (commandLineParameters.values.queryString) {
			getClosestRecords({
				openai,
				vectorDb,
			}).workingFunction({
				sourceTableName,
				vectorTableName,
				sourcePrivateKeyName,
				sourceEmbeddableContentName,
			},
			commandLineParameters.values.queryString.qtLast(),
				
			);
		}

		return {};
	};

//END OF moduleFunction() ============================================================


module.exports = moduleFunction({ moduleName })({}); //runs it right now
//module.exports = moduleFunction({config, commandLineParameters, moduleName})();