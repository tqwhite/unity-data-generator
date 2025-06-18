#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

// =====================================================================
// MODULE FUNCTION
// =====================================================================
// ---------------------------------------------------------------------
// moduleFunction - provides application initialization and setup functionality

const moduleFunction = function(
	{
		globalIdentifier = 'application-initializer',
		moduleName = globalIdentifier
	} = {}
) {
	return ({
		// Parameters will be passed when calling the functions
	} = {}) => {
		
		// =====================================================================
		// APPLICATION INITIALIZER
		// =====================================================================
		
		/**
		 * Application initialization and setup for vector tools CLI
		 * Handles OpenAI client setup, database initialization, and dependency preparation
		 */
		
		// ---------------------------------------------------------------------
		// initializeOpenAI - initializes OpenAI client with API key
		
		const initializeOpenAI = (openAiApiKey, xLog) => {
			try {
				const OpenAI = require('openai');
				const openai = new OpenAI({
					apiKey: openAiApiKey,
				});
				
				xLog.verbose('OpenAI client initialized successfully');
				return { success: true, client: openai };
			} catch (error) {
				xLog.error(`Failed to initialize OpenAI client: ${error.message}`);
				return { success: false, error: error.message };
			}
		};
		
		// ---------------------------------------------------------------------
		// initializeVectorDatabase - initializes vector database with error handling
		
		const initializeVectorDatabase = (databaseFilePath, vectorTableName, xLog, initVectorDatabase) => {
			try {
				const vectorDb = initVectorDatabase(
					databaseFilePath,
					vectorTableName,
					xLog,
				);
				
				xLog.verbose('Vector database initialized successfully');
				return { success: true, database: vectorDb };
			} catch (error) {
				xLog.error(`Failed to initialize vector database: ${error.message}`);
				xLog.error('Stack trace:', error.stack);
				return { success: false, error: error.message };
			}
		};
		
		// ---------------------------------------------------------------------
		// prepareDatabaseOperations - prepares database operations object
		
		const prepareDatabaseOperations = (tableExists, getTableCount) => {
			return {
				tableExists,
				getTableCount
			};
		};
		
		// ---------------------------------------------------------------------
		// prepareDropOperations - prepares drop operations object
		
		const prepareDropOperations = (dropProductionVectorTables, dropAllVectorTables) => {
			return {
				dropProductionVectorTables,
				dropAllVectorTables
			};
		};
		
		// ---------------------------------------------------------------------
		// prepareDependencies - prepares all dependencies for command dispatcher
		
		const prepareDependencies = (modules) => {
			const {
				generateEmbeddings,
				getClosestRecords,
				dropAllVectorTables,
				showDatabaseStats,
				executeRebuildWorkflow,
				tableExists,
				getTableCount,
				dropProductionVectorTables
			} = modules;
			
			return {
				generateEmbeddings,
				getClosestRecords,
				dropAllVectorTables,
				showDatabaseStats,
				dbOperations: prepareDatabaseOperations(tableExists, getTableCount),
				dropOperations: prepareDropOperations(dropProductionVectorTables, dropAllVectorTables),
				executeRebuildWorkflow
			};
		};
		
		// ---------------------------------------------------------------------
		// initializeApplication - complete application initialization sequence
		
		const initializeApplication = (config, modules, xLog) => {
			const {
				openAiApiKey,
				databaseFilePath,
				vectorTableName
			} = config;
			
			const {
				initVectorDatabase,
				logConfigurationStatus
			} = modules;
			
			// Show configuration status messages
			logConfigurationStatus(config);
			
			// Initialize OpenAI client
			const openaiResult = initializeOpenAI(openAiApiKey, xLog);
			if (!openaiResult.success) {
				return {
					success: false,
					error: `OpenAI initialization failed: ${openaiResult.error}`
				};
			}
			
			// Initialize vector database
			const databaseResult = initializeVectorDatabase(
				databaseFilePath,
				vectorTableName,
				xLog,
				initVectorDatabase
			);
			if (!databaseResult.success) {
				return {
					success: false,
					error: `Database initialization failed: ${databaseResult.error}`
				};
			}
			
			// Prepare all dependencies
			const dependencies = prepareDependencies(modules);
			
			return {
				success: true,
				openai: openaiResult.client,
				vectorDb: databaseResult.database,
				dependencies
			};
		};
		
		// ---------------------------------------------------------------------
		// validateModules - validates that all required modules are provided
		
		const validateModules = (modules, xLog) => {
			const requiredModules = [
				'generateEmbeddings',
				'getClosestRecords',
				'dropAllVectorTables',
				'dropProductionVectorTables',
				'showDatabaseStats',
				'executeRebuildWorkflow',
				'tableExists',
				'getTableCount',
				'initVectorDatabase',
				'logConfigurationStatus'
			];
			
			const missingModules = requiredModules.filter(moduleName => !modules[moduleName]);
			
			if (missingModules.length > 0) {
				xLog.error('Missing required modules for application initialization:');
				missingModules.forEach(mod => xLog.error(`  - ${mod}`));
				return false;
			}
			
			return true;
		};
		
		// ---------------------------------------------------------------------
		// safeInitializeApplication - safe initialization with error handling
		
		const safeInitializeApplication = (config, modules, xLog) => {
			// Validate all required modules are present
			if (!validateModules(modules, xLog)) {
				return {
					success: false,
					error: 'Module validation failed - missing required dependencies'
				};
			}
			
			// Validate config object
			if (!config || !config.isValid) {
				return {
					success: false,
					error: 'Invalid configuration provided'
				};
			}
			
			// Perform initialization
			try {
				return initializeApplication(config, modules, xLog);
			} catch (error) {
				xLog.error(`Unexpected error during application initialization: ${error.message}`);
				xLog.error('Stack trace:', error.stack);
				return {
					success: false,
					error: `Initialization failed: ${error.message}`
				};
			}
		};

		return {
			initializeOpenAI,
			initializeVectorDatabase,
			prepareDatabaseOperations,
			prepareDropOperations,
			prepareDependencies,
			initializeApplication,
			validateModules,
			safeInitializeApplication
		};
	};
};

// =====================================================================
// MODULE EXPORTS
// =====================================================================

module.exports = moduleFunction;