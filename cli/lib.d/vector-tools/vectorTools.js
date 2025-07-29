#!/usr/bin/env node
'use strict';

// Suppress punycode deprecation warning
process.noDeprecation = true;

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

const qt = require('qtools-functional-library'); //also exposes qtLog(); qt.help({printOutput:true, queryString:'.*', sendJson:false});

const os = require('os');
const path = require('path');
const fs = require('fs');

// =====================================================================
// PROJECT ROOT CONFIGURATION
// =====================================================================

// ---------------------------------------------------------------------
// findProjectRoot - locates the project root directory by searching for rootFolderName

const findProjectRoot = ({ rootFolderName = 'system', closest = true } = {}) =>
	__dirname.replace(
		new RegExp(`^(.*${closest ? '' : '?'}\/${rootFolderName}).*$`),
		'$1',
	);
const applicationBasePath = findProjectRoot(); // call with {closest:false} if there are nested rootFolderName directories and you want the top level one

// =====================================================================
// INITIALIZE QTOOLS-AI-FRAMEWORK FIRST
// =====================================================================

// ---------------------------------------------------------------------
// helpText - application-specific help integration

const helpText = require('./lib/help-text');

// CRITICAL: This must happen before requiring any modules that access process.global
// process.global.configPath=process.env.udgConfigPath; // unused, jina finds the config on its own, see node_modules/qtools-ai-thought-processor/...figure-out-config-path.js
const initAtp = require('../../../lib/qtools-ai-framework/jina')({
	configFileBaseName: moduleName,
	applicationBasePath,
	helpText,
	applicationControls: [
		'-writeVectorDatabase',
		'-newDatabase',
		'-dropTable',
		'-showStats',
		'-rebuildDatabase',
		'-resume',
		'-showProgress',
		'-purgeProgressTable',
		'-yesAll',
		'-verbose',
		'--queryString',
		'--offset',
		'--limit',
		'--resultCount',
		'--targetTableName',
		'--dataProfile',
		'--semanticAnalysisMode',
		'--batchId',
		'-json'
	],
}); // SIDE EFFECTS: Initializes xLog and getConfig in process.global

// =====================================================================
// MODULE IMPORTS (AFTER JINA INITIALIZATION)
// =====================================================================

//HACKERY: from some reason, putting require('generate-embeddings') AFTER this causes sqlite to screw up
// Note: commandLineParameters will be set by qtools-ai-framework above
const { loadSemanticAnalyzer } = require('./lib/semanticAnalyzers/semantic-analyzer-loader');
const { dropAllVectorTables, dropProductionVectorTables } = require('./lib/drop-all-vector-tables');
const { showDatabaseStats } = require('./lib/show-database-stats');
const vectorConfigHandler = require('./lib/vector-config-handler');
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


// ---------------------------------------------------------------------
// moduleFunction - main application entry point and execution pipeline

const moduleFunction =
	({ moduleName } = {}) =>
	async ({ unused }) => {
		const { xLog, getConfig, rawConfig, commandLineParameters } =
			process.global;
		
		// =====================================================================
		// MAIN APPLICATION EXECUTION PIPELINE
		// =====================================================================
		
		// ---------------------------------------------------------------------
		// 1. Get and validate configuration
		
		const { getProfileConfiguration, logConfigurationStatus } = vectorConfigHandler({});
		const config = getProfileConfiguration(moduleName);
		if (!config.isValid) {
			return {};
		}

		// ---------------------------------------------------------------------
		// 1.5. Load semantic analyzer
		const semanticAnalysisMode = commandLineParameters.qtGetSurePath('values.semanticAnalysisMode[0]', 'simpleVector');
		const semanticAnalyzer = loadSemanticAnalyzer(semanticAnalysisMode);
		xLog.status(`Using ${semanticAnalysisMode} semantic analyzer`);
		
		// ---------------------------------------------------------------------
		// 2. Prepare modules for application initializer
		const progressTracker = require('./lib/progress-tracker')();
		const modules = {
			semanticAnalyzer,
			dropAllVectorTables,
			dropProductionVectorTables,
			showDatabaseStats,
			executeRebuildWorkflow,
			tableExists,
			getTableCount,
			initVectorDatabase,
			logConfigurationStatus,
			progressTracker
		};
		
		// ---------------------------------------------------------------------
		// 3. Initialize application components (OpenAI, database, dependencies)
		const initResult = safeInitializeApplication(config, modules, xLog);
		if (!initResult.success) {
			xLog.error(`Application initialization failed: ${initResult.error}`);
			return {};
		}
		
		// ---------------------------------------------------------------------
		// 4. Extract initialized components
		const { openai, vectorDb, dependencies } = initResult;
		
		// ---------------------------------------------------------------------
		// 5. Dispatch and execute commands
		const commandResult = await dispatchCommands(
			config,
			vectorDb,
			openai,
			xLog,
			commandLineParameters,
			dependencies
		);
		
		// ---------------------------------------------------------------------
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
