'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = ({ moduleName } = {}) => ({ unused } = {}) => {
	const { xLog, getConfig, rawConfig, commandLineParameters, projectRoot } = process.global;
	const moduleConfig = getConfig(moduleName);

	// Helper function for query handling
	const queryVectorDatabase = () => async (
		config,
		openai,
		vectorDb,
		semanticAnalyzer,
	) => {
		const {
			dataProfile,
			sourceTableName,
			vectorTableName,
			sourcePrivateKeyName,
			sourceEmbeddableContentName,
		} = config;

		const queryString = commandLineParameters.values.queryString.qtLast();
		const resultCount = commandLineParameters.values.resultCount
			? parseInt(commandLineParameters.values.resultCount, 10)
			: 5;

		// Determine actual table name based on semantic analyzer mode
		const semanticAnalysisMode = commandLineParameters.qtGetSurePath(
			'values.semanticAnalysisMode[0]',
			'simpleVector',
		);
		const actualTableName =
			semanticAnalysisMode === 'atomicVector'
				? `${vectorTableName}_atomic`
				: vectorTableName;

		xLog.status(
			`Starting Vector Similarity Search for ${dataProfile.toUpperCase()} profile...`,
		);
		if (actualTableName) {
			xLog.status(`Target table: "${actualTableName}"`);
		}
		xLog.status(`Query: "${queryString}"`);

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
		
		xLog.saveProcessFile(`${moduleName}_promptList.log`, `Query Parameters:\n${JSON.stringify(queryParams, null, 2)}`, {append:true});


			// Check if verbose mode is enabled
			const isVerbose = commandLineParameters.switches.verbose;

			const scoringResult = await semanticAnalyzer.scoreDistanceResults({
				queryString,
				vectorDb,
				openai,
				tableName: vectorTableName,
				resultCount,
				dataProfile,
				sourceTableName,
				sourcePrivateKeyName,
				sourceEmbeddableContentName,
				collectVerboseData: isVerbose,
			});

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
					content: Array.isArray(sourceEmbeddableContentName) 
						? sourceEmbeddableContentName.map(field => result.record[field] || '').filter(v => v).join(' | ')
						: result.record[sourceEmbeddableContentName] || ''
				}))
			};
			
			xLog.saveProcessFile(`${moduleName}_finalResults.log`, resultSummary, {saveAsJson:true});

			// Get pretty-print function from semantic analyzer
			const prettyPrintFunction = semanticAnalyzer.getPrettyPrintFunction?.() || (() => 'Pretty print not available for this semantic analyzer');
			const queryExpansion = prettyPrintFunction(verboseData);
			xLog.saveProcessFile(`${moduleName}_queryExpansion.log`, queryExpansion);
			
			xLog.verbose(`Result Summary:\n${JSON.stringify(resultSummary, null, 2)}`);
			xLog.verbose(queryExpansion)


			// Format and output results
			if (commandLineParameters.switches.json) {
				xLog.result(JSON.stringify(results, '', '\t'));
			} else {
				xLog.status(
					`\n\nFound ${results.length} valid matches for "${queryString}"`,
				);
				results.forEach((result) => {
					const distance = result.distance.toFixed(6);
					const refId = result.record[sourcePrivateKeyName] || '';

					// Build description from the embeddable content fields
					let description = '';
					if (Array.isArray(sourceEmbeddableContentName)) {
						description = sourceEmbeddableContentName
							.map((field) => result.record[field] || '')
							.filter((value) => value)
							.join(' | ');
					} else {
						description = result.record[sourceEmbeddableContentName] || '';
					}

					xLog.result(
						`${result.rank}. [score: ${distance}] ${refId} ${description}\n`,
					);
				});
			}

			return { success: true, shouldExit: false };
		
	};

	return { queryVectorDatabase };
};

module.exports = moduleFunction({ moduleName }); //returns initialized moduleFunction