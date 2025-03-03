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
			const transformForOpenAi = (
				embeddableData,
				sourceEmbeddableContentName,
			) => {
				return embeddableData.map((item) => {
					if (Array.isArray(sourceEmbeddableContentName)) {
						// Join the values of multiple fields with a space
						return sourceEmbeddableContentName
							.map(field => item[field] || '')
							.filter(value => value)
							.join(' ');
					} else {
						return item[sourceEmbeddableContentName] || '';
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
			const interval=10;
			let counter=0;
			const writeVectors = vectorDb.transaction((vectorInput) => {
				for (const [id, vector] of vectorInput) {
					insertStmt.run(BigInt(id), new Float32Array(vector));
					counter++;
					if (counter%interval == 0){
						xLog.status(`processed ${counter} records`);
					}
				}
			})(vectorInput);
			
			// Get the final count after inserting
			const finalCount = getVectorTableCount(vectorDb, vectorTableName);
			xLog.status(`Vector table now has ${finalCount} total records`);
		};

		// ================================================================================

		const workingFunction = async (embeddingSpecs) => {
			const {
				sourceTableName,
				vectorTableName,
				sourcePrivateKeyName,
				sourceEmbeddableContentName,
			} = embeddingSpecs;
			
			// Get offset and limit from command line parameters or use defaults
			const offset = commandLineParameters.values.offset ? 
				parseInt(commandLineParameters.values.offset, 10) : 0;
			const limit = commandLineParameters.values.limit ? 
				parseInt(commandLineParameters.values.limit, 10) : 3;
					
			// Check if we should create a new database or add to existing
			const createNew = commandLineParameters.switches.newDatabase || false;
			
			initVectorTables(vectorDb, vectorTableName, createNew);

			const embeddableData = getEmbeddableData(vectorDb, embeddingSpecs, { offset, limit });

			const embedding = await getEmbeddingVectors(
				openai,
				embeddableData,
				sourceEmbeddableContentName,
			);
			
			xLog.status(`found ${embedding.data.length} embeddable records`);
			putVectorsIntoDatabase({
				vectorDb,
				embedding,
				embeddableData,
				sourcePrivateKeyName,
				vectorTableName,
			});
		};

		xLog.status(`${moduleName} is initialized`);
		return { workingFunction };
	};

//END OF moduleFunction() ============================================================


module.exports = moduleFunction({ moduleName }); //returns initialized moduleFunction