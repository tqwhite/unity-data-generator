#!/usr/bin/env node
'use strict';

process.noDeprecation = true;

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const qt = require('qtools-functional-library');
const os = require('os');
const path = require('path');
const fs = require('fs');

// Initialize xLog in process.global before anything else
const xLog = require('qtools-x-log');

// Generate numbered directory for this run
const generateNumberedDirectory = () => {
	const parentDir = `/tmp/${moduleName}`;
	let runNumber = 0;
	
	// Create parent directory if it doesn't exist
	if (!fs.existsSync(parentDir)) {
		fs.mkdirSync(parentDir, { recursive: true });
	}
	
	// Find the highest existing run number in the parent directory
	const dirs = fs.readdirSync(parentDir).filter(dir => 
		dir.startsWith('vtLog_') && /^\d{4}$/.test(dir.slice('vtLog_'.length))
	);
	
	if (dirs.length > 0) {
		const numbers = dirs.map(dir => parseInt(dir.slice('vtLog_'.length)));
		runNumber = Math.max(...numbers) + 1;
	}
	
	// Format with leading zeros (4 digits)
	const paddedNumber = String(runNumber).padStart(4, '0');
	const numberedDir = path.join(parentDir, `vtLog_${paddedNumber}`);
	
	// Create the numbered directory
	if (!fs.existsSync(numberedDir)) {
		fs.mkdirSync(numberedDir, { recursive: true });
	}
	
	return numberedDir;
};

const processFileDirectory = generateNumberedDirectory();
xLog.setProcessFilesDirectory(processFileDirectory);

// Log the calling command with all arguments
xLog.saveProcessFile('callingCommand.log', {
	command: process.argv[0],
	script: process.argv[1],
	arguments: process.argv.slice(2),
	fullCommand: process.argv.join(' '),
	timestamp: new Date().toISOString()
}, { saveAsJson: true });

if (!process.global) {
	process.global = {};
}
process.global.xLog = xLog;

// =====================================================================
// GLOBAL ERROR HANDLERS
// =====================================================================

// Catch uncaught exceptions
process.on('uncaughtException', (error) => {
	xLog.error(`UNCAUGHT EXCEPTION: ${error.message}`);
	xLog.error(`Stack: ${error.stack}`);
	process.exit(1);
});

// Catch unhandled promise rejections  
process.on('unhandledRejection', (reason, promise) => {
	xLog.error(`UNHANDLED REJECTION at: ${promise}`);
	xLog.error(`Reason: ${reason}`);
	if (reason && reason.stack) {
		xLog.error(`Stack: ${reason.stack}`);
	}
	process.exit(1);
});

// =====================================================================
// PROJECT ROOT FINDER
// =====================================================================

const findProjectRoot = ({ rootFolderName = 'system', closest = true } = {}) =>
	__dirname.replace(
		new RegExp(`^(.*${closest ? '' : '?'}\/${rootFolderName}).*$`),
		'$1',
	);

const applicationBasePath = findProjectRoot();

// =====================================================================
// HELP TEXT
// =====================================================================

const helpText = require('./lib/help/help-text')();

// =====================================================================
// MODULE IMPORTS - Delayed until after configuration
// =====================================================================
// These will be imported after configuration is initialized

// =====================================================================
// APPLICATION INITIALIZATION FUNCTION
// =====================================================================

const initializeApplication = async () => {
	const { xLog, getConfig, rawConfig, commandLineParameters } = process.global;

	// Import modules after configuration is available
	const DirectQueryUtility = require('./lib/database/direct-query-utility/direct-query-utility');
	const applicationInitializer = require('./lib/application-initializer/application-initializer');
	const operationRouter = require('./lib/operation-router/operation-router');
	const semanticAnalyzerRegistry = require('./lib/semantic-analyzers/semantic-analyzer-registry');
	const progressTracker = require('./lib/progress-tracker/progress-tracker');

	// Get module configuration
	const baseConfig = getConfig(moduleName);
	
	// Initialize OpenAI if API key is available
	const apiKey = baseConfig.qtGetSurePath('openAiApiKey') || baseConfig.qtGetSurePath('apiKey');
	if (apiKey) {
		const OpenAI = require('openai');
		process.global.openai = new OpenAI({ apiKey });
		xLog.verbose('OpenAI initialized successfully');
	} else {
		xLog.warn('OpenAI API key not found - vector operations will not be available');
	}
	
	// Validate required configuration
	if (!baseConfig.databaseFilePath) {
		xLog.error('Missing required configuration: databaseFilePath');
		process.exit(1);
	}
	
	// Assemble configuration with dataProfile and other settings
	const appInitializer = applicationInitializer();
	const config = appInitializer.assembleConfiguration(baseConfig);

	// ---------------------------------------------------------------------
	// Initialize database layer
	
	const dbUtility = new DirectQueryUtility({ 
		databasePath: config.databaseFilePath 
	});
	
	// ---------------------------------------------------------------------
	// Initialize progress tracker (optionally add to global)
	
	const progressService = progressTracker({ dbUtility });
	
	// Consider adding to process.global per TQ's approval
	// process.global.progressTracker = progressService;
	// Object.freeze(process.global);
	
	// ---------------------------------------------------------------------
	// Initialize semantic analyzer registry
	
	const analyzerRegistry = semanticAnalyzerRegistry({ 
		commandLineParameters 
	});
	
	// ---------------------------------------------------------------------
	// Initialize application services
	
	const appServices = {
		dbUtility,
		progressTracker: progressService,
		analyzerRegistry,
		config
	};
	
	// ---------------------------------------------------------------------
	// Route to appropriate operation
	
	try {
		const result = await operationRouter.routeToVectorOperation({
			commandLineParameters,
			services: appServices
		});
		
		// Handle result based on operation
		if (result && result.shouldExit) {
			process.exit(result.exitCode || 0);
		}
		
	} catch (error) {
		const traceId = error.traceId || Math.floor(Math.random() * 1e9);
		xLog.error(`[${traceId}] Operation failed: ${error.message}`);
		xLog.error(`Stack trace: ${error.stack}`);
		process.exit(1);
	}
};

// =====================================================================
// FRAMEWORK INITIALIZATION
// =====================================================================

const assembleConfiguration = require('../../../lib/qtools-ai-framework/lib/assemble-configuration-show-help-maybe-exit/assemble-configuration-show-help-maybe-exit');

assembleConfiguration({
	configSegmentName: 'vectorTools2',
	configFileBaseName: 'vectorTools2', // Use vectorTools2.ini
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
		'--semanticAnalyzerVersion',
		'--batchId',
		'--query',
		'--whereClause',
		'--resultLimit',
		'-json',
		'--thoughtProcess',
	],
	callback: (err, configData) => {
		if (err) {
			console.error('Configuration initialization failed:', err);
			process.exit(1);
		}
		// Configuration is now available in process.global
		initializeApplication();
	}
});