#!/usr/bin/env node
'use strict';
// Suppress punycode deprecation warning
process.noDeprecation = true;

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

const qt = require('qtools-functional-library'); //also exposes qtLog(); qt.help({printOutput:true, queryString:'.*', sendJson:false});

const os = require('os');
const path = require('path');
const fs = require('fs');


//START OF moduleFunction() ============================================================
const moduleFunction = ({ moduleName } = {}) => ({ unused }={}) => {
	const { xLog, getConfig, rawConfig, commandLineParameters, projectRoot } = process.global;
	const localConfig = getConfig(moduleName);
	
	// Import database modules
	const { dropAllVectorTables, dropProductionVectorTables } = require('./lib/drop-all-vector-tables');
	const { showDatabaseStats } = require('./lib/show-database-stats');
	const { getTableCount, tableExists } = require('./lib/vector-database-operations');
	const { initVectorDatabase } = require('./lib/init-vector-database');
	
	// ---------------------------------------------------------------------
	// initializeDatabase - initializes vector database with error handling
	
	const initializeDatabase = (databaseFilePath, vectorTableName) => {
		try {
			const vectorDb = initVectorDatabase(
				databaseFilePath,
				vectorTableName,
			);
			
			xLog.verbose(`Using ${databaseFilePath}`);
			return vectorDb;
		} catch (error) {
			xLog.error(`Failed to initialize vector database: ${error.message}`);
			xLog.error('Stack trace:', error.stack);
			throw error;
		}
	};

	return { 
		initializeDatabase,
		dropAllVectorTables,
		dropProductionVectorTables,
		showDatabaseStats,
		getTableCount,
		tableExists,
		initVectorDatabase
	};
};

//END OF moduleFunction() ============================================================


module.exports = moduleFunction({ moduleName });

