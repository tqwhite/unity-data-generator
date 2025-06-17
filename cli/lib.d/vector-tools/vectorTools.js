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
const userInteractionHandler = require('./lib/user-interaction-handler')();
const { dispatchCommands } = userInteractionHandler();
const applicationInitializer = require('./lib/application-initializer')();
const { safeInitializeApplication } = applicationInitializer();

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
		
		// =====================================================================
		// MAIN APPLICATION EXECUTION PIPELINE
		// =====================================================================
		
		// 1. Get and validate configuration
		const config = getProfileConfiguration(moduleName);
		if (!config.isValid) {
			return {};
		}
		
		// 2. Prepare modules for application initializer
		const modules = {
			generateEmbeddings,
			getClosestRecords,
			dropAllVectorTables,
			dropProductionVectorTables,
			showDatabaseStats,
			executeRebuildWorkflow,
			tableExists,
			getTableCount,
			initVectorDatabase,
			logConfigurationStatus
		};
		
		// 3. Initialize application components (OpenAI, database, dependencies)
		const initResult = safeInitializeApplication(config, modules, xLog);
		if (!initResult.success) {
			xLog.error(`Application initialization failed: ${initResult.error}`);
			return {};
		}
		
		// 4. Extract initialized components
		const { openai, vectorDb, dependencies } = initResult;
		
		// 5. Dispatch and execute commands
		const commandResult = dispatchCommands(
			config,
			vectorDb,
			openai,
			xLog,
			commandLineParameters,
			dependencies
		);
		
		// 6. Handle execution result
		if (!commandResult.success) {
			xLog.error('Command execution failed');
			return {};
		}
		
		if (commandResult.shouldExit) {
			return {};
		}

		return {};
	};

//END OF moduleFunction() ============================================================


module.exports = moduleFunction({ moduleName })({}); //runs it right now
//module.exports = moduleFunction({config, commandLineParameters, moduleName})();
