#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

// =====================================================================
// MODULE FUNCTION
// =====================================================================
// ---------------------------------------------------------------------
// moduleFunction - provides user interaction handling for vector tools CLI

const moduleFunction = function(
	{
		globalIdentifier = 'user-interaction-handler',
		moduleName = globalIdentifier
	} = {}
) {
	return ({
		// Parameters will be passed when calling the functions
	} = {}) => {
		
		// Import progress tracker
		const progressTracker = require('./progress-tracker')();
		
		// =====================================================================
		// USER INTERACTION HANDLER
		// =====================================================================
		
		/**
		 * Handles command processing and user interaction for vector tools CLI
		 * Provides standardized messaging, error handling, and command execution patterns
		 */
		
		// ---------------------------------------------------------------------
		// createUserMessages - creates standardized user messaging functions
		
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
		
		// ---------------------------------------------------------------------
		// createErrorHandler - creates standardized error handling patterns
		
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
		
		// ---------------------------------------------------------------------
		// executeWithErrorHandling - command execution wrapper with error handling
		
		const executeWithErrorHandling = async (xLog, operation, executorFn) => {
			try {
				const result = await executorFn();
				return { success: true, result };
			} catch (error) {
				createErrorHandler(xLog).handleOperationError(operation, error);
				return { success: false, error: error.message };
			}
		};
		
		// ---------------------------------------------------------------------
		// handleShowStatsCommand - handles show database stats command
		
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
		
		// ---------------------------------------------------------------------
		// handleDropTableCommand - handles drop table command with safety checks
		
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
		
		// ---------------------------------------------------------------------
		// handleRebuildDatabaseCommand - handles complete database rebuild workflow
		
		const handleRebuildDatabaseCommand = (
			config, 
			vectorDb, 
			openai, 
			xLog, 
			semanticAnalyzer,
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
				semanticAnalyzer,
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
		
		// ---------------------------------------------------------------------
		// handleWriteVectorDatabaseCommand - handles vector database generation
		
		const handleWriteVectorDatabaseCommand = async (config, openai, vectorDb, xLog, semanticAnalyzer, commandLineParameters) => {
			const { dataProfile, sourceTableName, vectorTableName, sourcePrivateKeyName, sourceEmbeddableContentName } = config;
			const messages = createUserMessages(xLog);
			
			// Determine actual table name based on semantic analyzer mode
			const semanticAnalysisMode = commandLineParameters.qtGetSurePath('values.semanticAnalysisMode[0]', 'simpleVector');
			const actualTableName = semanticAnalysisMode === 'atomicVector' ? `${vectorTableName}_atomic` : vectorTableName;
			
			messages.showOperationStart('Vector Database Generation', dataProfile, actualTableName);
			
			try {
				// Get limit and offset from command line parameters
				const limit = commandLineParameters.values.limit ? 
					parseInt(commandLineParameters.values.limit[0], 10) : null;
				const offset = commandLineParameters.values.offset ? 
					parseInt(commandLineParameters.values.offset[0], 10) : 0;

				// Build SQL query with limit and offset
				let sql = `SELECT * FROM ${sourceTableName}`;
				const params = [];
				
				if (limit !== null) {
					sql += ` LIMIT ? OFFSET ?`;
					params.push(limit, offset);
				} else if (offset > 0) {
					sql += ` OFFSET ?`;
					params.push(offset);
				}

				// Get source data for processing
				const sourceRowList = vectorDb.prepare(sql).all(...params);
				
				xLog.status(`Processing ${sourceRowList.length} records from ${sourceTableName}${limit ? ` (LIMIT ${limit} OFFSET ${offset})` : ''}`);

				await semanticAnalyzer.generateVectors({
					sourceRowList,
					sourceEmbeddableContentName,
					sourcePrivateKeyName,
					openai,
					vectorDb,
					tableName: vectorTableName,
					dataProfile
				});
				
				return { success: true, shouldExit: true };
			} catch (error) {
				createErrorHandler(xLog).handleOperationError('Vector database generation', error);
				return { success: false, shouldExit: true };
			}
		};
		
		// ---------------------------------------------------------------------
		// displayVerboseQueryAnalysis - formats and displays query expansion analysis
		
		const displayVerboseQueryAnalysis = (verboseData, xLog) => {
			if (!verboseData) return;
			
			xLog.status('\n╔═══════════════════════════════════════════════════════════════════════════════════════════════════════╗');
			xLog.status('║                                      QUERY EXPANSION ANALYSIS                                         ║');
			xLog.status('╚═══════════════════════════════════════════════════════════════════════════════════════════════════════╝');
			
			xLog.status(`├─ Original Query: "${verboseData.originalQuery}"`);
			xLog.status('│');
			
			verboseData.enrichedStrings.forEach((enrichedData, index) => {
				const isLast = index === verboseData.enrichedStrings.length - 1;
				const connector = isLast ? '└─' : '├─';
				
				xLog.status(`${connector} Enriched String ${index + 1} [${enrichedData.type}]: "${enrichedData.enrichedString}"`);
				
				if (enrichedData.matches && enrichedData.matches.length > 0) {
					enrichedData.matches.forEach((match, matchIndex) => {
						const isLastMatch = matchIndex === enrichedData.matches.length - 1;
						const matchConnector = isLast ? '   ' : '│  ';
						const matchPrefix = isLastMatch ? '└─' : '├─';
						
						const distance = match.distance ? match.distance.toFixed(4) : 'N/A';
						let matchDescription = `[${distance}] RefID: ${match.sourceRefId}`;
						
						// Add fact details for atomic results
						if (match.factType && match.factText) {
							matchDescription += ` (${match.factType}: "${match.factText}")`;
						}
						
						xLog.status(`${matchConnector} ${matchPrefix} ${matchDescription}`);
					});
				} else {
					const noMatchConnector = isLast ? '   ' : '│  ';
					xLog.status(`${noMatchConnector} └─ (no matches found)`);
				}
				
				if (!isLast) {
					xLog.status('│');
				}
			});
			
			xLog.status('');
		};

		// ---------------------------------------------------------------------
		// handleQueryStringCommand - handles vector similarity search queries
		
		const handleQueryStringCommand = async (config, openai, vectorDb, xLog, semanticAnalyzer, commandLineParameters) => {
			const { dataProfile, sourceTableName, vectorTableName, sourcePrivateKeyName, sourceEmbeddableContentName } = config;
			const messages = createUserMessages(xLog);
			
			const queryString = commandLineParameters.values.queryString.qtLast();
			const resultCount = commandLineParameters.values.resultCount ? 
				parseInt(commandLineParameters.values.resultCount, 10) : 5;

			// Determine actual table name based on semantic analyzer mode
			const semanticAnalysisMode = commandLineParameters.qtGetSurePath('values.semanticAnalysisMode[0]', 'simpleVector');
			const actualTableName = semanticAnalysisMode === 'atomicVector' ? `${vectorTableName}_atomic` : vectorTableName;
				
			messages.showOperationStart('Vector Similarity Search', dataProfile, actualTableName);
			xLog.status(`Query: "${queryString}"`);
			
			try {
				// Check if verbose mode is enabled
				const isVerbose = commandLineParameters.switches.verbose;
				
				const scoringResult = await semanticAnalyzer.scoreDistanceResults({
					queryString,
					vectorDb,
					openai,
					tableName: vectorTableName,
					resultCount,
					dataProfile,
					sourceTableName,
					sourcePrivateKeyName,
					sourceEmbeddableContentName,
					collectVerboseData: isVerbose
				});
				
				// Handle both formats (legacy array or new object with verbose data)
				const results = scoringResult.results || scoringResult;
				const verboseData = scoringResult.verboseData;

				// Display verbose analysis if requested
				if (isVerbose && verboseData) {
					displayVerboseQueryAnalysis(verboseData, xLog);
				}

				// Format and output results
				if (commandLineParameters.switches.json) {
					xLog.result(JSON.stringify(results, '', '\t'));
				} else {
					xLog.status(`\n\nFound ${results.length} valid matches for "${queryString}"`);
					results.forEach(result => {
						const distance = result.distance.toFixed(6);
						const refId = result.record[sourcePrivateKeyName] || '';
						
						// Build description from the embeddable content fields
						let description = '';
						if (Array.isArray(sourceEmbeddableContentName)) {
							description = sourceEmbeddableContentName
								.map(field => result.record[field] || '')
								.filter(value => value)
								.join(' | ');
						} else {
							description = result.record[sourceEmbeddableContentName] || '';
						}
						
						console.log(`${result.rank}. [score: ${distance}] ${refId} ${description}`);
					});
				}
				
				return { success: true, shouldExit: false };
			} catch (error) {
				createErrorHandler(xLog).handleOperationError('Vector similarity search', error);
				return { success: false, shouldExit: false };
			}
		};
		
		// ---------------------------------------------------------------------
		// handleShowProgressCommand - displays progress tracking information
		
		const handleShowProgressCommand = (vectorDb, xLog) => {
			try {
				progressTracker.showProgress(vectorDb);
				return { success: true, shouldExit: true };
			} catch (error) {
				createErrorHandler(xLog).handleOperationError('Show progress', error);
				return { success: false, shouldExit: true };
			}
		};
		
		// ---------------------------------------------------------------------
		// handlePurgeProgressCommand - clears progress table for current profile
		
		const handlePurgeProgressCommand = (config, vectorDb, xLog, commandLineParameters) => {
			const switches = commandLineParameters.switches;
			
			// Validate can only be used with write operations
			if (!switches.writeVectorDatabase && !switches.rebuildDatabase) {
				xLog.error('-purgeProgressTable can only be used with -writeVectorDatabase or -rebuildDatabase');
				return { success: false, shouldExit: true };
			}
			
			try {
				const purgedCount = progressTracker.purgeProgressTable(vectorDb, config.dataProfile);
				xLog.status(`Ready to start fresh for ${config.dataProfile} profile`);
				return { success: true, shouldExit: false }; // Continue with write operation
			} catch (error) {
				createErrorHandler(xLog).handleOperationError('Purge progress table', error);
				return { success: false, shouldExit: true };
			}
		};
		
		// ---------------------------------------------------------------------
		// handleWriteVectorDatabaseCommandWithResume - handles vector generation with resume capability
		
		const handleWriteVectorDatabaseCommandWithResume = async (config, openai, vectorDb, xLog, semanticAnalyzer, commandLineParameters, resumeBatch = null) => {
			const { dataProfile, sourceTableName, vectorTableName, sourcePrivateKeyName, sourceEmbeddableContentName } = config;
			const messages = createUserMessages(xLog);
			
			// Determine actual table name and semantic mode
			const semanticAnalysisMode = commandLineParameters.qtGetSurePath('values.semanticAnalysisMode[0]', 'simpleVector');
			const actualTableName = semanticAnalysisMode === 'atomicVector' ? `${vectorTableName}_atomic` : vectorTableName;
			
			try {
				let sourceRowList, batchId, processedKeys = [];
				
				if (resumeBatch) {
					// Resume mode - get unprocessed records
					batchId = resumeBatch.batch_id;
					processedKeys = progressTracker.getProcessedKeys(vectorDb, batchId);
					
					messages.showOperationStart('Resuming Vector Database Generation', dataProfile, actualTableName);
					xLog.status(`Resuming batch: ${batchId}`);
					xLog.status(`Already processed: ${processedKeys.length} records`);
					
					// Get remaining records to process
					const allRecords = vectorDb.prepare(`SELECT * FROM ${sourceTableName}`).all();
					sourceRowList = allRecords.filter(record => {
						const keyValue = record[sourcePrivateKeyName];
						return !processedKeys.includes(keyValue.toString());
					});
					
					xLog.status(`Remaining to process: ${sourceRowList.length} records`);
				} else {
					// New batch mode - get records based on limit/offset
					messages.showOperationStart('Vector Database Generation', dataProfile, actualTableName);
					
					const limit = commandLineParameters.values.limit ? 
						parseInt(commandLineParameters.values.limit[0], 10) : null;
					const offset = commandLineParameters.values.offset ? 
						parseInt(commandLineParameters.values.offset[0], 10) : 0;

					// Build SQL query with limit and offset
					let sql = `SELECT * FROM ${sourceTableName}`;
					const params = [];
					
					if (limit !== null) {
						sql += ` LIMIT ? OFFSET ?`;
						params.push(limit, offset);
					} else if (offset > 0) {
						sql += ` OFFSET ?`;
						params.push(offset);
					}

					// Get source data for processing
					sourceRowList = vectorDb.prepare(sql).all(...params);
					
					// Create new progress batch
					batchId = progressTracker.createBatch(
						vectorDb, 
						config, 
						semanticAnalysisMode, 
						sourceRowList.length,
						{
							limit,
							offset,
							command: 'writeVectorDatabase',
							semanticAnalysisMode
						}
					);
				}
				
				xLog.status(`Processing ${sourceRowList.length} records from ${sourceTableName}${resumeBatch ? ' (RESUME)' : ''}`);

				// Generate vectors with progress tracking
				await semanticAnalyzer.generateVectors({
					sourceRowList,
					sourceEmbeddableContentName,
					sourcePrivateKeyName,
					openai,
					vectorDb,
					tableName: vectorTableName,
					dataProfile,
					// Progress tracking parameters
					batchId,
					progressTracker,
					alreadyProcessedCount: processedKeys.length
				});
				
				// Mark batch as completed
				progressTracker.completeBatch(vectorDb, batchId);
				
				return { success: true, shouldExit: true };
			} catch (error) {
				createErrorHandler(xLog).handleOperationError('Vector database generation', error);
				return { success: false, shouldExit: true };
			}
		};
		
		// ---------------------------------------------------------------------
		// handleResumeCommand - resumes interrupted vector generation
		
		const handleResumeCommand = async (config, vectorDb, openai, xLog, semanticAnalyzer, commandLineParameters) => {
			const values = commandLineParameters.values;
			
			try {
				let batchToResume;
				
				if (values.batchId && values.batchId[0]) {
					// Resume specific batch
					batchToResume = progressTracker.getBatchProgress(vectorDb, values.batchId[0]);
					if (!batchToResume) {
						xLog.error(`Batch not found: ${values.batchId[0]}`);
						return { success: false, shouldExit: true };
					}
				} else {
					// Resume latest incomplete batch for this profile
					const incompleteBatches = progressTracker.getIncompleteBatches(vectorDb, config.dataProfile);
					if (incompleteBatches.length === 0) {
						xLog.status(`No incomplete batches found for ${config.dataProfile} profile`);
						return { success: true, shouldExit: true };
					}
					batchToResume = incompleteBatches[0];
				}
				
				xLog.status(`Resuming batch: ${batchToResume.batch_id}`);
				xLog.status(`Progress: ${batchToResume.processed_records}/${batchToResume.total_records} records`);
				
				// Set up resume operation by calling write command with resume context
				return await handleWriteVectorDatabaseCommandWithResume(
					config, openai, vectorDb, xLog, semanticAnalyzer, commandLineParameters, batchToResume
				);
				
			} catch (error) {
				createErrorHandler(xLog).handleOperationError('Resume operation', error);
				return { success: false, shouldExit: true };
			}
		};
		
		// ---------------------------------------------------------------------
		// validateCommandCombinations - validates command combinations and dependencies
		
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
		
		// ---------------------------------------------------------------------
		// dispatchCommands - main command dispatcher and router
		
		const dispatchCommands = async (
			config,
			vectorDb,
			openai,
			xLog,
			commandLineParameters,
			dependencies
		) => {
			const {
				semanticAnalyzer,
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
			
			// Progress tracking commands
			if (switches.showProgress) {
				return handleShowProgressCommand(vectorDb, xLog);
			}
			
			if (switches.resume) {
				return await handleResumeCommand(config, vectorDb, openai, xLog, semanticAnalyzer, commandLineParameters);
			}
			
			if (switches.dropTable) {
				const result = handleDropTableCommand(
					config, vectorDb, xLog, dropAllVectorTables, showDatabaseStats, commandLineParameters
				);
				if (result.shouldExit) return result;
			}
			
			// Handle purge progress (only with write operations)
			if (switches.purgeProgressTable) {
				const purgeResult = handlePurgeProgressCommand(config, vectorDb, xLog, commandLineParameters);
				if (!purgeResult.success) return purgeResult;
				// Continue with write operation after purging
			}
			
			if (switches.rebuildDatabase) {
				return handleRebuildDatabaseCommand(
					config, vectorDb, openai, xLog, semanticAnalyzer,
					dbOperations, dropOperations, commandLineParameters, executeRebuildWorkflow
				);
			}
			
			if (switches.writeVectorDatabase || values.writeVectorDatabase) {
				// Use new resume-capable version for all writes
				const result = await handleWriteVectorDatabaseCommandWithResume(
					config, openai, vectorDb, xLog, semanticAnalyzer, commandLineParameters
				);
				return result;
			}
			
			if (values.queryString) {
				return await handleQueryStringCommand(
					config, openai, vectorDb, xLog, semanticAnalyzer, commandLineParameters
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
			handleWriteVectorDatabaseCommandWithResume,
			handleQueryStringCommand,
			handleShowProgressCommand,
			handlePurgeProgressCommand,
			handleResumeCommand,
			displayVerboseQueryAnalysis,
			validateCommandCombinations,
			dispatchCommands
		};
	};
};

// =====================================================================
// MODULE EXPORTS
// =====================================================================

module.exports = moduleFunction;