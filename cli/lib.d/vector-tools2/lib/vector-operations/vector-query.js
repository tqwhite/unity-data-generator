#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

// =====================================================================
// VECTOR QUERY - Semantic search operations on vector databases
// =====================================================================

class VectorQuery {
	constructor({ dbUtility, analyzerRegistry }) {
		const { xLog, getConfig } = process.global;
		this.xLog = xLog;
		this.dbUtility = dbUtility;
		this.analyzerRegistry = analyzerRegistry;
		this.moduleConfig = getConfig(moduleName);
	}

	// ---------------------------------------------------------------------
	// performSemanticVectorSearch - Perform semantic similarity search
	
	async performSemanticVectorSearch(config, queryString, resultCount = 5) {
		const { commandLineParameters } = process.global;
		
		try {
			// Extract configuration
			const {
				dataProfile,
				semanticAnalysisMode,
				sourceTableName,
				vectorTableName,
				sourcePrivateKeyName,
				sourceEmbeddableContentName
			} = config;

			// Determine actual table name based on semantic mode
			const actualTableName = semanticAnalysisMode === 'atomicVector'
				? `${vectorTableName}_atomic`
				: vectorTableName;

			this.xLog.status(`Starting Vector Similarity Search for ${dataProfile.toUpperCase()} profile...`);
			this.xLog.status(`Target table: "${actualTableName}"`);
			this.xLog.status(`Query: "${queryString}"`);
			this.xLog.status(`Result count: ${resultCount}`);

			// Log query parameters
			const queryParams = {
				queryString,
				resultCount,
				dataProfile,
				semanticAnalysisMode,
				actualTableName,
				sourceTableName,
				sourcePrivateKeyName,
				sourceEmbeddableContentName
			};
			
			try {
				this.xLog.saveProcessFile(`${moduleName}_promptList.log`, `Query Parameters:\n${JSON.stringify(queryParams, null, 2)}`, { append: true });
			} catch (err) {
				// Ignore xLog save errors
			}

			// Get semantic analyzer
			const analyzer = this.analyzerRegistry.getAnalyzer(semanticAnalysisMode);
			this.analyzerRegistry.validateAnalyzer(analyzer);

			// Check if verbose mode is enabled
			const isVerbose = commandLineParameters.switches.verbose;

			// Get OpenAI instance from global if available
			const { openai } = process.global || {};
			if (!openai) {
				throw new Error('OpenAI instance not available for vector search');
			}

			// Perform semantic search using analyzer
			const searchConfig = {
				queryString,
				vectorDb: this.dbUtility, // Pass dbUtility as vectorDb for compatibility
				openai,
				tableName: vectorTableName,
				resultCount,
				dataProfile,
				sourceTableName,
				sourcePrivateKeyName,
				collectVerboseData: isVerbose
			};

			const scoringResult = await analyzer.scoreDistanceResults(searchConfig);

			// Handle both formats (legacy array or new object with verbose data)
			const results = scoringResult.results || scoringResult;
			const verboseData = scoringResult.verboseData;

			// Log the results
			const resultSummary = {
				queryString,
				resultCount: results.length,
				results: results.map(result => ({
					rank: result.rank,
					distance: result.distance,
					refId: result.record[sourcePrivateKeyName],
					content: this._extractDisplayContentFromRecord(result.record, sourceEmbeddableContentName)
				}))
			};
			
			this.xLog.saveProcessFile(`${moduleName}_finalResults.log`, resultSummary, { saveAsJson: true });

			// Get pretty-print function from semantic analyzer if available
			let queryExpansion = 'Pretty print not available for this semantic analyzer';
			if (analyzer.getPrettyPrintFunction && typeof analyzer.getPrettyPrintFunction === 'function') {
				const prettyPrintFunction = analyzer.getPrettyPrintFunction();
				if (typeof prettyPrintFunction === 'function') {
					queryExpansion = prettyPrintFunction(verboseData);
				}
			}
			
			this.xLog.saveProcessFile(`${moduleName}_queryExpansion.log`, queryExpansion);
			this.xLog.verbose(`Result Summary:\n${JSON.stringify(resultSummary, null, 2)}`);
			this.xLog.verbose(queryExpansion);

			// Format and output results
			if (commandLineParameters.switches.json) {
				this.xLog.result(JSON.stringify(results, '', '\t'));
			} else {
				this._formatAndDisplaySearchResults(results, queryString, sourcePrivateKeyName, sourceEmbeddableContentName);
			}

			return { 
				success: true, 
				results, 
				verboseData, 
				queryExpansion,
				resultSummary 
			};

		} catch (error) {
			const traceId = Math.floor(Math.random() * 1e9);
			this.xLog.error(`[${traceId}] Vector search failed: ${error.message}`);
			throw new Error(`Vector search failed [trace:${traceId}]`);
		}
	}

