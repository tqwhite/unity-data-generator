'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = function (args = {}) {
	const { xLog, getConfig, commandLineParameters } = process.global;
	const {defaultQueryChoice}=getConfig(moduleName);

	// ===================================================================================

	const personaMap = {
		linguist:
			'You are a computational linguist with knowledge graph/ontology experience, working in semantic parsing or knowledge representation. You are comfortable with both symbolic and vector semantics.',
		extractor: 'You are an atomic-fact extractor with semantic categorization.',
	};
	

	const personaChoice = 'linguist';
	// Get version from command line parameter, fall back to config default
	const queryChoice = commandLineParameters?.qtGetSurePath('values.semanticAnalyzerVersion[0]') || defaultQueryChoice;
	

	const systemPromptGen = require(`./queryStrings/${queryChoice}/${queryChoice}`)();
	
	xLog.status(`Using promptString version: ${queryChoice}`);

	const systemPrompt = systemPromptGen.getTemplateString(
		personaMap[personaChoice],
	);

	// ===================================================================================

	const extractAtomicFacts = async (definition, openai) => {
		const temperature = 0;

		try {
			const response = await openai.chat.completions.create({
				model: 'gpt-4o-2024-08-06',
				messages: [
					{ role: 'system', content: systemPrompt },
					{ role: 'user', content: definition },
				],
				response_format: { type: 'json_object' },
				temperature,
				max_tokens: 4000,
			});

			const processFileData = {
				systemPrompt,
				definition,
				atomicFacts:JSON.parse(response.qtGetSurePath('choices[0].message.content','')),
				response,
			};
			

			xLog.saveProcessFile(
				`${moduleName}_fullAiPromptResponse.log`,
				processFileData,
				{ saveAsJson: true },
			);

			return {
				personaChoice,
				queryChoice,
				temperature,
				...JSON.parse(response.choices[0].message.content),
			};
		} catch (err) {
			xLog.error(`Atomic fact extraction failed: ${err.message}`);
			return {
				elements: [
					{
						element_id: 'error',
						facts: [{ text: definition }],
						semantic_categories: ['unknown'],
						functional_role: 'unknown',
						conceptual_dimensions: [],
					},
				],
			};
		}
	};
	

	// ===================================================================================

	const convertAtomicFactsToEmbeddingStrings =
		systemPromptGen.convertAtomicFactsToEmbeddingStrings;
	
	const prettyPrintAtomicExpansion = 
		systemPromptGen.prettyPrintAtomicExpansion;

	const scoringMethod = 
		systemPromptGen.scoringMethod;

	// ===================================================================================

	return { extractAtomicFacts, convertAtomicFactsToEmbeddingStrings, prettyPrintAtomicExpansion, scoringMethod };
};

module.exports = moduleFunction;
