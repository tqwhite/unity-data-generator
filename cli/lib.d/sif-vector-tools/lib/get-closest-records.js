#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

// const qt = require('qtools-functional-library'); //also exposes qtLog(); qt.help({printOutput:true, queryString:'.*', sendJson:false});

const os = require('os');
const path = require('path');
const fs = require('fs');


//START OF moduleFunction() ============================================================
const moduleFunction =
	({ moduleName } = {}) =>
	({
				openai,
				vectorDb,
			}) => {
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
			
			
			const queryEmbed = await openai.embeddings.create({
				model: 'text-embedding-3-small',
				input: queryString,
				encoding_format: 'float',
			});

			const query = queryEmbed.data[0].embedding;
			const rows = vectorDb
				.prepare(
					`SELECT rowid as '${sourcePrivateKeyName}', distance FROM ${vectorTableName} WHERE embedding MATCH ? ORDER BY distance LIMIT 10`,
				)
				.all(new Float32Array(query));

			const answers = rows.map(vectorChoice => {
				const record = vectorDb.prepare(
					`select * from ${sourceTableName} where ${sourcePrivateKeyName}=?`
				).get(vectorChoice[sourcePrivateKeyName].toString());
				return { ...vectorChoice, record };
			});
			
			// Format output similar to CEDS but with SIF-specific fields
			xLog.result(answers.map(item => {
				const description = item.record.Description || '';
				const xpath = item.record.XPath || '';
				const refId = item.record.refId || '';
				return `${refId} ${description} ${xpath}`;
			}).join('\n'));
		};
		

		xLog.status(`${moduleName} is initialized`);
		return { workingFunction };
	};

//END OF moduleFunction() ============================================================


module.exports = moduleFunction({ moduleName }); //returns initialized moduleFunction