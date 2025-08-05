#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const qt = require('qtools-functional-library');

//START OF moduleFunction() ============================================================

const moduleFunction = function (args = {}) {
	const { xLog, getConfig } = process.global;
	const { thinkerParameters={}, promptGenerator } = args; // Extract from args with default
	const localThinkerParameters = thinkerParameters.qtGetSurePath(moduleName, {});
	const allThinkersParameters = thinkerParameters.qtGetSurePath('allThinkers', {});
	
	// Priority: localThinkerParameters > allThinkersParameters > configFromSection
	const configFromSection = getConfig(moduleName);
	const finalConfig = { ...configFromSection, ...allThinkersParameters, ...localThinkerParameters };
	
	xLog.verbose(`Thinker Parameters (${moduleName})\n    `+Object.keys(finalConfig).map(name=>`${name}=${finalConfig[name]}`).join('\n    '));
	const { thinkerSpec, smartyPants } = args;

	// ================================================================================
	// UTILITIES

	const formulatePromptList =
		(promptGenerator) =>
		({ latestWisdom } = {}) => {
			return promptGenerator.iterativeGeneratorPrompt({
				...latestWisdom,
				employerModuleName: moduleName,
			});
		};

	// ================================================================================
	// REAL VECTOR SEARCH OPERATIONS

	// Import required modules at module level
	const OpenAI = require('openai');
	const Database = require('better-sqlite3');
	const { reorganizeValidateConfig } = require('../../lib/assemble-config')({});

	const performVectorQuery = async (args) => {
		const { queryString, dataProfile, semanticAnalysisMode, resultCount, verbose } = args;
		
		xLog.status(`${moduleName}: Direct OpenAI + SQLite approach (no semantic analyzer module loading)`);

		// Get basic config info without complex reorganization
		const aiConfig = getConfig('ai-operations');
		const databasePath = dataProfile === 'ceds' 
			? '/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/datastore/cedsIds.sqlite3'
			: '/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/datastore/cedsIds.sqlite3'; // Same for now
		
		const vectorTableName = dataProfile === 'ceds' ? 'cedsElementVectors_atomic' : 'sifElementVectors_atomic';
		const sourceTableName = dataProfile === 'ceds' ? '_CEDSElements' : 'naDataModel';
		const sourceKeyName = dataProfile === 'ceds' ? 'GlobalID' : 'refId';
		
		try {
			// Initialize OpenAI directly
			const openai = new OpenAI({
				apiKey: aiConfig.apiKey
			});

			// Log the prompt/request details
			const promptData = {
				queryString,
				dataProfile,
				semanticAnalysisMode,
				resultCount,
				vectorTableName,
				sourceTableName,
				model: 'text-embedding-3-small',
				timestamp: new Date().toISOString()
			};

			xLog.saveProcessFile(
				`${moduleName}_promptList.log`,
				`\n\n\n${moduleName}---------------------------------------------------\nOpenAI Embedding Request:\nModel: text-embedding-3-small\nInput: "${queryString}"\n----------------------------------------------------\n\n`,
				{ append: true },
			);

			// Generate embedding for query
			xLog.status(`${moduleName}: Generating embedding for query`);
			const response = await openai.embeddings.create({
				model: 'text-embedding-3-small',
				input: queryString
			});
			
			const queryEmbedding = response.data[0].embedding;
			const queryBuffer = Buffer.from(new Float32Array(queryEmbedding).buffer);

			// Initialize database using the same method as legacy system
			const sqliteVec = require('sqlite-vec');
			const Database = require('better-sqlite3');
			const vectorDb = new Database(databasePath);
			sqliteVec.load(vectorDb);
			
			xLog.verbose(`${moduleName}: Loaded SQLite vector extension using sqlite-vec module`);

			// Direct vector search
			xLog.status(`${moduleName}: Performing vector search in ${vectorTableName}`);
			
			const sql = `
				SELECT sourceRefId, factType, factText, 
				       vec_distance_L2(embedding, ?) as distance
				FROM ${vectorTableName}
				WHERE embedding IS NOT NULL
				ORDER BY distance
				LIMIT ?
			`;

			const vectorResults = vectorDb.prepare(sql).all(queryBuffer, resultCount * 2);

			// Get unique source records
			const uniqueRecords = new Map();
			for (const row of vectorResults) {
				if (!uniqueRecords.has(row.sourceRefId)) {
					uniqueRecords.set(row.sourceRefId, {
						refId: row.sourceRefId,
						distance: row.distance,
						matches: []
					});
				}
				uniqueRecords.get(row.sourceRefId).matches.push({
					factType: row.factType,
					factText: row.factText,
					distance: row.distance
				});
			}

			// Get top results and look up source records
			const topResults = Array.from(uniqueRecords.values())
				.sort((a, b) => a.distance - b.distance)
				.slice(0, resultCount);

			const query_results = [];
			
			for (let i = 0; i < topResults.length; i++) {
				const result = topResults[i];
				const formattedKey = dataProfile === 'ceds' ? result.refId.padStart(6, '0') : result.refId;
				
				// Look up source record
				const sourceRecord = vectorDb.prepare(
					`SELECT * FROM ${sourceTableName} WHERE ${sourceKeyName} = ?`
				).get(formattedKey);
				
				if (sourceRecord) {
					query_results.push({
						rank: i + 1,
						refId: result.refId,
						distance: result.distance,
						score: result.distance,
						record: sourceRecord,
						factTypesMatched: result.matches.length,
						totalMatches: result.matches.length
					});
				}
			}

			vectorDb.close();

			xLog.status(`${moduleName}: Found ${query_results.length} results using direct approach`);

			// Prepare response data for logging
			const responseData = {
				query_results,
				search_metadata: {
					queryString,
					dataProfile,
					semanticAnalysisMode,
					resultCount: query_results.length,
					totalMatches: query_results.length
				},
				processing_info: {
					vectorTableName,
					sourceTableName,
					sourceKeyName,
					embeddings_model: 'text-embedding-3-small',
					results_found: query_results.length,
					timestamp: new Date().toISOString()
				}
			};

			// Log the detailed response
			xLog.saveProcessFile(
				`${moduleName}_responseList.log`,
				`\n\n\n${moduleName}---------------------------------------------------\nQuery Processing Response:\n${JSON.stringify(responseData, null, 2)}\n----------------------------------------------------\n\n`,
				{ append: true },
			);

			return responseData;

		} catch (error) {
			xLog.error(`${moduleName}: Direct vector search error: ${error.message}`);
			throw error;
		}
	};

	// ================================================================================
	// DO THE JOB

	const executeRequest = async (args, callback) => {
		try {
			// Debug parameter sources
			xLog.verbose(`${moduleName}: executeRequest args: ${JSON.stringify(args, null, 2)}`);
			
			// Extract parameters from args/latestWisdom with multiple fallback sources
			const { latestWisdom = {}, thinkerResponses = {} } = args || {};
			const { commandLineParameters } = process.global;
			
			// Try multiple sources for parameters
			const queryString = latestWisdom.queryString || 
							   args?.queryString || 
							   commandLineParameters?.values?.queryString?.[0];
							   
			const dataProfile = latestWisdom.dataProfile || 
							   args?.dataProfile || 
							   commandLineParameters?.values?.dataProfile?.[0] || 
							   'ceds';
							   
			const semanticAnalysisMode = latestWisdom.semanticAnalysisMode || 
										args?.semanticAnalysisMode || 
										commandLineParameters?.values?.semanticAnalysisMode?.[0] || 
										'atomicVector';
										
			const resultCount = parseInt(latestWisdom.resultCount || 
										args?.resultCount || 
										commandLineParameters?.values?.resultCount?.[0] || 
										5);
										
			const verbose = latestWisdom.verbose || 
						   args?.verbose || 
						   commandLineParameters?.switches?.verbose || 
						   false;

			if (!queryString) {
				throw new Error(`No queryString provided for vector search. Sources checked: latestWisdom=${!!latestWisdom.queryString}, args=${!!args?.queryString}, CLI=${!!commandLineParameters?.values?.queryString?.[0]}`);
			}

			xLog.status(`${moduleName}: REAL MODE - Performing vector search`);
			xLog.verbose(`${moduleName}: Query: "${queryString}"`);
			xLog.verbose(`${moduleName}: Profile: ${dataProfile}, Mode: ${semanticAnalysisMode}, Count: ${resultCount}`);

			// Perform real vector search
			const searchResults = await performVectorQuery({
				queryString,
				dataProfile,
				semanticAnalysisMode,
				resultCount,
				verbose
			});

			xLog.status(`${moduleName}: Real vector search completed successfully`);
			xLog.verbose(`${moduleName}: Returning result keys: ${Object.keys(searchResults)}`);
			
			// Return results wrapped in wisdom object like other thinkers
			callback('', { wisdom: searchResults });

		} catch (error) {
			xLog.error(`${moduleName}: Error in real query processing: ${error.message}`);
			callback(error);
		}
	};

	return { executeRequest };
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;