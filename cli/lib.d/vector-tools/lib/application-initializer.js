#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

//START OF moduleFunction() ============================================================
const moduleFunction = function(
	{
		globalIdentifier = 'application-initializer',
		moduleName = globalIdentifier
	} = {}
) {
	return ({
		// Parameters will be passed when calling the functions
	} = {}) => {
		
		/**
		 * Application initialization and setup for vector tools CLI
		 * Handles OpenAI client setup, database initialization, and dependency preparation
		 */
		
		/**
		 * Initialize OpenAI client with API key
		 */
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
		
		/**
		 * Initialize vector database with error handling
		 */
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
		
		/**
		 * Prepare database operations object for command dispatcher
		 */
		const prepareDatabaseOperations = (tableExists, getTableCount) => {
			return {
				tableExists,
				getTableCount
			};
		};
		
		/**
		 * Prepare drop operations object for command dispatcher
		 */
		const prepareDropOperations = (dropProductionVectorTables, dropAllVectorTables) => {
			return {
				dropProductionVectorTables,
				dropAllVectorTables
			};
		};
		
		/**
		 * Prepare all dependencies required by the command dispatcher
		 */
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
		
		/**
		 * Complete application initialization sequence
		 * Returns all initialized components needed by the application
		 */
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
		
		/**
		 * Validate that all required modules are provided
		 */
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
		
		/**
		 * Safe application initialization with comprehensive error handling
		 */
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

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;