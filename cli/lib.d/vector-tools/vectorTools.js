#!/usr/bin/env node
'use strict';

// Suppress punycode deprecation warning
process.noDeprecation = true;

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

const qt = require('qtools-functional-library'); //also exposes qtLog(); qt.help({printOutput:true, queryString:'.*', sendJson:false});

const os = require('os');
const path = require('path');
const fs = require('fs');

const findProjectRoot = ({ rootFolderName = 'system', closest = true } = {}) =>
	__dirname.replace(
		new RegExp(`^(.*${closest ? '' : '?'}\/${rootFolderName}).*$`),
		'$1',
	);
const applicationBasePath = findProjectRoot(); // call with {closest:false} if there are nested rootFolderName directories and you want the top level one

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
const { prettyPrintAtomicExpansion } = require('./lib/pretty-print-atomic-expansion')({});
const { queryVectorDatabase } = require('./lib/query-vector-database')({});
const { assembleConfig } = require('./lib/assemble-config')({});
const { createVectorDatabase } = require('./lib/create-vector-database')({});

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

		if (switches.showStats && switches.rebuildDatabase) {
			xLog.error(
				`Cannot do (switches.showStats && switches.rebuildDatabase. Exiting.}`,
			);
			process.exit(1);
		}




		// =====================================================================
		// MAIN APPLICATION EXECUTION PIPELINE
		// =====================================================================


		// ---------------------------------------------------------------------
		// 1. Get and validate configuration


		const config = assembleConfig(xLog, getConfig, commandLineParameters)(moduleName);
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
				return await createVectorDatabase(progressTracker)(
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




			// Execute rebuild workflow
			executeRebuildWorkflow(
				{
				dataProfile,
				sourceTableName,
				sourcePrivateKeyName,
				sourceEmbeddableContentName,
				vectorTableName,
			},
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
			return await createVectorDatabase(progressTracker)(
				config,
				openai,
				vectorDb,
				xLog,
				semanticAnalyzer,
				commandLineParameters,
			);
		}

		if (values.queryString) {
			return await queryVectorDatabase(prettyPrintAtomicExpansion)(
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
