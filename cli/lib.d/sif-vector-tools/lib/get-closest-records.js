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
			
			
			const resultCount = commandLineParameters.values.resultCount ? 
				parseInt(commandLineParameters.values.resultCount, 10) : 5;
				
			// Process query string the same way we process XPath values for consistency
			const processQueryString = (value) => {
				if (!value) return '';
				
				// Apply the same transformations as we do for XPath fields
				// Step 1: Replace slashes with spaces
				let processed = value.replace(/\//g, ' ');
				
				// Step 2: Split words on camel case
				processed = processed.replace(/([a-z])([A-Z])/g, '$1 $2');
				
				// Step 3: Remove leading 'x' or 'X' characters from each word
				processed = processed.split(' ')
					.map(word => word.replace(/^[xX](?=[a-zA-Z])/g, ''))
					.join(' ');
				
				return processed;
			};
			
			// Apply the processing to the query string
			const processedQueryString = processQueryString(queryString);
			xLog.status(`Original query: "${queryString}"`);
			xLog.status(`Processed query: "${processedQueryString}"`);
			
			const queryEmbed = await openai.embeddings.create({
				model: 'text-embedding-3-small',
				input: processedQueryString,
				encoding_format: 'float',
			});

			const query = queryEmbed.data[0].embedding;
			const rows = vectorDb
				.prepare(
					`SELECT rowid as '${sourcePrivateKeyName}', distance FROM ${vectorTableName} WHERE embedding MATCH ? ORDER BY distance LIMIT ${resultCount}`,
				)
				.all(new Float32Array(query));

			const answers = rows.map(vectorChoice => {
				const record = vectorDb.prepare(
					`select * from ${sourceTableName} where ${sourcePrivateKeyName}=?`
				).get(vectorChoice[sourcePrivateKeyName].toString());
				return { ...vectorChoice, record };
			});
			
			// Format output similar to CEDS but with SIF-specific fields and distance score
			xLog.status(`Found ${answers.length} matches, sorted by distance (lowest/best match first):`);
			xLog.result(answers.map((item, index) => {
				const description = item.record.Description || '';
				const xpath = item.record.XPath || '';
				const refId = item.record.refId || '';
				const distance = item.distance.toFixed(6); // Format distance to 6 decimal places
				return `${index+1}. [score: ${distance}] ${refId} ${description} ${xpath}`;
			}).join('\n'));
		};
		
		return { workingFunction };
	};

//END OF moduleFunction() ============================================================


module.exports = moduleFunction({ moduleName }); //returns initialized moduleFunction