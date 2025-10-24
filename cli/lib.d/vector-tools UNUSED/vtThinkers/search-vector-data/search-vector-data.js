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
		const { dataProfile, resultCount, databasePath, semanticAnalyzerVersion } = searchParams;
		
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
			
			// Build version-aware SQL query for optimal performance
			let sql, queryParams;
			
			if (semanticAnalyzerVersion && vectorTableName === 'cedsElementVectors_atomic') {
				// Version-aware query: filter by semanticAnalyzerVersion BEFORE expensive vector calculations
				sql = `
					SELECT sourceRefId, factType, factText, 
					       vec_distance_L2(embedding, ?) as distance
					FROM ${vectorTableName}
					WHERE embedding IS NOT NULL 
					      AND semanticAnalyzerVersion = ?
					ORDER BY distance
					LIMIT ?
				`;
				queryParams = [queryBuffer, semanticAnalyzerVersion, resultCount];
			} else {
				// Legacy query for non-versioned tables or when version not specified
				sql = `
					SELECT sourceRefId, factType, factText, 
					       vec_distance_L2(embedding, ?) as distance
					FROM ${vectorTableName}
					WHERE embedding IS NOT NULL
					ORDER BY distance
					LIMIT ?
				`;
				queryParams = [queryBuffer, resultCount];
			}
			
			const searchResults = vectorDb.prepare(sql).all(...queryParams);
			
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
		const { wisdomBus, latestWisdom } = args;

		if (!wisdomBus && !latestWisdom) {
			return callback(new Error(`${moduleName}: wisdom-bus or latestWisdom is required`));
		}

		try {
			// Get search parameters
			// Try wisdomBus accessor first, then fallback to latestWisdom object
			let queryString, dataProfile, resultCount, simpleEmbedding, atomicEmbeddings, semanticAnalyzerVersion;
			
			if (wisdomBus && typeof wisdomBus.qtGetSurePath === 'function') {
				queryString = wisdomBus.qtGetSurePath('queryString');
				dataProfile = wisdomBus.qtGetSurePath('dataProfile') || 'ceds';
				resultCount = wisdomBus.qtGetSurePath('resultCount') || 3;
				simpleEmbedding = wisdomBus.qtGetSurePath('simpleEmbedding');
				atomicEmbeddings = wisdomBus.qtGetSurePath('atomicEmbeddings');
				semanticAnalyzerVersion = wisdomBus.qtGetSurePath('semanticAnalyzerVersion');
			} else if (latestWisdom) {
				queryString = latestWisdom.queryString;
				dataProfile = latestWisdom.dataProfile || 'ceds';
				resultCount = latestWisdom.resultCount || 3;
				simpleEmbedding = latestWisdom.simpleEmbedding;
				atomicEmbeddings = latestWisdom.atomicEmbeddings;
				semanticAnalyzerVersion = latestWisdom.semanticAnalyzerVersion;
			}
			
			const databasePath = getConfig('vectorTools.databaseFilePath');
			
			if (!databasePath) {
				return callback(new Error(`${moduleName}: Database path not configured`));
			}
			
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
			const searchParams = { dataProfile, resultCount, databasePath, semanticAnalyzerVersion };
			
			xLog.saveProcessFile(
				`${moduleName}_promptList.log`,
				`\n\n\n${moduleName}---------------------------------------------------\nVector Search Operation:\nQuery: "${queryString}"\nData Profile: ${dataProfile}\nResult Count: ${resultCount}\nEmbeddings: ${embeddings.length}\nSemantic Version: ${semanticAnalyzerVersion || 'unspecified'}\nDatabase: ${databasePath}\n----------------------------------------------------\n\n`,
				{ append: true },
			);

			// Perform the vector search
			performVectorSearch(embeddings, searchParams)
				.then(searchResults => {
					// Create wisdom object for migration helper
					const wisdom = {
						searchResults: searchResults,
						query_results: searchResults, // Legacy format compatibility
						search_metadata: {
							queryString,
							dataProfile,
							resultCount,
							totalMatches: searchResults.length
						},
						searchOperation: 'completed'
					};

					// Log the response
					const responseData = {
						operation: 'search-vector-data',
						queryString,
						searchResults,
						wisdom,
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
					callback(null, {
						wisdom,
						message: `Found ${searchResults.length} search results`
					});
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