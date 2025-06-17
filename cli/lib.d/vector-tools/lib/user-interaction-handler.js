#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

//START OF moduleFunction() ============================================================
const moduleFunction = function(
	{
		globalIdentifier = 'user-interaction-handler',
		moduleName = globalIdentifier
	} = {}
) {
	return ({
		// Parameters will be passed when calling the functions
	} = {}) => {
		
		/**
		 * Handles command processing and user interaction for vector tools CLI
		 * Provides standardized messaging, error handling, and command execution patterns
		 */
		
		/**
		 * Standardized user messaging functions
		 */
		const createUserMessages = (xLog) => ({
			// Status messages
			showOperationStart: (operation, profile, tableName) => {
				xLog.status(`Starting ${operation} for ${profile.toUpperCase()} profile...`);
				if (tableName) {
					xLog.status(`Target table: "${tableName}"`);
				}
			},
			
			showSafeDropWarning: (profile, tableName) => {
				xLog.status(`Safely dropping ${profile.toUpperCase()} vector table "${tableName}" only...`);
				xLog.status('IMPORTANT: This will NOT affect other profile tables or database tables');
			},
			
			showOperationResult: (operation, success, details = {}) => {
				if (success) {
					xLog.status(`✓ ${operation} completed successfully`);
					if (details.count !== undefined) {
						xLog.status(`  ${details.count} ${details.type || 'items'} processed`);
					}
				} else {
					xLog.error(`✗ ${operation} failed: ${details.error || 'Unknown error'}`);
				}
			},
			
			showDetailedErrors: (errors) => {
				if (errors && errors.length > 0) {
					errors.forEach(err => {
						xLog.error(`  - ${err.table || err.item}: ${err.error || err.message}`);
					});
				}
			},
			
			showPostOperationState: (operation) => {
				xLog.status(`Database state after ${operation}:`);
			}
		});
		
		/**
		 * Standardized error handling patterns
		 */
		const createErrorHandler = (xLog) => ({
			handleDatabaseError: (operation, error) => {
				xLog.error(`Failed to ${operation}: ${error.message}`);
				if (error.stack) {
					xLog.error('Stack trace:', error.stack);
				}
			},
			
			handleOperationError: (operation, error, showStack = true) => {
				xLog.error(`${operation} failed: ${error.message}`);
				if (showStack && error.stack) {
					xLog.error('Stack trace:', error.stack);
				}
			},
			
			handleConfigurationError: (configName, error) => {
				xLog.error(`Configuration error in ${configName}: ${error.message}`);
				xLog.error('Please check your configuration settings');
			}
		});
		
		/**
		 * Command execution wrapper with standardized error handling
		 */
		const executeWithErrorHandling = async (xLog, operation, executorFn) => {
			try {
				const result = await executorFn();
				return { success: true, result };
			} catch (error) {
				createErrorHandler(xLog).handleOperationError(operation, error);
				return { success: false, error: error.message };
			}
		};
		
		/**
		 * Show Stats Command Handler
		 */
		const handleShowStatsCommand = (vectorDb, xLog, showDatabaseStats) => {
			const messages = createUserMessages(xLog);
			messages.showOperationStart('Database Statistics Display', 'ALL', null);
			
			try {
				showDatabaseStats(vectorDb, xLog);
				return { success: true, shouldExit: true };
			} catch (error) {
				createErrorHandler(xLog).handleDatabaseError('show database stats', error);
				return { success: false, shouldExit: true };
			}
		};
		
		/**
		 * Drop Table Command Handler
		 */
		const handleDropTableCommand = (config, vectorDb, xLog, dropAllVectorTables, showDatabaseStats, commandLineParameters) => {
			const { dataProfile, vectorTableName } = config;
			const messages = createUserMessages(xLog);
			const errorHandler = createErrorHandler(xLog);
			
			messages.showSafeDropWarning(dataProfile, vectorTableName);
			
			try {
				// Use enhanced drop function with safety checks
				const dropResult = dropAllVectorTables(vectorDb, xLog, vectorTableName, { 
					skipConfirmation: true // CLI operation - user already confirmed with -dropTable
				});
				
				if (dropResult.success) {
					messages.showOperationResult('Drop operation', true, {
						count: dropResult.droppedCount,
						type: 'tables'
					});
				} else {
					messages.showOperationResult('Drop operation', false, { error: dropResult.error });
					messages.showDetailedErrors(dropResult.errors);
				}
			} catch (error) {
				errorHandler.handleDatabaseError('drop tables', error);
			}
			
			// Show the empty state after dropping tables
			try {
				messages.showPostOperationState('dropping tables');
				showDatabaseStats(vectorDb, xLog);
			} catch (error) {
				errorHandler.handleDatabaseError('show database stats', error);
			}
			
			// Only exit if we're not also writing to the database
			const shouldExit = !commandLineParameters.switches.writeVectorDatabase;
			return { success: true, shouldExit };
		};
		
		/**
		 * Rebuild Database Command Handler
		 */
		const handleRebuildDatabaseCommand = (
			config, 
			vectorDb, 
			openai, 
			xLog, 
			generateEmbeddings,
			dbOperations,
			dropOperations,
			commandLineParameters,
			executeRebuildWorkflow
		) => {
			const { dataProfile, sourceTableName, sourcePrivateKeyName, sourceEmbeddableContentName, vectorTableName } = config;
			const messages = createUserMessages(xLog);
			const errorHandler = createErrorHandler(xLog);
			
			messages.showOperationStart('Complete Database Rebuild', dataProfile, vectorTableName);
			
			// Prepare configuration object for rebuild workflow
			const rebuildConfig = {
				dataProfile,
				sourceTableName,
				sourcePrivateKeyName,
				sourceEmbeddableContentName,
				vectorTableName
			};
			
			// Execute rebuild workflow
			executeRebuildWorkflow(
				rebuildConfig,
				vectorDb,
				openai,
				xLog,
				generateEmbeddings,
				dbOperations,
				dropOperations,
				commandLineParameters,
				(err) => {
					if (err) {
						errorHandler.handleOperationError('Rebuild', err, false);
					} else {
						messages.showOperationResult('Database rebuild', true);
					}
					// Callback complete - rebuild pipeline handles its own flow
				}
			);
			
			return { success: true, shouldExit: true }; // Exit after starting the rebuild pipeline
		};
		
		/**
		 * Write Vector Database Command Handler
		 */
		const handleWriteVectorDatabaseCommand = (config, openai, vectorDb, xLog, generateEmbeddings) => {
			const { dataProfile, sourceTableName, vectorTableName, sourcePrivateKeyName, sourceEmbeddableContentName } = config;
			const messages = createUserMessages(xLog);
			
			messages.showOperationStart('Vector Database Generation', dataProfile, vectorTableName);
			
			try {
				generateEmbeddings({
					openai,
					vectorDb,
				}).workingFunction({
					sourceTableName,
					vectorTableName,
					sourcePrivateKeyName,
					sourceEmbeddableContentName,
				});
				
				return { success: true, shouldExit: false };
			} catch (error) {
				createErrorHandler(xLog).handleOperationError('Vector database generation', error);
				return { success: false, shouldExit: false };
			}
		};
		
		/**
		 * Query String Command Handler
		 */
		const handleQueryStringCommand = (config, openai, vectorDb, xLog, getClosestRecords, commandLineParameters) => {
			const { dataProfile, sourceTableName, vectorTableName, sourcePrivateKeyName, sourceEmbeddableContentName } = config;
			const messages = createUserMessages(xLog);
			
			const queryString = commandLineParameters.values.queryString.qtLast();
			messages.showOperationStart('Vector Similarity Search', dataProfile, vectorTableName);
			xLog.status(`Query: "${queryString}"`);
			
			try {
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
					queryString,
				);
				
				return { success: true, shouldExit: false };
			} catch (error) {
				createErrorHandler(xLog).handleOperationError('Vector similarity search', error);
				return { success: false, shouldExit: false };
			}
		};
		
		/**
		 * Validate command combinations and dependencies
		 */
		const validateCommandCombinations = (commandLineParameters, xLog) => {
			const switches = commandLineParameters.switches;
			const values = commandLineParameters.values;
			
			// Check for conflicting operations
			const mutuallyExclusiveCommands = [
				'showStats',
				'rebuildDatabase',
			];
			
			const activeExclusiveCommands = mutuallyExclusiveCommands.filter(cmd => switches[cmd]);
			if (activeExclusiveCommands.length > 1) {
				xLog.error(`Cannot combine these operations: ${activeExclusiveCommands.join(', ')}`);
				return { valid: false, error: 'Conflicting commands' };
			}
			
			// Validate queryString requirements
			if (values.queryString && !values.queryString.qtLast()) {
				xLog.error('Query string cannot be empty');
				return { valid: false, error: 'Invalid query string' };
			}
			
			return { valid: true };
		};
		
		/**
		 * Main command dispatcher
		 */
		const dispatchCommands = (
			config,
			vectorDb,
			openai,
			xLog,
			commandLineParameters,
			dependencies
		) => {
			const {
				generateEmbeddings,
				getClosestRecords,
				dropAllVectorTables,
				showDatabaseStats,
				dbOperations,
				dropOperations,
				executeRebuildWorkflow
			} = dependencies;
			
			// Validate command combinations
			const validation = validateCommandCombinations(commandLineParameters, xLog);
			if (!validation.valid) {
				return { success: false, shouldExit: true };
			}
			
			const switches = commandLineParameters.switches;
			const values = commandLineParameters.values;
			
			// Handle commands in priority order
			if (switches.showStats) {
				return handleShowStatsCommand(vectorDb, xLog, showDatabaseStats);
			}
			
			if (switches.dropTable) {
				const result = handleDropTableCommand(
					config, vectorDb, xLog, dropAllVectorTables, showDatabaseStats, commandLineParameters
				);
				if (result.shouldExit) return result;
			}
			
			if (switches.rebuildDatabase) {
				return handleRebuildDatabaseCommand(
					config, vectorDb, openai, xLog, generateEmbeddings,
					dbOperations, dropOperations, commandLineParameters, executeRebuildWorkflow
				);
			}
			
			if (switches.writeVectorDatabase) {
				const result = handleWriteVectorDatabaseCommand(
					config, openai, vectorDb, xLog, generateEmbeddings
				);
				if (!result.success) return result;
			}
			
			if (values.queryString) {
				return handleQueryStringCommand(
					config, openai, vectorDb, xLog, getClosestRecords, commandLineParameters
				);
			}
			
			// No commands specified - show help or default behavior
			xLog.status('No operation specified. Use --help to see available commands.');
			return { success: true, shouldExit: true };
		};

		return {
			createUserMessages,
			createErrorHandler,
			executeWithErrorHandling,
			handleShowStatsCommand,
			handleDropTableCommand,
			handleRebuildDatabaseCommand,
			handleWriteVectorDatabaseCommand,
			handleQueryStringCommand,
			validateCommandCombinations,
			dispatchCommands
		};
	};
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;