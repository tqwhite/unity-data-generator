#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const qt = require('qtools-functional-library');

// =====================================================================
// OPERATION ROUTER - Routes commands to appropriate handlers
// =====================================================================

const moduleFunction = ({ unused } = {}) => {
	const { xLog, getConfig, commandLineParameters } = process.global;
	const moduleConfig = getConfig(moduleName);

	// ---------------------------------------------------------------------
	// mapCommandLineToOperationName - Figure out what operation to perform
	
	const mapCommandLineToOperationName = (params) => {
		const { switches, values } = params;
		
		// Check for help first
		if (switches.help || switches.h) {
			return 'help';
		}
		
		// Check for show config
		if (switches.showConfig) {
			return 'showConfig';
		}
		
		// Database management operations
		if (switches.dropTable) {
			return 'dropTable';
		}
		
		if (switches.showStats) {
			return 'showStats';
		}
		
		if (switches.newDatabase) {
			return 'newDatabase';
		}
		
		// Vector generation operations
		if (switches.rebuildDatabase) {
			return 'rebuildDatabase';
		}
		
		if (switches.writeVectorDatabase) {
			return 'writeVectorDatabase';
		}
		
		// Progress operations
		if (switches.showProgress) {
			return 'showProgress';
		}
		
		if (switches.purgeProgressTable) {
			return 'purgeProgressTable';
		}
		
		if (switches.resume) {
			return 'resumeOperation';
		}
		
		// Query operations
		if (values.queryString) {
			return 'semanticSearch';
		}
		
		if (values.query) {
			return 'directQuery';
		}
		
		// Default to help if no operation specified
		return 'help';
	};

	// ---------------------------------------------------------------------
	// routeToVectorOperation - Main routing function
	
	const routeToVectorOperation = async ({ commandLineParameters, services }) => {
		const operation = mapCommandLineToOperationName(commandLineParameters);
		
		xLog.verbose(`Routing to operation: ${operation}`);
		
		// Get the appropriate handler
		const handler = instantiateOperatingModule[operation];
		
		if (!handler) {
			const traceId = Math.floor(Math.random() * 1e9);
			xLog.error(`[${traceId}] Unknown operation: ${operation}`);
			throw new Error(`Invalid operation [trace:${traceId}]`);
		}
		
		// Execute the handler
		try {
			const result = await handler(services, commandLineParameters);
			return result;
		} catch (error) {
			const traceId = error.traceId || Math.floor(Math.random() * 1e9);
			xLog.error(`[${traceId}] Operation ${operation} failed: ${error.message}`);
			throw error;
		}
	};

	// ---------------------------------------------------------------------
	// Operation Handlers Registry
	
	const instantiateOperatingModule = {
		// Help operation
		help: async (services, params) => {
			const helpText = require('../help/help-text')();
			xLog.status(helpText);
			return { shouldExit: true, exitCode: 0 };
		},
		
		// Show configuration
		showConfig: async (services, params) => {
			const config = services.config;
			xLog.result(JSON.stringify(config, null, 2));
			return { shouldExit: true, exitCode: 0 };
		},
		
		// Database statistics
		showStats: async (services, params) => {
			const databaseOperations = require('../database-operations/database-operations');
			const ops = databaseOperations({ dbUtility: services.dbUtility });
			return await ops.displayComprehensiveDatabaseStatistics();
		},
		
		// Drop table
		dropTable: async (services, params) => {
			const databaseOperations = require('../database-operations/database-operations');
			const ops = databaseOperations({ dbUtility: services.dbUtility });
			return await ops.dropVectorTablesWithConfirmation(services.config);
		},
		
		// Create new database
		newDatabase: async (services, params) => {
			const databaseOperations = require('../database-operations/database-operations');
			const ops = databaseOperations({ dbUtility: services.dbUtility });
			return await ops.createDatabase(services.config);
		},
		
		// Write vector database
		writeVectorDatabase: async (services, params) => {
			const vectorOperations = require('../vector-operations/vector-generator');
			const generator = vectorOperations({ 
				dbUtility: services.dbUtility,
				analyzerRegistry: services.analyzerRegistry,
				progressTracker: services.progressTracker
			});
			return await generator.generateVectorsFromSourceRecords(services.config);
		},
		
		// Rebuild database
		rebuildDatabase: async (services, params) => {
			const vectorOperations = require('../vector-operations/vector-rebuild');
			const rebuilder = vectorOperations({
				dbUtility: services.dbUtility,
				analyzerRegistry: services.analyzerRegistry,
				progressTracker: services.progressTracker
			});
			return await rebuilder.rebuild(services.config);
		},
		
		// Semantic search
		semanticSearch: async (services, params) => {
			const vectorQuery = require('../vector-operations/vector-query');
			const query = vectorQuery({
				dbUtility: services.dbUtility,
				analyzerRegistry: services.analyzerRegistry
			});
			
			const queryString = params.values.queryString[0];
			const resultCount = params.values.resultCount?.[0] || 5;
			
			return await query.performSemanticVectorSearch(services.config, queryString, resultCount);
		},
		
		// Direct query
		directQuery: async (services, params) => {
			const queryTool = require('../query-tool/query-tool')({});
			
			// Get dataProfile from command line parameters or config
			const dataProfile = params.values.dataProfile?.[0] || services.config.dataProfile || 'sif';
			
			const tool = queryTool.queryTool({
				dbUtility: services.dbUtility,
				dataProfile: dataProfile
			});
			
			// The queryTool handles its own parameter extraction from commandLineParameters
			// It also handles its own output formatting
			return { shouldExit: true, exitCode: 0 };
		},
		
		// Show progress
		showProgress: async (services, params) => {
			return await services.progressTracker.showProgress(services.config);
		},
		
		// Purge progress table
		purgeProgressTable: async (services, params) => {
			return await services.progressTracker.purgeProgress(services.config);
		},
		
		// Resume operation
		resumeOperation: async (services, params) => {
			const vectorOperations = require('../vector-operations/vector-generator');
			const generator = vectorOperations({
				dbUtility: services.dbUtility,
				analyzerRegistry: services.analyzerRegistry,
				progressTracker: services.progressTracker
			});
			return await generator.resumeInterruptedVectorGeneration(services.config);
		}
	};

	// =====================================================================
	// PUBLIC INTERFACE
	// =====================================================================
	
	return {
		mapCommandLineToOperationName,
		routeToVectorOperation
	};
};

module.exports = moduleFunction();