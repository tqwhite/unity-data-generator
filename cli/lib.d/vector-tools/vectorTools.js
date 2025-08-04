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
		'--query',
		'--whereClause',
		'--resultLimit',
		'-json',
		'-useFramework',
		'-useLegacy',
		'--thoughtProcess',
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

const { directQueryTool } = require('./lib/direct-query-tool/direct-query-tool')({});

const frameworkOperationRouterGen = require('./lib/framework-operation-router/framework-operation-router');
const frameworkOperationRouter = frameworkOperationRouterGen({});

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

		// ================================================================================
		// OPERATION ROUTING - Use framework-operation-router to determine path
		
		// Prepare legacy operations object for router
		const legacyOperations = {
			queryVectorDatabase: async () => {
				return await queryVectorDatabase(prettyPrintAtomicExpansion)(
					config,
					openai,
					vectorDb,
					semanticAnalyzer,
				);
			},
			createVectorDatabase: async () => {
				const progressTracker = require('./lib/progress-tracker')({});
				return await createVectorDatabase(progressTracker)(
					config,
					openai,
					vectorDb,
					semanticAnalyzer,
				);
			},
			showDatabaseStats: async () => {
				return await databaseOperations.showStats(
					config,
					vectorDb,
					semanticAnalyzer,
				);
			},
			dropVectorTable: async () => {
				return await databaseOperations.dropTable(
					config,
					vectorDb,
					semanticAnalyzer,
				);
			},
			rebuildVectorDatabase: async () => {
				return await replaceExistingDatabase(
					config,
					openai,
					vectorDb,
					semanticAnalyzer,
				);
			},
			directQueryTool: async () => {
				const queryType = commandLineParameters.values.query.qtLast();
				const queryOptions = {
					queryType,
					whereClause: commandLineParameters.values.whereClause?.[0] || null,
					resultLimit: commandLineParameters.values.resultLimit?.[0] || null
				};
				return directQueryTool({ config, vectorDb, queryOptions });
			},
			showHelp: () => {
				console.log(helpText);
			}
		};

		// Use the router to determine and execute the appropriate operation
		return await frameworkOperationRouter.routeOperation({
			commandLineParameters,
			initAtp,
			legacyOperations
		});
	};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction({ moduleName })({});

