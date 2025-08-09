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

		// Log drop table parameters
		const dropParams = {
			dataProfile,
			vectorTableName,
			operation: 'dropTable',
			databasePath: vectorDb.name || 'in-memory',
			switches: switches || {}
		};
		
		xLog.saveProcessFile(`${moduleName}_promptList.log`, `Drop Table Operation:\n${JSON.stringify(dropParams, null, 2)}`, {append:true});

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
					dryRun: false,
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

		// Log drop table results
		const dropResults = {
			success: true,
			dataProfile,
			vectorTableName,
			operation: 'dropTable',
			completed: true
		};
		
		xLog.saveProcessFile(`${moduleName}_responseList.log`, `Drop Table Results:\n${JSON.stringify(dropResults, null, 2)}`, {append:true});

		return { success: true };
	};

	// ---------------------------------------------------------------------
	// initializeDatabase - initializes vector database with error handling
	
	const initializeDatabase = ({databaseFilePath, vectorTableName}) => {

		// Log initialization parameters
		const initParams = {
			databaseFilePath,
			vectorTableName,
			operation: 'initializeDatabase'
		};
		
		xLog.saveProcessFile(`${moduleName}_promptList.log`, `Database Initialization:\n${JSON.stringify(initParams, null, 2)}`, {append:true});

		try {
			const vectorDb = initVectorDatabase(
				databaseFilePath,
				vectorTableName,
			);
			
			xLog.verbose(`Using ${databaseFilePath}`);
			
			// Log initialization results
			const initResults = {
				success: true,
				databaseFilePath,
				vectorTableName,
				databaseName: vectorDb.name || 'in-memory',
				operation: 'initializeDatabase'
			};
			
			xLog.saveProcessFile(`${moduleName}_responseList.log`, `Database Initialization Results:\n${JSON.stringify(initResults, null, 2)}`, {append:true});
			
			return vectorDb;
		} catch (error) {
			xLog.error(`Failed to initialize vector database: ${error.message}`);
			xLog.error('Stack trace:', error.stack);
			throw error;
		}
	};

	// ---------------------------------------------------------------------
	// showStats - wrapper for showDatabaseStats with logging
	
	const showStats = (config, vectorDb, semanticAnalyzer) => {
		const { dataProfile, vectorTableName } = config;
		
		// Log show stats parameters
		const statsParams = {
			dataProfile,
			vectorTableName,
			operation: 'showStats',
			databasePath: vectorDb.name || 'in-memory'
		};
		
		xLog.saveProcessFile(`${moduleName}_promptList.log`, `Show Database Stats:\n${JSON.stringify(statsParams, null, 2)}`, {append:true});
		
		try {
			// Call the actual showDatabaseStats function
			const result = showDatabaseStats(vectorDb);
			
			// Log stats results
			const statsResults = {
				success: true,
				dataProfile,
				vectorTableName,
				operation: 'showStats',
				completed: true
			};
			
			xLog.saveProcessFile(`${moduleName}_responseList.log`, `Show Database Stats Results:\n${JSON.stringify(statsResults, null, 2)}`, {append:true});
			
			return { success: true, shouldExit: false };
		} catch (error) {
			xLog.error(`Failed to show database stats: ${error.message}`);
			return { success: false, shouldExit: false };
		}
	};

	// ---------------------------------------------------------------------
	// dropTable - wrapper for validateAndExecuteDropTable with better naming
	
	const dropTable = (config, vectorDb, semanticAnalyzer) => {
		return validateAndExecuteDropTable(config, vectorDb, {});
	};

	return { 
		initializeDatabase,
		validateAndExecuteDropTable,
		dropAllVectorTables,
		dropProductionVectorTables,
		showDatabaseStats,
		showStats,
		dropTable,
		getTableCount,
		tableExists,
		initVectorDatabase
	};
};

//END OF moduleFunction() ============================================================


module.exports = moduleFunction({ moduleName });

