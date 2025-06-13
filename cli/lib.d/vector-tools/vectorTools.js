#!/usr/bin/env node
'use strict';

// Suppress punycode deprecation warning
process.noDeprecation = true;

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

const qt = require('qtools-functional-library'); //also exposes qtLog(); qt.help({printOutput:true, queryString:'.*', sendJson:false});

const os = require('os');
const path = require('path');
const fs = require('fs');

// --------------------------------------------------------------------------------
// FIND PROJECT ROOT
const findProjectRoot = ({ rootFolderName = 'system', closest = true } = {}) =>
	__dirname.replace(
		new RegExp(`^(.*${closest ? '' : '?'}\/${rootFolderName}).*$`),
		'$1',
	);
const applicationBasePath = findProjectRoot(); // call with {closest:false} if there are nested rootFolderName directories and you want the top level one

const commandLineParser = require('qtools-parse-command-line');
const commandLineParameters = commandLineParser.getParameters({
	applicationControls: ['-writeVectorDatabase', '-newDatabase', '-dropTable', '-showStats', '--offset', '--limit', '--resultCount', '--targetTableName'],
});
const generateEmbeddings = require('./lib/generate-embeddings');
const getClosestRecords = require('./lib/get-closest-records');
const { initVectorDatabase } = require('./lib/init-vector-database');
const { dropAllVectorTables } = require('./lib/drop-all-vector-tables');
const { showDatabaseStats } = require('./lib/show-database-stats');

// =============================================================================
// MODULE IMPORTS

//HACKERY: from some reason, putting require('generate-embeddings') AFTER this causes sqlite to screw up

// process.global.configPath=process.env.udgConfigPath; // unused, jina finds the config on its own, see node_modules/qtools-ai-thought-processor/...figure-out-config-path.js
const initAtp = require('../../../lib/qtools-ai-framework/jina')({
	configFileBaseName: moduleName,
	applicationBasePath,
	applicationControls: ['-writeVectorDatabase', '-newDatabase', '-dropTable', '-showStats', '--queryString', '--offset', '--limit', '--resultCount', '--targetTableName'],
}); // SIDE EFFECTS: Initializes xLog and getConfig in process.global





//START OF moduleFunction() ============================================================
const moduleFunction =
	({ moduleName } = {}) =>
	({ unused }) => {
		const { xLog, getConfig, rawConfig, commandLineParameters } =
			process.global;
		const { databaseFilePath, openAiApiKey, defaultTargetTableName } = getConfig(moduleName); //moduleName is closure

		const initOpenAi = () => {
			const OpenAI = require('openai');
			const openai = new OpenAI({
				apiKey: openAiApiKey,
			});
			return openai;
		};

		// ================================================================================
		const openai = initOpenAi();

		// ================================================================================
		
		const sourceTableName = 'naDataModel';
		// Use --targetTableName if provided, otherwise use default from config
		const vectorTableName = commandLineParameters.values.targetTableName || defaultTargetTableName;
		const sourcePrivateKeyName = 'refId';
		const sourceEmbeddableContentName = ['Description', 'XPath'];
		
		if (commandLineParameters.values.targetTableName) {
			xLog.status(`Using custom target table: ${vectorTableName}`);
		} else {
			xLog.status(`Using default target table: ${vectorTableName}`);
		}
		
		const vectorDb = initVectorDatabase(
			databaseFilePath,
			vectorTableName,
			xLog,
		); // showVecVersion(db);
		
		// Show database stats if requested
		if (commandLineParameters.switches.showStats) {
			xLog.status('Showing database statistics...');
			showDatabaseStats(vectorDb, xLog);
			return {}; // Exit after showing stats
		}
		
		// Handle -dropTable independently - SAFELY now only drops specified SIF vector table
		if (commandLineParameters.switches.dropTable) {
			xLog.status(`Safely dropping SIF vector table "${vectorTableName}" only...`);
			xLog.status(`IMPORTANT: This will NOT affect CEDS tables or other database tables`);
			
			// Pass the specific vector table name to ensure we only drop SIF tables
			dropAllVectorTables(vectorDb, xLog, vectorTableName);
			
			// Show the empty state after dropping tables
			xLog.status('Database state after dropping tables:');
			showDatabaseStats(vectorDb, xLog);
			
			// Only exit if we're not also writing to the database
			if (!commandLineParameters.switches.writeVectorDatabase) {
				return {}; // Exit after dropping tables
			}
		}
		
		if (commandLineParameters.switches.writeVectorDatabase) {
			generateEmbeddings({
				openai,
				vectorDb,
			}).workingFunction({
				sourceTableName,
				vectorTableName,
				sourcePrivateKeyName,
				sourceEmbeddableContentName,
			});
		}
		
		if (commandLineParameters.values.queryString) {
			getClosestRecords({
				openai,
				vectorDb,
			}).workingFunction({
				sourceTableName,
				vectorTableName,
				sourcePrivateKeyName,
				sourceEmbeddableContentName,
			},
			commandLineParameters.values.queryString.qtLast(),
				
			);
		}

		return {};
	};

//END OF moduleFunction() ============================================================


module.exports = moduleFunction({ moduleName })({}); //runs it right now
//module.exports = moduleFunction({config, commandLineParameters, moduleName})();