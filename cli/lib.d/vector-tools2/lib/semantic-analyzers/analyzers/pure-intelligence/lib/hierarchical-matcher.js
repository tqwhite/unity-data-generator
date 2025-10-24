'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = function (args = {}) {
	const { xLog, getConfig, commandLineParameters } = process.global;
	const { defaultQueryChoice } = getConfig(moduleName);

	// Get version from command line parameter, fall back to config default
	const queryChoice = commandLineParameters?.qtGetSurePath('values.semanticAnalyzerVersion[0]') || defaultQueryChoice || 'pure_intelligence_v1';

	const systemPromptGen = require(`./versions/${queryChoice}/${queryChoice}`)();

	xLog.status(`Using pure intelligence version: ${queryChoice}`);

	// ===================================================================================
	// matchHierarchically - STUB: Performs hierarchical matching
	// ===================================================================================

	const matchHierarchically = async (definition, openai) => {
		const temperature = 0;

		try {
			// STUB: Just return the definition converted to uppercase
			const stubResult = {
				queryChoice,
				semanticAnalyzerVersion: queryChoice,
				temperature,
				hierarchicalMatch: {
					domain: 'STUB_DOMAIN',
					entity: 'STUB_ENTITY',
					element: definition.toUpperCase(),
					confidence: 1.0
				}
			};

			xLog.saveProcessFile(
				`${moduleName}_hierarchicalMatch.log`,
				stubResult,
				{ saveAsJson: true },
			);

			return stubResult;
		} catch (err) {
			xLog.error(`Hierarchical matching failed: ${err.message}`);
			return {
				semanticAnalyzerVersion: queryChoice,
				hierarchicalMatch: {
					domain: 'error',
					entity: 'error',
					element: definition,
					confidence: 0
				}
			};
		}
	};

	// ===================================================================================
	// Helper functions from version-specific implementation
	// ===================================================================================

	const convertHierarchicalMatchToEmbedding =
		systemPromptGen.convertHierarchicalMatchToEmbedding;

	const prettyPrintHierarchicalMatch =
		systemPromptGen.prettyPrintHierarchicalMatch;

	const scoringMethod =
		systemPromptGen.scoringMethod;

	// ===================================================================================

	return {
		matchHierarchically,
		convertHierarchicalMatchToEmbedding,
		prettyPrintHierarchicalMatch,
		scoringMethod
	};
};

module.exports = moduleFunction;
