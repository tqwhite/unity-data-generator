#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

// const qt = require('qtools-functional-library'); //also exposes qtLog(); qt.help({printOutput:true, queryString:'.*', sendJson:false});

const os = require('os');
const path = require('path');
const fs = require('fs');


// =====================================================================
// MODULE FUNCTION
// =====================================================================
// ---------------------------------------------------------------------
// moduleFunction - provides vector similarity search functionality

const moduleFunction =
	({ moduleName } = {}) =>
	({
				openai,
				vectorDb,
			}) => {
		const { xLog, getConfig, rawConfig, commandLineParameters } =
			process.global;
		const localConfig = getConfig(moduleName); //moduleName is closure

		// ---------------------------------------------------------------------
		// dataProfileStrategies - defines key formatting strategies for different data profiles
		
		const dataProfileStrategies = {
			sif: {
				formatKeyForLookup: (key) => key.toString(), // Standard string conversion
				name: 'SIF'
			},
			ceds: {
				formatKeyForLookup: (key) => key.toString().padStart(6, '0'), // Zero-pad to 6 digits
				name: 'CEDS'
			},
			// Future profiles can be added here
			// ims: {
			//     formatKeyForLookup: (key) => key.toString().toUpperCase(),
			//     name: 'IMS'
			// }
		};

		// ---------------------------------------------------------------------
		// workingFunction - performs vector similarity search with data profile strategy
		
		const workingFunction = async (embeddingSpecs, queryString) => {
			const {
				sourceTableName,
				vectorTableName,
				sourcePrivateKeyName,
				sourceEmbeddableContentName,
				dataProfile, // Should be passed from vectorTools
			} = embeddingSpecs;
			
			// Get the strategy for this data profile
			const strategy = dataProfileStrategies[dataProfile];
			if (!strategy) {
				xLog.error(`Unknown data profile: ${dataProfile}. Supported profiles: ${Object.keys(dataProfileStrategies).join(', ')}`);
				return;
			}
			
			xLog.verbose(`Using ${strategy.name} lookup strategy for data profile: ${dataProfile}`);
			
			
			const resultCount = commandLineParameters.values.resultCount ? 
				parseInt(commandLineParameters.values.resultCount, 10) : 5;
				
			// ---------------------------------------------------------------------
			// processQueryString - transforms query strings for better search results
			
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
			xLog.verbose(`Original query: "${queryString}"`);
			xLog.verbose(`Processed query: "${processedQueryString}"`);
			
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
				const searchValue = vectorChoice[sourcePrivateKeyName];
				
				// Use the strategy to format the key for lookup
				const formattedKey = strategy.formatKeyForLookup(searchValue);
				xLog.verbose(`Looking up record with ${sourcePrivateKeyName}=${searchValue} (formatted as: ${formattedKey})`);
				
				// Use the formatted key for lookup
				const record = vectorDb.prepare(
					`select * from ${sourceTableName} where ${sourcePrivateKeyName}=?`
				).get(formattedKey);
				
				// Debug: Log what we found
				if (!record) {
					xLog.error(`No record found for ${sourcePrivateKeyName}=${formattedKey} using ${strategy.name} strategy`);
				} else {
					xLog.verbose(`Found record using ${strategy.name} strategy`);
				}
				
				return { ...vectorChoice, record };
			});
			
			// Filter out results where no record was found
			const validAnswers = answers.filter(item => item.record !== null && item.record !== undefined);
			
			if (validAnswers.length === 0) {
				xLog.error('No matching records found in source table. This suggests a data mismatch between vector table and source table.');
				xLog.error(`Vector table rowids: ${rows.map(r => r[sourcePrivateKeyName]).join(', ')}`);
				return;
			}
			
			// Format output dynamically based on the data profile fields
			if (commandLineParameters.switches.json) {
				xLog.result(JSON.stringify(validAnswers, '', '\t'));
			} else {
				xLog.status(`\n\nFound ${validAnswers.length} valid matches`);
				xLog.result(validAnswers.map((item, index) => {
					const distance = item.distance.toFixed(6);
					const refId = item.record[sourcePrivateKeyName] || '';
					
					// Build description from the embeddable content fields
					let description = '';
					if (Array.isArray(sourceEmbeddableContentName)) {
						description = sourceEmbeddableContentName
							.map(field => item.record[field] || '')
							.filter(value => value)
							.join(' | ');
					} else {
						description = item.record[sourceEmbeddableContentName] || '';
					}
					
					return `${index+1}. [score: ${distance}] ${refId} ${description}`;
				}).join('\n'));
			}
		};
		
		return { workingFunction };
	};

// =====================================================================
// MODULE EXPORTS
// =====================================================================


module.exports = moduleFunction({ moduleName }); //returns initialized moduleFunction