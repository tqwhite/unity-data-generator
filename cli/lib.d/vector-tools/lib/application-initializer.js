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
		// initializeVectorDatabase - initializes vector database with error handling
		


		
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
			
			return {
				success: true,
				vectorDb: databaseResult.database
			};
		};



		return {
			initializeApplication
		};
	};
};

// =====================================================================
// MODULE EXPORTS
// =====================================================================

module.exports = moduleFunction;