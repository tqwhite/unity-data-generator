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
	// GENERATE EMBEDDINGS (SKELETON - Mock for now)

	const generateEmbedding = (text, callback) => {
		xLog.verbose(`${moduleName}: Would generate embedding for atomic fact: ${text.substring(0, 100)}...`);

		// SKELETON: Return mock embedding (1536 dimensions like text-embedding-3-small)
		const mockEmbedding = new Array(1536).fill(0).map(() => Math.random() * 2 - 1);

		// Simulate async embedding generation
		setTimeout(() => {
			callback('', {
				embedding: mockEmbedding,
				model: 'text-embedding-3-small-mock',
				usage: { prompt_tokens: text.length / 4, total_tokens: text.length / 4 }
			});
		}, 50);
	};

	// ================================================================================
	// DO THE JOB

	const executeRequest = (args, callback) => {
		const { wisdomBus } = args;

		if (!wisdomBus) {
			return callback(new Error(`${moduleName}: wisdom-bus is required`));
		}

		try {
			// Get atomic facts from previous thinker (extract-atomic-facts)
			const atomicFactsJson = wisdomBus.qtGetSurePath('atomicFacts');
			const sourceRefId = wisdomBus.qtGetSurePath('sourceRefId');
			
			if (!atomicFactsJson) {
				return callback(new Error(`${moduleName}: atomicFacts not found in wisdom bus`));
			}

			if (!sourceRefId) {
				return callback(new Error(`${moduleName}: sourceRefId not found in wisdom bus`));
			}

			xLog.verbose(`${moduleName}: Processing atomic embeddings for ${sourceRefId}`);

			// Parse atomic facts
			let atomicFacts;
			try {
				atomicFacts = JSON.parse(atomicFactsJson);
			} catch (parseError) {
				return callback(new Error(`${moduleName}: Could not parse atomic facts JSON: ${parseError.message}`));
			}

			// Get prompts from prompt library
			if (!promptGenerator) {
				return callback(new Error(`${moduleName}: promptGenerator not provided via dependency injection`));
			}

			const prompts = promptGenerator.getPrompts('generateAtomicEmbeddings');
			if (prompts) {
				xLog.verbose(`${moduleName}: Got prompts from prompt library`);
			}

			// Process each element and its facts
			const embeddingRecords = [];
			const elements = atomicFacts.elements || [];

			let processedCount = 0;
			const totalFacts = elements.reduce((sum, element) => sum + (element.facts || []).length, 0);

			if (totalFacts === 0) {
				return callback(new Error(`${moduleName}: No atomic facts found to process`));
			}

			// Process each element
			elements.forEach((element, elementIndex) => {
				const facts = element.facts || [];
				
				facts.forEach((fact, factIndex) => {
					const factText = fact.text;
					if (!factText) {
						processedCount++;
						if (processedCount === totalFacts) {
							finishProcessing();
						}
						return;
					}

					// Generate embedding for this atomic fact (mock for skeleton)
					generateEmbedding(factText, (err, result) => {
						if (err) {
							xLog.error(`${moduleName}: Error generating embedding for fact: ${err.message}`);
						} else {
							const atomicRefId = `${sourceRefId}_${element.element_id}_${factIndex}`;
							
							embeddingRecords.push({
								refId: atomicRefId,
								sourceRefId: sourceRefId,
								factType: element.element_id,
								factText: factText,
								embedding: result.embedding,
								semanticCategory: element.semantic_categories ? element.semantic_categories.join(',') : null,
								conceptualDimension: element.conceptual_dimensions ? JSON.stringify(element.conceptual_dimensions) : null,
								factIndex: factIndex
							});
						}

						processedCount++;
						if (processedCount === totalFacts) {
							finishProcessing();
						}
					});
				});
			});

			const finishProcessing = () => {
				xLog.verbose(`${moduleName}: Generated ${embeddingRecords.length} atomic embeddings for ${sourceRefId}`);

				// Add embedding records to wisdom bus
				const updatedWisdom = {
					...wisdomBus,
					embeddingRecords,
					totalAtomicEmbeddings: embeddingRecords.length
				};

				callback('', updatedWisdom);
			};

		} catch (error) {
			xLog.error(`${moduleName}: Error generating atomic embeddings: ${error.message}`);
			callback(error);
		}
	};

	return { executeRequest };
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;