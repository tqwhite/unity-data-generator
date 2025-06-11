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
	applicationControls: ['-writeVectorDatabase', '--resultCount'],
});
const generateEmbeddings = require('./lib/generate-embeddings');
const getClosestRecords = require('./lib/get-closest-records');

// =============================================================================
// MODULE IMPORTS

//HACKERY: from some reason, putting require('generate-embeddings') AFTER this causes sqlite to screw up

// process.global.configPath=process.env.udgConfigPath; // unused, jina finds the config on its own, see node_modules/qtools-ai-thought-processor/...figure-out-config-path.js
const initAtp = require('../../../lib/qtools-ai-framework/jina')({
	configFileBaseName: moduleName,
	applicationBasePath,
	applicationControls: ['-writeVectorDatabase', '--queryString', '--resultCount', '-json'],
}); // SIDE EFFECTS: Initializes xLog and getConfig in process.global


const initVectorDatabase = (databaseFilePath, vectorTableName, xLog) => {
	const sqliteVec = require('sqlite-vec');
	const db = require('better-sqlite3')(databaseFilePath, {});
	sqliteVec.load(db);
	return db;
};

//START OF moduleFunction() ============================================================
const moduleFunction =
	({ moduleName } = {}) =>
	({ unused }) => {
		const { xLog, getConfig, rawConfig, commandLineParameters } =
			process.global;
		const { databaseFilePath, openAiApiKey } = getConfig(moduleName); //moduleName is closure

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
		
		const sourceTableName = '_CEDSElements';
		const vectorTableName = 'cedsElementVectors';
		const sourcePrivateKeyName = 'GlobalID';
		const sourceEmbeddableContentName = 'Definition';
		
		xLog.status(`using data table ${databaseFilePath}:${vectorTableName}`);
		const vectorDb = initVectorDatabase(
			databaseFilePath,
			vectorTableName,
			xLog,
		); // showVecVersion(db);
		
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