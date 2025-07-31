#!/usr/bin/env node
'use strict';

// Suppress punycode deprecation warning
process.noDeprecation = true;

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const qt = require('qtools-functional-library');

const os = require('os');
const path = require('path');
const fs = require('fs');

// findProjectRoot - locate system directory
const findProjectRoot = ({ rootFolderName = 'system', closest = true } = {}) =>
	__dirname.replace(
		new RegExp(`^(.*${closest ? '' : '?'}\/${rootFolderName}).*$`),
		'$1',
	);
const applicationBasePath = findProjectRoot();

const helpText = require('./lib/help-text')({});

// Initialize AI framework with command line controls
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
});

// =====================================================================
// MODULE IMPORTS (AFTER JINA INITIALIZATION)
// =====================================================================

const databaseOperationsGen = require('./lib/database-operations');
const aiOperationsGen = require('./lib/ai-operations');
const { prettyPrintAtomicExpansion } =
	require('./lib/pretty-print-atomic-expansion')({});
const { queryVectorDatabase } = require('./lib/query-vector-database')({});
const { reorganizeConfig } = require('./lib/assemble-config')({});
const { createVectorDatabase } = require('./lib/create-vector-database')({});
const { replaceExistingDatabase } = require('./lib/replace-existing-database')(
	{},
);

// ---------------------------------------------------------------------
// moduleFunction - main application entry point and execution pipeline

const moduleFunction =
	({ moduleName } = {}) =>
	async ({ unused }) => {
		const { xLog, getConfig, rawConfig, commandLineParameters } =
			process.global;

		const databaseOperations = databaseOperationsGen({});

		const { openai } = aiOperationsGen({});

		// Initialize semantic analyzer library
		const semanticAnalyzerLibrary =
			require('./lib/semanticAnalyzers/semantic-analyzer-library')({});

		const semanticAnalysisMode = commandLineParameters.qtGetSurePath(
			'values.semanticAnalysisMode[0]',
			'simpleVector',
		);
		const semanticAnalyzer = semanticAnalyzerLibrary.getAnalyzer({
			semanticAnalysisMode,
			xLog,
		});

		// Extract command line switches and values
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

		const config = reorganizeConfig(getConfig(moduleName));
		if (!config.isValid) {
			return {};
		}

		// ---------------------------------------------------------------------
		// 2. Prepare modules for application initializer
		const progressTracker = require('./lib/progress-tracker')({});

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
			showDatabaseStats(vectorDb, xLog);
		}

		// Progress tracking commands
		if (switches.showProgress) {
			progressTracker.showProgress(vectorDb);
		}

		// Resume incomplete batch operations
		if (switches.resume) {
			return await createVectorDatabase(progressTracker)(
				config,
				openai,
				vectorDb,
				xLog,
				semanticAnalyzer,
				commandLineParameters,
			);
		}

		// Drop specific vector tables
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

		// Execute complete database rebuild workflow
		if (switches.rebuildDatabase) {
			const {
				dataProfile,
				sourceTableName,
				sourcePrivateKeyName,
				sourceEmbeddableContentName,
				vectorTableName,
			} = config;

			// Execute rebuild workflow
			replaceExistingDatabase(
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
				databaseOperations,
				databaseOperations,
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

		// Generate new vectors for database
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

		// Execute semantic similarity query
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
	};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction({ moduleName })({});

