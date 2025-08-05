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
	// VECTOR SEARCH IMPLEMENTATION
	
	const performVectorSearch = async (embeddings, searchParams) => {
		const { dataProfile, resultCount, databasePath } = searchParams;
		
		// Determine table and column names based on data profile
		const vectorTableName = dataProfile === 'ceds' 
			? 'cedsElementVectors_atomic' 
			: 'sifElementVectors';
		const sourceKeyName = dataProfile === 'ceds' ? 'GlobalID' : 'refId';
		
		xLog.verbose(`${moduleName}: Searching ${vectorTableName} for ${embeddings.length} embeddings`);
		
		// Initialize database using same method as legacy system
		const sqliteVec = require('sqlite-vec');
		const Database = require('better-sqlite3');
		const vectorDb = new Database(databasePath);
		sqliteVec.load(vectorDb);
		
		const results = [];
		
		// Search with each embedding
		for (let i = 0; i < embeddings.length; i++) {
			const { embedding, factText, semanticCategory } = embeddings[i];
			const queryBuffer = Buffer.from(new Float32Array(embedding).buffer);
			
			const sql = `
				SELECT sourceRefId, factType, factText, 
				       vec_distance_L2(embedding, ?) as distance
				FROM ${vectorTableName}
				WHERE embedding IS NOT NULL
				ORDER BY distance
				LIMIT ?
			`;
			
			const searchResults = vectorDb.prepare(sql).all(queryBuffer, resultCount);
			
			// Add metadata to results
			searchResults.forEach((result, rank) => {
				results.push({
					rank: rank + 1,
					refId: result.sourceRefId,
					distance: result.distance,
					score: result.distance,
					factText: result.factText,
					factType: result.factType,
					queryFact: factText,
					querySemanticCategory: semanticCategory
				});
			});
		}
		
		vectorDb.close();
		
		// Sort all results by distance and limit
		results.sort((a, b) => a.distance - b.distance);
		return results.slice(0, resultCount);
	};

	// ================================================================================
	// DO THE JOB

	const executeRequest = (args, callback) => {
		const { wisdomBus } = args;

		if (!wisdomBus) {
			return callback(new Error(`${moduleName}: wisdom-bus is required`));
		}

		try {
			// Get search parameters
			const queryString = wisdomBus.qtGetSurePath('queryString');
			const dataProfile = wisdomBus.qtGetSurePath('dataProfile') || 'ceds';
			const resultCount = wisdomBus.qtGetSurePath('resultCount') || 3;
			const databasePath = getConfig('vectorTools.databaseFilePath');
			
			if (!databasePath) {
				return callback(new Error(`${moduleName}: Database path not configured`));
			}

			// Get embeddings from wisdom bus (either simple or atomic)
			const simpleEmbedding = wisdomBus.qtGetSurePath('simpleEmbedding');
			const atomicEmbeddings = wisdomBus.qtGetSurePath('atomicEmbeddings');
			
			let embeddings = [];
			
			if (atomicEmbeddings && Array.isArray(atomicEmbeddings)) {
				// Atomic embeddings mode
				embeddings = atomicEmbeddings;
				xLog.verbose(`${moduleName}: Using ${embeddings.length} atomic embeddings for search`);
			} else if (simpleEmbedding) {
				// Simple embedding mode  
				embeddings = [{
					embedding: simpleEmbedding,
					factText: queryString,
					semanticCategory: 'simple'
				}];
				xLog.verbose(`${moduleName}: Using simple embedding for search`);
			} else {
				return callback(new Error(`${moduleName}: No embeddings found in wisdom bus (neither simpleEmbedding nor atomicEmbeddings)`));
			}

			// Log the search operation
			const searchParams = { dataProfile, resultCount, databasePath };
			
			xLog.saveProcessFile(
				`${moduleName}_promptList.log`,
				`\n\n\n${moduleName}---------------------------------------------------\nVector Search Operation:\nQuery: "${queryString}"\nData Profile: ${dataProfile}\nResult Count: ${resultCount}\nEmbeddings: ${embeddings.length}\nDatabase: ${databasePath}\n----------------------------------------------------\n\n`,
				{ append: true },
			);

			// Perform the vector search
			performVectorSearch(embeddings, searchParams)
				.then(searchResults => {
					// Add search results to wisdom bus
					const updatedWisdom = {
						...wisdomBus,
						searchResults,
						query_results: searchResults, // Legacy format compatibility
						search_metadata: {
							queryString,
							dataProfile,
							resultCount,
							totalMatches: searchResults.length
						}
					};

					// Log the response
					const responseData = {
						operation: 'search-vector-data',
						queryString,
						searchResults,
						processing_info: {
							embeddings_used: embeddings.length,
							results_found: searchResults.length,
							database: databasePath,
							timestamp: new Date().toISOString()
						}
					};

					xLog.saveProcessFile(
						`${moduleName}_responseList.log`,
						`\n\n\n${moduleName}---------------------------------------------------\nVector Search Response:\n${JSON.stringify(responseData, null, 2)}\n----------------------------------------------------\n\n`,
						{ append: true },
					);

					xLog.verbose(`${moduleName}: Found ${searchResults.length} results`);
					callback('', updatedWisdom);
				})
				.catch(error => {
					xLog.error(`${moduleName}: Vector search failed: ${error.message}`);
					callback(error);
				});

		} catch (error) {
			xLog.error(`${moduleName}: Error in search setup: ${error.message}`);
			callback(error);
		}
	};

	return { executeRequest };
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;