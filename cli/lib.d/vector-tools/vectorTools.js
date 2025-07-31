#!/usr/bin/env node
'use strict';

process.noDeprecation = true;

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const qt = require('qtools-functional-library');

const os = require('os');
const path = require('path');
const fs = require('fs');

const findProjectRoot = ({ rootFolderName = 'system', closest = true } = {}) =>
	__dirname.replace(
		new RegExp(`^(.*${closest ? '' : '?'}\/${rootFolderName}).*$`),
		'$1',
	);
const applicationBasePath = findProjectRoot();

const helpText = require('./lib/help-text')({});

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

const databaseOperationsGen = require('./lib/database-operations');
const aiOperationsGen = require('./lib/ai-operations');
const { prettyPrintAtomicExpansion } =
	require('./lib/pretty-print-atomic-expansion')({});
const { queryVectorDatabase } = require('./lib/query-vector-database')({});
const { reorganizeValidateConfig } = require('./lib/assemble-config')({});
const { createVectorDatabase } = require('./lib/create-vector-database')({});
const { replaceExistingDatabase } = require('./lib/replace-existing-database')(
	{},
);

const semanticAnalyzerLibrary =
	require('./lib/semanticAnalyzers/semantic-analyzer-library')({});

//START OF moduleFunction() ============================================================
const moduleFunction =
	({ moduleName } = {}) =>
	async ({ unused }) => {
		const { xLog, getConfig, rawConfig, commandLineParameters } =
			process.global;
		

		const config = reorganizeValidateConfig(getConfig(moduleName));

		const { openai } = aiOperationsGen({});
		
		const semanticAnalyzer = semanticAnalyzerLibrary.getAnalyzer(); // gets --semanticAnalysisMode from command line

		const databaseOperations = databaseOperationsGen({});

		const vectorDb = databaseOperations.initializeDatabase(
			config.qtSelectProperties(['databaseFilePath', 'vectorTableName']),
		);

		const switches = commandLineParameters.switches;
		const values = commandLineParameters.values;

		if (switches.showStats && switches.rebuildDatabase) {
			xLog.error(
				`Cannot do (switches.showStats && switches.rebuildDatabase. Exiting.}`,
			);
			process.exit(1);
		}

		const progressTracker = require('./lib/progress-tracker')({});

		// ====================================================================================
		// MANAGEMENT UTILITY OPERATIONS

		if (switches.showStats) {
			databaseOperations.showDatabaseStats(vectorDb);
		}

		if (switches.showProgress) {
			progressTracker.showProgress(vectorDb);
		}

		if (switches.dropTable) {
			databaseOperations.validateAndExecuteDropTable(config, vectorDb, switches);
		}

		if (switches.purgeProgressTable) {
			progressTracker.validateAndExecutePurgeProgressTable({
				vectorDb,
				config
			});
		}

		// ====================================================================================
		// DATABASE UPDATTE FUNCTIONS

		if (switches.rebuildDatabase) {

			replaceExistingDatabase(
				config,
				vectorDb,
				openai,
				semanticAnalyzer,
				databaseOperations,
				databaseOperations,
				(err) => {
					if (err) {
						xLog.error(`Rebuild failed: ${err.message}`);
					} else {
						xLog.status('✓ Database rebuild completed successfully');
					}
				},
			);
		}

		if (switches.resume) {
			return await createVectorDatabase(progressTracker)(
				config,
				openai,
				vectorDb,
				semanticAnalyzer,
			);
		}

		if (switches.writeVectorDatabase || values.writeVectorDatabase) {
			return await createVectorDatabase(progressTracker)(
				config,
				openai,
				vectorDb,
				semanticAnalyzer,
			);
		}

		// ====================================================================================
		// LOOKUP BY VECTOR FUNCTION

		if (values.queryString) {
			return await queryVectorDatabase(prettyPrintAtomicExpansion)(
				config,
				openai,
				vectorDb,
				semanticAnalyzer,
			);
		}

		xLog.status(
			'No operation specified. Use --help to see available commands.',
		);
		return { success: true, shouldExit: true };
	};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction({ moduleName })({});

