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
	({ openai, vectorDb }) => {
		const { xLog, getConfig, rawConfig, commandLineParameters } =
			process.global;
		const { unused } = getConfig(moduleName); //moduleName is closure

		// ================================================================================

		const showVecVersion = (vectorDb) => {
			const { sqlite_version, vec_version } = vectorDb
				.prepare(
					'select sqlite_version() as sqlite_version, vec_version() as vec_version;',
				)
				.get();

			console.log(
				`sqlite_version=${sqlite_version}, vec_version=${vec_version}`,
			);
		};
		
		const getVectorTableCount = (vectorDb, vectorTableName) => {
			// Check if the table exists
			const tableExists = vectorDb
				.prepare(
					`SELECT name FROM sqlite_master WHERE name = ?;`,
				)
				.all(vectorTableName);
				
			if (tableExists.length > 0) {
				// Count the records in the vector table
				const countResult = vectorDb
					.prepare(`SELECT COUNT(*) as count FROM ${vectorTableName};`)
					.get();
				return countResult.count;
			}
			return 0;
		};
		
		const initVectorTables = (vectorDb, vectorTableName, createNew=false) => {
			// Check if table exists
			const tableList = vectorDb
				.prepare(
					`SELECT name FROM sqlite_master WHERE name LIKE '${vectorTableName}%';`,
				)
				.all();
			
			// If table exists, get current count before potential drop
			let initialCount = 0;
			if (tableList.length) {
				initialCount = getVectorTableCount(vectorDb, vectorTableName);
			}
			
			// If createNew flag is true, drop and recreate the table
			if (createNew) {
				if (tableList.length) {
					xLog.status(`OVERWRITING preexisting ${vectorTableName} with ${initialCount} records`);
					tableList.forEach(({ name }) => vectorDb.exec(`drop table if exists ${name};`));
				}
				vectorDb.exec(
					`CREATE VIRTUAL TABLE ${vectorTableName} USING vec0(embedding float[1536])`,
				);
				xLog.status(`Created new vector table: ${vectorTableName}`);
			} 
			// If table doesn't exist, create it
			else if (!tableList.length) {
				xLog.status(`Table ${vectorTableName} does not exist. Creating it.`);
				vectorDb.exec(
					`CREATE VIRTUAL TABLE ${vectorTableName} USING vec0(embedding float[1536])`,
				);
			}
			// If table exists and we're not creating new, just use existing table
			else {
				xLog.status(`Using existing table: ${vectorTableName} with ${initialCount} records`);
			}
		};

		const getEmbeddableData = (
			vectorDb,
			{
				sourceTableName,
				vectorTableName,
				sourcePrivateKeyName,
				sourceEmbeddableContentName,
			},
			{
				offset = 0,
				limit = 3
			} = {}
		) => {
			// Use offset and limit from parameters
			const embeddableData = vectorDb
				.prepare(
					`SELECT * FROM ${sourceTableName} LIMIT ${limit} OFFSET ${offset};`,
				)
				.all();
			xLog.status(`Processing ${embeddableData.length} records from ${sourceTableName} (LIMIT ${limit} OFFSET ${offset})`);
			return embeddableData;
		};

		const getEmbeddingVectors = async (
			openai,
			embeddableData,
			sourceEmbeddableContentName,
		) => {
				// Helper function to process XPath values
				const processXPathValue = (value) => {
					if (!value) return '';
					
					// Step 1: Replace slashes with spaces
					let processed = value.replace(/\//g, ' ');
					
					// Step 2: Split words on camel case
					// Insert spaces before capital letters that are preceded by lowercase letters
					// This handles camelCase -> camel Case
					processed = processed.replace(/([a-z])([A-Z])/g, '$1 $2');
					
					// Step 3: Remove leading 'x' or 'X' characters from each word
					// Split into words, process each word, then rejoin
					processed = processed.split(' ')
						.map(word => {
							// Remove leading 'x' or 'X' from words
							return word.replace(/^[xX](?=[a-zA-Z])/g, '');
						})
						.join(' ');
					
					return processed;
				};
				
				const transformForOpenAi = (
					embeddableData,
					sourceEmbeddableContentName,
				) => {
					return embeddableData.map((item) => {
						if (Array.isArray(sourceEmbeddableContentName)) {
							// Join the values of multiple fields with a space
							return sourceEmbeddableContentName
								.map(field => {
									let value = item[field] || '';
									// Apply enhanced processing to XPath field
									if (field === 'XPath' && value) {
										value = processXPathValue(value);
									}
									return value;
								})
								.filter(value => value)
								.join(' ');
						} else {
							let value = item[sourceEmbeddableContentName] || '';
							// Apply enhanced processing if this is the XPath field
							if (sourceEmbeddableContentName === 'XPath' && value) {
								value = processXPathValue(value);
							}
							return value;
						}
					});
				};

			const embedding = await openai.embeddings.create({
				model: 'text-embedding-3-small',
				input: transformForOpenAi(embeddableData, sourceEmbeddableContentName),
				encoding_format: 'float',
			});

			return embedding;
		};

		const putVectorsIntoDatabase = ({
			vectorDb,
			embedding,
			embeddableData,
			sourcePrivateKeyName,
			vectorTableName,
		}) => {
			const vectorInput = embedding.data.map((vectorItem) => [
				embeddableData[vectorItem.index][sourcePrivateKeyName],
				vectorItem.embedding,
			]);

			const insertStmt = vectorDb.prepare(
				`INSERT INTO ${vectorTableName}(rowid, embedding) VALUES (?, ?)`,
			);
			
			// Create a delete statement to remove existing records before inserting
			const deleteStmt = vectorDb.prepare(
				`DELETE FROM ${vectorTableName} WHERE rowid = ?`
			);
			
			const interval=500;
			let counter=0;
			
			const writeVectors = vectorDb.transaction((vectorInput) => {
				for (const [id, vector] of vectorInput) {
					try {
						// Delete any existing record with this ID first to avoid UNIQUE constraint errors
						deleteStmt.run(BigInt(id));
						// Then insert the new record
						insertStmt.run(BigInt(id), new Float32Array(vector));
						counter++;
						if (counter%interval == 0){
							xLog.status(`processed ${counter} records`);
						}
					} catch (error) {
						xLog.error(`Error processing record ${id}: ${error.message}`);
					}
				}
			})(vectorInput);
			
			// Get the final count after inserting
			const finalCount = getVectorTableCount(vectorDb, vectorTableName);
			xLog.status(`Vector table now has ${finalCount} total records`);
		};

		// ================================================================================
		
		// Get the total count of records to process
		const getTotalRecordCount = (vectorDb, sourceTableName) => {
			const result = vectorDb
				.prepare(`SELECT COUNT(*) as count FROM ${sourceTableName}`)
				.get();
			return result.count;
		};
		
		const workingFunction = async (embeddingSpecs) => {
			const {
				sourceTableName,
				vectorTableName,
				sourcePrivateKeyName,
				sourceEmbeddableContentName,
			} = embeddingSpecs;
			
			// Set batch size to 1000 records per API call
			const BATCH_SIZE = 1000;
			
			// Use command line offset if provided, otherwise start from 0
			let currentOffset = commandLineParameters.values.offset ? 
				parseInt(commandLineParameters.values.offset, 10) : 0;
			
			// Check if we should create a new database or add to existing
			const createNew = commandLineParameters.switches.newDatabase || false;
			
			// Initialize the vector table
			initVectorTables(vectorDb, vectorTableName, createNew);
			
			// Get total records to process
			const totalRecords = getTotalRecordCount(vectorDb, sourceTableName);
			xLog.status(`Total records to process: ${totalRecords}`);
			
			// Calculate remaining records based on offset
			const remainingRecords = totalRecords - currentOffset;
			
			if (remainingRecords <= 0) {
				xLog.status(`No records to process starting from offset ${currentOffset}`);
				return;
			}
			
			// Process in batches
			let processedCount = 0;
			let totalProcessed = 0;
			
			// Process batches until we've done all remaining records
			while (processedCount < remainingRecords) {
				// Determine the batch size (limit) for this iteration
				const batchSize = Math.min(BATCH_SIZE, remainingRecords - processedCount);
				
				xLog.status(`Processing batch of ${batchSize} records starting at offset ${currentOffset} (${totalProcessed}/${remainingRecords} completed)`);
				
				// Get the current batch of data
				const embeddableData = getEmbeddableData(vectorDb, embeddingSpecs, { 
					offset: currentOffset, 
					limit: batchSize 
				});
				
				if (embeddableData.length === 0) {
					xLog.status(`No more records to process.`);
					break;
				}
				
				// Get embeddings for this batch
				const embedding = await getEmbeddingVectors(
					openai,
					embeddableData,
					sourceEmbeddableContentName,
				);
				
				xLog.status(`Got ${embedding.data.length} embeddings from OpenAI API`);
				
				// Store the embeddings in the database
				putVectorsIntoDatabase({
					vectorDb,
					embedding,
					embeddableData,
					sourcePrivateKeyName,
					vectorTableName,
				});
				
				// Update counters
				processedCount += embeddableData.length;
				totalProcessed += embeddableData.length;
				currentOffset += embeddableData.length;
				
				xLog.status(`Batch complete. Total processed: ${totalProcessed}/${remainingRecords}`);
			}
			
			xLog.status(`Processing complete. Total records processed: ${totalProcessed}`);
		};

		xLog.status(`${moduleName} is initialized`);
		return { workingFunction };
	};

//END OF moduleFunction() ============================================================


module.exports = moduleFunction({ moduleName }); //returns initialized moduleFunction