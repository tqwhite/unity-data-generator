'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = ({ moduleName } = {}) => ({ unused } = {}) => {
	const { xLog, getConfig, rawConfig, commandLineParameters, projectRoot } = process.global;
	const moduleConfig = getConfig(moduleName);

	// Helper function for query handling
	const queryVectorDatabase = (prettyPrintAtomicExpansion) => async (
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

		try {
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

			// Display verbose analysis if requested
			if (isVerbose && verboseData) {
				prettyPrintAtomicExpansion(xLog)(verboseData);
			}

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

					console.log(
						`${result.rank}. [score: ${distance}] ${refId} ${description}`,
					);
				});
			}

			return { success: true, shouldExit: false };
		} catch (error) {
			xLog.error(`Vector similarity search failed: ${error.message}`);
			return { success: false, shouldExit: false };
		}
	};

	return { queryVectorDatabase };
};

module.exports = moduleFunction({ moduleName }); //returns initialized moduleFunction