	// ---------------------------------------------------------------------
	// _extractDisplayContentFromRecord - Extract display content from record
	
	_extractDisplayContentFromRecord(record, sourceEmbeddableContentName) {
		if (Array.isArray(sourceEmbeddableContentName)) {
			return sourceEmbeddableContentName
				.map(field => record[field] || '')
				.filter(value => value)
				.join(' | ');
		} else {
			return record[sourceEmbeddableContentName] || '';
		}
	}

	// ---------------------------------------------------------------------
	// _formatAndDisplaySearchResults - Format and display search results
	
	_formatAndDisplaySearchResults(results, queryString, sourcePrivateKeyName, sourceEmbeddableContentName) {
		this.xLog.status(`\n\nFound ${results.length} valid matches for "${queryString}"`);
		
		results.forEach((result) => {
			const distance = result.distance.toFixed(6);
			const refId = result.record[sourcePrivateKeyName] || '';
			const description = this._extractDisplayContentFromRecord(result.record, sourceEmbeddableContentName);

			this.xLog.result(`${result.rank}. [score: ${distance}] ${refId} ${description}\n`);
		});
	}

	// ---------------------------------------------------------------------
	// searchWithFilters - Advanced search with metadata filters
	
	async searchWithFilters(config, queryString, resultCount = 5, filters = {}) {
		// For future enhancement - add support for metadata filtering
		// This would allow searches like "education AND type:assessment"
		return this.performSemanticVectorSearch(config, queryString, resultCount);
	}

	// ---------------------------------------------------------------------
	// batchSearch - Process multiple queries at once
	
	async batchSearch(config, queries, resultCount = 5) {
		const results = [];
		
		for (const query of queries) {
			try {
				const result = await this.performSemanticVectorSearch(config, query, resultCount);
				results.push({
					query,
					...result
				});
			} catch (error) {
				results.push({
					query,
					error: error.message,
					success: false
				});
			}
		}
		
		return results;
	}

	// ---------------------------------------------------------------------
	// explainQuery - Get detailed information about query processing
	
	async explainQuery(config, queryString) {
		const { commandLineParameters } = process.global;
		
		// Force verbose mode for explanation
		const originalVerbose = commandLineParameters.switches.verbose;
		commandLineParameters.switches.verbose = true;
		
		try {
			const result = await this.performSemanticVectorSearch(config, queryString, 3); // Small result set for explanation
			
			this.xLog.status('\n--- QUERY EXPLANATION ---');
			this.xLog.status(`Original Query: "${queryString}"`);
			this.xLog.status(`Semantic Mode: ${config.semanticAnalysisMode}`);
			this.xLog.status(`Vector Table: ${config.vectorTableName}`);
			
			if (result.queryExpansion && result.queryExpansion !== 'Pretty print not available for this semantic analyzer') {
				this.xLog.status('\nQuery Processing Details:');
				this.xLog.status(result.queryExpansion);
			}
			
			this.xLog.status('\nTop Results Summary:');
			result.results.slice(0, 3).forEach(res => {
				this.xLog.status(`  ${res.rank}. Distance: ${res.distance.toFixed(4)} - ${res.record[config.sourcePrivateKeyName]}`);
			});
			
			return result;
			
		} finally {
			// Restore original verbose setting
			commandLineParameters.switches.verbose = originalVerbose;
		}
	}
}

// =====================================================================
// MODULE EXPORTS
// =====================================================================

const moduleFunction = ({ dbUtility, analyzerRegistry }) => {
	return new VectorQuery({ dbUtility, analyzerRegistry });
};

module.exports = moduleFunction;