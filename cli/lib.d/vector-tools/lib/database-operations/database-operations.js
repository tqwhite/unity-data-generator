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
	// validateAndExecuteDropTable - validates and executes table drop operations
	
	const validateAndExecuteDropTable = (config, vectorDb, switches) => {
		const { dataProfile, vectorTableName } = config;

		xLog.status(
			`Safely dropping ${dataProfile.toUpperCase()} vector table "${vectorTableName}" only...`,
		);
		xLog.status(
			'IMPORTANT: This will NOT affect other profile tables or database tables',
		);

		try {
			const dropResult = dropAllVectorTables(
				vectorDb,
				vectorTableName,
				{
					skipConfirmation: true,
				},
			);

			if (dropResult.success) {
				xLog.status(`✓ Drop operation completed successfully`);
				xLog.status(`  ${dropResult.droppedCount} tables processed`);
			} else {
				xLog.error(`✗ Drop operation failed: ${dropResult.error} [${moduleName}]`);
				process.exit(1);
			}
		} catch (error) {
			xLog.error(`Failed to drop tables: ${error.message} [${moduleName}]`);
			process.exit(1);
		}

		// Show the empty state after dropping tables
		try {
			xLog.status('Database state after dropping tables:');
			showDatabaseStats(vectorDb);
		} catch (error) {
			xLog.error(`Failed to show database stats: ${error.message} [${moduleName}]`);
			process.exit(1);
		}

		return { success: true };
	};

	// ---------------------------------------------------------------------
	// initializeDatabase - initializes vector database with error handling
	
	const initializeDatabase = ({databaseFilePath, vectorTableName}) => {

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
		validateAndExecuteDropTable,
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

