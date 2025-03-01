#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

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

		const initVectorTables = (vectorDb, vectorTableName) => {
			const tableList = vectorDb
				.prepare(
					`SELECT name FROM sqlite_master WHERE name LIKE '${vectorTableName}%';`,
				)
				.all();
			if (tableList.length) {
				xLog.status(`OVERWRITING preexisting ${vectorTableName}`);
			}
			tableList.forEach(({ name }) =>
				vectorDb.exec(`drop table if exists ${name};`),
			);
			vectorDb.exec(
				`CREATE VIRTUAL TABLE ${vectorTableName} USING vec0(embedding float[1536])`,
			);
		};

		const getEmbeddableData = (
			vectorDb,
			{
				sourceTableName,
				vectorTableName,
				sourcePrivateKeyName,
				sourceEmbeddableContentName,
			},
		) => {
			const embeddableData = vectorDb
				.prepare(
					`SELECT ${sourcePrivateKeyName}, ${sourceEmbeddableContentName} FROM ${sourceTableName};`,
				)
				.all();
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
			) => embeddableData.map((item) => item[sourceEmbeddableContentName]);

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
			const interval = 10;
			let counter = 0;
			const writeVectors = vectorDb.transaction((vectorInput) => {
				for (const [id, vector] of vectorInput) {
					insertStmt.run(BigInt(id), new Float32Array(vector));
					counter++;
					if (counter % interval == 0) {
						xLog.status(`processed ${counter} records`);
					}
				}
			})(vectorInput);
		};

		// ================================================================================

		const workingFunction = async (embeddingSpecs) => {
			const {
				sourceTableName,
				vectorTableName,
				sourcePrivateKeyName,
				sourceEmbeddableContentName,
			} = embeddingSpecs;

			initVectorTables(vectorDb, vectorTableName);

			const embeddableData = getEmbeddableData(vectorDb, embeddingSpecs);

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

		return { workingFunction };
	};

//END OF moduleFunction() ============================================================


module.exports = moduleFunction({ moduleName }); //returns initialized moduleFunction


