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

// Note: commandLineParameters will be set by qtools-ai-framework below
const generateEmbeddings = require('./lib/generate-embeddings');
const getClosestRecords = require('./lib/get-closest-records');
const { dropAllVectorTables, dropProductionVectorTables } = require('./lib/drop-all-vector-tables');
const { showDatabaseStats } = require('./lib/show-database-stats');
const { getProfileConfiguration, logConfigurationStatus } = require('./lib/vector-config-handler');
const { 
	initVectorDatabase, 
	getTableCount, 
	tableExists 
} = require('./lib/vector-database-operations');
const vectorRebuildWorkflow = require('./lib/vector-rebuild-workflow')();
const { executeRebuildWorkflow } = vectorRebuildWorkflow();

// =============================================================================
// MODULE IMPORTS

//HACKERY: from some reason, putting require('generate-embeddings') AFTER this causes sqlite to screw up

// process.global.configPath=process.env.udgConfigPath; // unused, jina finds the config on its own, see node_modules/qtools-ai-thought-processor/...figure-out-config-path.js
const initAtp = require('../../../lib/qtools-ai-framework/jina')({
	configFileBaseName: moduleName,
	applicationBasePath,
	applicationControls: [
		'-writeVectorDatabase',
		'-newDatabase',
		'-dropTable',
		'-showStats',
		'-rebuildDatabase',
		'-yesAll',
		'-verbose',
		'--queryString',
		'--offset',
		'--limit',
		'--resultCount',
		'--targetTableName',
		'--dataProfile',
	],
}); // SIDE EFFECTS: Initializes xLog and getConfig in process.global


//START OF moduleFunction() ============================================================
const moduleFunction =
	({ moduleName } = {}) =>
	({ unused }) => {
		const { xLog, getConfig, rawConfig, commandLineParameters } =
			process.global;
		
		// Get and validate configuration using the new config handler
		const config = getProfileConfiguration(moduleName);
		if (!config.isValid) {
			return {};
		}
		
		// Extract configuration values
		const {
			dataProfile,
			databaseFilePath,
			openAiApiKey,
			sourceTableName,
			sourcePrivateKeyName,
			sourceEmbeddableContentName,
			vectorTableName
		} = config;
		
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

		// Show configuration status messages
		logConfigurationStatus(config);

		// Initialize database with error handling
		let vectorDb;
		try {
			vectorDb = initVectorDatabase(
				databaseFilePath,
				vectorTableName,
				xLog,
			);
			xLog.verbose('Vector database initialized successfully');
		} catch (error) {
			xLog.error(`Failed to initialize vector database: ${error.message}`);
			xLog.error('Stack trace:', error.stack);
			return {};
		}

		// Show database stats if requested
		if (commandLineParameters.switches.showStats) {
			showDatabaseStats(vectorDb, xLog);
			return {}; // Exit after showing stats
		}


		// Handle -dropTable independently - SAFELY now only drops specified vector table
		if (commandLineParameters.switches.dropTable) {
			xLog.status(
				`Safely dropping ${dataProfile.toUpperCase()} vector table "${vectorTableName}" only...`,
			);
			xLog.status(
				`IMPORTANT: This will NOT affect other profile tables or database tables`,
			);


			try {
				// Use enhanced drop function with safety checks
				const dropResult = dropAllVectorTables(vectorDb, xLog, vectorTableName, { 
					skipConfirmation: true // CLI operation - user already confirmed with -dropTable
				});
				
				if (dropResult.success) {
					xLog.status(`Drop operation completed: ${dropResult.droppedCount} tables dropped`);
				} else {
					xLog.error(`Drop operation failed: ${dropResult.error}`);
					if (dropResult.errors && dropResult.errors.length > 0) {
						dropResult.errors.forEach(err => {
							xLog.error(`  - ${err.table}: ${err.error}`);
						});
					}
				}
			} catch (error) {
				xLog.error(`Failed to drop tables: ${error.message}`);
				xLog.error('Stack trace:', error.stack);
			}

			// Show the empty state after dropping tables
			try {
				xLog.status('Database state after dropping tables:');
				showDatabaseStats(vectorDb, xLog);
			} catch (error) {
				xLog.error(`Failed to show database stats: ${error.message}`);
			}

			// Only exit if we're not also writing to the database
			if (!commandLineParameters.switches.writeVectorDatabase) {
				return {}; // Exit after dropping tables
			}
		}




		// Handle -rebuildDatabase - Complete rebuild workflow with backup and verification
		if (commandLineParameters.switches.rebuildDatabase) {
			// Prepare configuration object
			const config = {
				dataProfile,
				sourceTableName,
				sourcePrivateKeyName,
				sourceEmbeddableContentName,
				vectorTableName
			};
			
			// Prepare database operations
			const dbOperations = {
				tableExists,
				getTableCount
			};
			
			// Prepare drop operations
			const dropOperations = {
				dropProductionVectorTables,
				dropAllVectorTables
			};
			
			// Execute rebuild workflow
			executeRebuildWorkflow(
				config,
				vectorDb,
				openai,
				xLog,
				generateEmbeddings,
				dbOperations,
				dropOperations,
				commandLineParameters,
				(err) => {
					if (err) {
						xLog.error(`Rebuild failed: ${err.message}`);
					}
					// Continue to other operations or exit
				}
			);
			
			return {}; // Exit after starting the rebuild pipeline
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
			}).workingFunction(
				{
					sourceTableName,
					vectorTableName,
					sourcePrivateKeyName,
					sourceEmbeddableContentName,
					dataProfile, // Pass the dataProfile for strategy selection
				},
				commandLineParameters.values.queryString.qtLast(),
			);
		}

		return {};
	};

//END OF moduleFunction() ============================================================


module.exports = moduleFunction({ moduleName })({}); //runs it right now
//module.exports = moduleFunction({config, commandLineParameters, moduleName})();
