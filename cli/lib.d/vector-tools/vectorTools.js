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
		'-json',
	],
}); // SIDE EFFECTS: Initializes xLog and getConfig in process.global

// =====================================================================
// MODULE IMPORTS (AFTER JINA INITIALIZATION)
// =====================================================================

const databaseOperationsGen = require('./lib/database-operations');
const aiOperationsGen = require('./lib/ai-operations');


//HACKERY: from some reason, putting require('generate-embeddings') AFTER this causes sqlite to screw up
// Note: commandLineParameters will be set by qtools-ai-framework above
const vectorConfigHandler = require('./lib/vector-config-handler');
const vectorRebuildWorkflow = require('./lib/vector-rebuild-workflow')();
const { executeRebuildWorkflow } = vectorRebuildWorkflow();

// ---------------------------------------------------------------------
// moduleFunction - main application entry point and execution pipeline

const moduleFunction =
	({ moduleName } = {}) =>
	async ({ unused }) => {
		const { xLog, getConfig, rawConfig, commandLineParameters } =
			process.global;

		const databaseOperations = databaseOperationsGen({});
		

		const { openai } = aiOperationsGen({});

		const {
			semanticAnalyzer,
		} = require('./lib/semanticAnalyzers/semantic-analyzer-loader');

		// Validate command combinations
		const switches = commandLineParameters.switches;
		const values = commandLineParameters.values;

		// Check for conflicting operations
		const mutuallyExclusiveCommands = ['showStats', 'rebuildDatabase'];
		const activeExclusiveCommands = mutuallyExclusiveCommands.filter(
			(cmd) => switches[cmd],
		);
		if (activeExclusiveCommands.length > 1) {
			xLog.error(
				`Cannot combine these operations: ${activeExclusiveCommands.join(', ')}`,
			);
			return { success: false, shouldExit: true };
		}

		// Helper function for vector generation
		const handleVectorGeneration = async (
			config,
			openai,
			vectorDb,
			xLog,
			semanticAnalyzer,
			commandLineParameters,
			resumeBatch = null,
		) => {
			const {
				dataProfile,
				sourceTableName,
				vectorTableName,
				sourcePrivateKeyName,
				sourceEmbeddableContentName,
			} = config;

			// Determine actual table name and semantic mode
			const semanticAnalysisMode = commandLineParameters.qtGetSurePath(
				'values.semanticAnalysisMode[0]',
				'simpleVector',
			);
			const actualTableName =
				semanticAnalysisMode === 'atomicVector'
					? `${vectorTableName}_atomic`
					: vectorTableName;

			try {
				let sourceRowList,
					batchId,
					processedKeys = [];

				if (resumeBatch) {
					// Resume mode - get unprocessed records
					batchId = resumeBatch.batch_id;
					processedKeys = progressTracker.getProcessedKeys(vectorDb, batchId);

					xLog.status(
						`Starting Resuming Vector Database Generation for ${dataProfile.toUpperCase()} profile...`,
					);
					if (actualTableName) {
						xLog.status(`Target table: "${actualTableName}"`);
					}
					xLog.status(`Resuming batch: ${batchId}`);
					xLog.status(`Already processed: ${processedKeys.length} records`);

					// Get remaining records to process
					const allRecords = vectorDb
						.prepare(`SELECT * FROM ${sourceTableName}`)
						.all();
					sourceRowList = allRecords.filter((record) => {
						const keyValue = record[sourcePrivateKeyName];
						return !processedKeys.includes(keyValue.toString());
					});

					xLog.status(`Remaining to process: ${sourceRowList.length} records`);
				} else {
					// New batch mode - get records based on limit/offset
					xLog.status(
						`Starting Vector Database Generation for ${dataProfile.toUpperCase()} profile...`,
					);
					if (actualTableName) {
						xLog.status(`Target table: "${actualTableName}"`);
					}

					const limit = commandLineParameters.values.limit
						? parseInt(commandLineParameters.values.limit[0], 10)
						: null;
					const offset = commandLineParameters.values.offset
						? parseInt(commandLineParameters.values.offset[0], 10)
						: 0;

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
							semanticAnalysisMode,
						},
					);
				}

				xLog.status(
					`Processing ${sourceRowList.length} records from ${sourceTableName}${resumeBatch ? ' (RESUME)' : ''}`,
				);

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
					alreadyProcessedCount: processedKeys.length,
				});

				// Mark batch as completed
				progressTracker.completeBatch(vectorDb, batchId);

				return { success: true, shouldExit: true };
			} catch (error) {
				xLog.error(`Vector database generation failed: ${error.message}`);
				return { success: false, shouldExit: true };
			}
		};

		// Helper function for query handling
		const handleQueryCommand = async (
			config,
			openai,
			vectorDb,
			xLog,
			semanticAnalyzer,
			commandLineParameters,
		) => {
			const {
				dataProfile,
				sourceTableName,
				vectorTableName,
				sourcePrivateKeyName,
				sourceEmbeddableContentName,
			} = config;

			const queryString = commandLineParameters.values.queryString.qtLast();
			const resultCount = commandLineParameters.values.resultCount
				? parseInt(commandLineParameters.values.resultCount, 10)
				: 5;

			// Determine actual table name based on semantic analyzer mode
			const semanticAnalysisMode = commandLineParameters.qtGetSurePath(
				'values.semanticAnalysisMode[0]',
				'simpleVector',
			);
			const actualTableName =
				semanticAnalysisMode === 'atomicVector'
					? `${vectorTableName}_atomic`
					: vectorTableName;

			xLog.status(
				`Starting Vector Similarity Search for ${dataProfile.toUpperCase()} profile...`,
			);
			if (actualTableName) {
				xLog.status(`Target table: "${actualTableName}"`);
			}
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
					collectVerboseData: isVerbose,
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
					xLog.status(
						`\n\nFound ${results.length} valid matches for "${queryString}"`,
					);
					results.forEach((result) => {
						const distance = result.distance.toFixed(6);
						const refId = result.record[sourcePrivateKeyName] || '';

						// Build description from the embeddable content fields
						let description = '';
						if (Array.isArray(sourceEmbeddableContentName)) {
							description = sourceEmbeddableContentName
								.map((field) => result.record[field] || '')
								.filter((value) => value)
								.join(' | ');
						} else {
							description = result.record[sourceEmbeddableContentName] || '';
						}

						console.log(
							`${result.rank}. [score: ${distance}] ${refId} ${description}`,
						);
					});
				}

				return { success: true, shouldExit: false };
			} catch (error) {
				xLog.error(`Vector similarity search failed: ${error.message}`);
				return { success: false, shouldExit: false };
			}
		};

		// Helper function for verbose query analysis display
		const displayVerboseQueryAnalysis = (verboseData, xLog) => {
			if (!verboseData) return;

			xLog.status(
				'\n╔═══════════════════════════════════════════════════════════════════════════════════════════════════════╗',
			);
			xLog.status(
				'║                                      QUERY EXPANSION ANALYSIS                                         ║',
			);
			xLog.status(
				'╚═══════════════════════════════════════════════════════════════════════════════════════════════════════╝',
			);

			xLog.status(`├─ Original Query: "${verboseData.originalQuery}"`);
			xLog.status('│');

			verboseData.enrichedStrings.forEach((enrichedData, index) => {
				const isLast = index === verboseData.enrichedStrings.length - 1;
				const connector = isLast ? '└─' : '├─';

				xLog.status(
					`${connector} Enriched String ${index + 1} [${enrichedData.type}]: "${enrichedData.enrichedString}"`,
				);

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

		// =====================================================================
		// MAIN APPLICATION EXECUTION PIPELINE
		// =====================================================================

		// ---------------------------------------------------------------------
		// 1. Get and validate configuration

		const { getProfileConfiguration, logConfigurationStatus } =
			vectorConfigHandler({});
		const config = getProfileConfiguration(moduleName);
		if (!config.isValid) {
			return {};
		}

		// ---------------------------------------------------------------------
		// 2. Prepare modules for application initializer
		const progressTracker = require('./lib/progress-tracker')();
		const modules = {
			semanticAnalyzer,
			dropAllVectorTables: databaseOperations.dropAllVectorTables,
			dropProductionVectorTables: databaseOperations.dropProductionVectorTables,
			showDatabaseStats: databaseOperations.showDatabaseStats,
			executeRebuildWorkflow,
			tableExists: databaseOperations.tableExists,
			getTableCount: databaseOperations.getTableCount,
			initVectorDatabase: databaseOperations.initVectorDatabase,
			logConfigurationStatus,
			progressTracker,
		};

		// ---------------------------------------------------------------------
		// 3. Initialize database
		const vectorDb = databaseOperations.initializeDatabase(
			config.databaseFilePath,
			config.vectorTableName,
			xLog,
		);

		// ---------------------------------------------------------------------
		// 4. Initialize OpenAI client

		// ---------------------------------------------------------------------
		// 5. Dispatch and execute commands

		// Validate queryString requirements
		if (values.queryString && !values.queryString.qtLast()) {
			xLog.error('Query string cannot be empty');
			return { success: false, shouldExit: true };
		}

		// Handle commands in priority order
		if (switches.showStats) {
			try {
				xLog.status('Starting Database Statistics Display for ALL profile...');
				showDatabaseStats(vectorDb, xLog);
				return { success: true, shouldExit: true };
			} catch (error) {
				xLog.error(`Failed to show database stats: ${error.message}`);
				return { success: false, shouldExit: true };
			}
		}

		// Progress tracking commands
		if (switches.showProgress) {
			try {
				progressTracker.showProgress(vectorDb);
				return { success: true, shouldExit: true };
			} catch (error) {
				xLog.error(`Show progress failed: ${error.message}`);
				return { success: false, shouldExit: true };
			}
		}

		if (switches.resume) {
			try {
				let batchToResume;

				if (values.batchId && values.batchId[0]) {
					batchToResume = progressTracker.getBatchProgress(
						vectorDb,
						values.batchId[0],
					);
					if (!batchToResume) {
						xLog.error(`Batch not found: ${values.batchId[0]}`);
						return { success: false, shouldExit: true };
					}
				} else {
					const incompleteBatches = progressTracker.getIncompleteBatches(
						vectorDb,
						config.dataProfile,
					);
					if (incompleteBatches.length === 0) {
						xLog.status(
							`No incomplete batches found for ${config.dataProfile} profile`,
						);
						return { success: true, shouldExit: true };
					}
					batchToResume = incompleteBatches[0];
				}

				xLog.status(`Resuming batch: ${batchToResume.batch_id}`);
				xLog.status(
					`Progress: ${batchToResume.processed_records}/${batchToResume.total_records} records`,
				);

				// Resume vector generation
				return await handleVectorGeneration(
					config,
					openai,
					vectorDb,
					xLog,
					semanticAnalyzer,
					commandLineParameters,
					batchToResume,
				);
			} catch (error) {
				xLog.error(`Resume operation failed: ${error.message}`);
				return { success: false, shouldExit: true };
			}
		}

		if (switches.dropTable) {
			const { dataProfile, vectorTableName } = config;

			xLog.status(
				`Safely dropping ${dataProfile.toUpperCase()} vector table "${vectorTableName}" only...`,
			);
			xLog.status(
				'IMPORTANT: This will NOT affect other profile tables or database tables',
			);

			try {
				const dropResult = dropAllVectorTables(
					vectorDb,
					xLog,
					vectorTableName,
					{
						skipConfirmation: true,
					},
				);

				if (dropResult.success) {
					xLog.status(`✓ Drop operation completed successfully`);
					xLog.status(`  ${dropResult.droppedCount} tables processed`);
				} else {
					xLog.error(`✗ Drop operation failed: ${dropResult.error}`);
				}
			} catch (error) {
				xLog.error(`Failed to drop tables: ${error.message}`);
			}

			// Show the empty state after dropping tables
			try {
				xLog.status('Database state after dropping tables:');
				showDatabaseStats(vectorDb, xLog);
			} catch (error) {
				xLog.error(`Failed to show database stats: ${error.message}`);
			}

			// Only exit if we're not also writing to the database
			const shouldExit = !switches.writeVectorDatabase;
			if (shouldExit) return { success: true, shouldExit: true };
		}

		// Handle purge progress (only with write operations)
		if (switches.purgeProgressTable) {
			if (!switches.writeVectorDatabase && !switches.rebuildDatabase) {
				xLog.error(
					'-purgeProgressTable can only be used with -writeVectorDatabase or -rebuildDatabase',
				);
				return { success: false, shouldExit: true };
			}

			try {
				progressTracker.purgeProgressTable(vectorDb, config.dataProfile);
				xLog.status(`Ready to start fresh for ${config.dataProfile} profile`);
			} catch (error) {
				xLog.error(`Purge progress table failed: ${error.message}`);
				return { success: false, shouldExit: true };
			}
		}

		if (switches.rebuildDatabase) {
			const {
				dataProfile,
				sourceTableName,
				sourcePrivateKeyName,
				sourceEmbeddableContentName,
				vectorTableName,
			} = config;

			xLog.status(
				`Starting Complete Database Rebuild for ${dataProfile.toUpperCase()} profile...`,
			);
			if (vectorTableName) {
				xLog.status(`Target table: "${vectorTableName}"`);
			}

			// Prepare configuration object for rebuild workflow
			const rebuildConfig = {
				dataProfile,
				sourceTableName,
				sourcePrivateKeyName,
				sourceEmbeddableContentName,
				vectorTableName,
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
						xLog.error(`Rebuild failed: ${err.message}`);
					} else {
						xLog.status('✓ Database rebuild completed successfully');
					}
				},
			);

			return { success: true, shouldExit: true };
		}

		if (switches.writeVectorDatabase || values.writeVectorDatabase) {
			return await handleVectorGeneration(
				config,
				openai,
				vectorDb,
				xLog,
				semanticAnalyzer,
				commandLineParameters,
			);
		}

		if (values.queryString) {
			return await handleQueryCommand(
				config,
				openai,
				vectorDb,
				xLog,
				semanticAnalyzer,
				commandLineParameters,
			);
		}

		// No commands specified - show help or default behavior
		xLog.status(
			'No operation specified. Use --help to see available commands.',
		);
		return { success: true, shouldExit: true };

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
