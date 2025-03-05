#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

// const qt = require('qtools-functional-library'); //also exposes qtLog(); qt.help({printOutput:true, queryString:'.*', sendJson:false});

const os = require('os');
const path = require('path');
const fs = require('fs');


// npm i qtools-functional-library
// npm i qtools-config-file-processor
// npm i qtools-parse-command-line
// npm i qtools-asynchronous-pipe-plus # often want this for later

//
// const commandLineParser = require('qtools-parse-command-line');
// const configFileProcessor = require('qtools-config-file-processor');
//
// const path=require('path');
// const fs=require('fs');
// const os=require('os');
//
// --------------------------------------------------------------------------------
// FIND PROJECT ROOT
// const findProjectRoot=({rootFolderName='system', closest=true}={})=>__dirname.replace(new RegExp(`^(.*${closest?'':'?'}\/${rootFolderName}).*$`), "$1");
// const projectRoot=findProjectRoot(); // call with {closest:false} if there are nested rootFolderName directories and you want the top level one
//--------------------------------------------------------------
// FIGURE OUT CONFIG
// const configName= os.hostname() == 'qMax.local' ? 'instanceSpecific/qbook' : '' ; //when deployed, usually the config is in the configs/ dir
// const configDirPath = `${projectRoot}/configs/${configName}/`;
// const config = configFileProcessor.getConfig('systemParameters.ini', configDirPath)
//
//
// const commandLineParameters = commandLineParser.getParameters();
//
//
// console.dir({['config']:config}, { showHidden: false, depth: 4, colors: true });
// console.dir({['commandLineParameters']:commandLineParameters}, { showHidden: false, depth: 4, colors: true });

//START OF moduleFunction() ============================================================
const moduleFunction =
	({ moduleName } = {}) =>
	({ openai, vectorDb }) => {
		const { xLog, getConfig, rawConfig, commandLineParameters } =
			process.global;
		const localConfig = getConfig(moduleName); //moduleName is closure

		const workingFunction = async (embeddingSpecs, queryString) => {
			const {
				sourceTableName,
				vectorTableName,
				sourcePrivateKeyName,
				sourceEmbeddableContentName,
			} = embeddingSpecs;

			const resultCount = commandLineParameters.values.resultCount
				? parseInt(commandLineParameters.values.resultCount, 10)
				: 10;

			const queryEmbed = await openai.embeddings.create({
				model: 'text-embedding-3-small',
				input: queryString,
				encoding_format: 'float',
			});

			const query = queryEmbed.data[0].embedding; //[0.3, 0.3, 0.3, 0.3];
			const rows = vectorDb
				.prepare(
					`SELECT rowid as '${sourcePrivateKeyName}', distance FROM ${vectorTableName} WHERE embedding MATCH ? ORDER BY distance LIMIT ${resultCount}`,
				)
				.all(new Float32Array(query));

			const answers = rows.map((vectorChoice) => {
				const record = vectorDb
					.prepare(
						`select * from ${sourceTableName} where ${sourcePrivateKeyName}=?`,
					)
					.get(vectorChoice[sourcePrivateKeyName].toString().padStart(6, '0'));
				return { ...vectorChoice, record };
			});
			if (commandLineParameters.switches.json) {
				xLog.result(JSON.stringify(answers, '', '\t'));
			} else {
				xLog.result(
					answers
						.map(
							(item) =>
								`${item.record.GlobalID} ${item.record.ElementName} ${item.record.Definition}`,
						)
						.join('\n'),
				);
			}
		};

		return { workingFunction };
	};

//END OF moduleFunction() ============================================================


module.exports = moduleFunction({ moduleName }); //returns initialized moduleFunction

