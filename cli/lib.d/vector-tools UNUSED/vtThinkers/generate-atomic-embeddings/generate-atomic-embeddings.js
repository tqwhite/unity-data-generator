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
	// REAL OPENAI EMBEDDING GENERATION

	const generateEmbedding = async (text, callback) => {
		xLog.verbose(`${moduleName}: Generating real OpenAI embedding for atomic fact: ${text.substring(0, 100)}...`);

		try {
			// Get OpenAI configuration
			const aiConfig = getConfig('ai-operations');
			if (!aiConfig || !aiConfig.apiKey) {
				return callback(new Error(`${moduleName}: OpenAI API key not configured`));
			}
			
			// Initialize OpenAI client
			const OpenAI = require('openai');
			const openai = new OpenAI({
				apiKey: aiConfig.apiKey
			});
			
			// Generate real embedding using OpenAI API
			const response = await openai.embeddings.create({
				model: 'text-embedding-3-small',
				input: text
			});
			
			const embedding = response.data[0].embedding;
			
			const result = {
				embedding: embedding,
				model: 'text-embedding-3-small',
				usage: response.usage
			};
			
			xLog.verbose(`${moduleName}: Generated real embedding (${embedding.length} dimensions)`);
			callback(null, result);
			
		} catch (error) {
			xLog.error(`${moduleName}: OpenAI embedding generation failed: ${error.message}`);
			callback(error);
		}
	};

	// ================================================================================
	// DO THE JOB

	const executeRequest = (args, callback) => {
		const { wisdomBus, latestWisdom } = args;

		if (!wisdomBus && !latestWisdom) {
			return callback(new Error(`${moduleName}: wisdom-bus or latestWisdom is required`));
		}

		try {
			// Get atomic facts from previous thinker (extract-atomic-facts)
			// Try wisdomBus accessor first, then fallback to latestWisdom object
			let atomicFactsJson, sourceRefId;
			
			if (wisdomBus && typeof wisdomBus.qtGetSurePath === 'function') {
				atomicFactsJson = wisdomBus.qtGetSurePath('atomicFacts');
				sourceRefId = wisdomBus.qtGetSurePath('sourceRefId');
			} else if (latestWisdom) {
				atomicFactsJson = latestWisdom.atomicFacts;
				sourceRefId = latestWisdom.sourceRefId;
			}
			
			if (!atomicFactsJson) {
				return callback(new Error(`${moduleName}: atomicFacts not found in wisdom bus`));
			}

			if (!sourceRefId) {
				return callback(new Error(`${moduleName}: sourceRefId not found in wisdom bus`));
			}

			// Log the input/prompt details
			const promptData = {
				operation: 'generate-atomic-embeddings',
				sourceRefId,
				atomicFactsJson,
				wisdomBus_keys: Object.keys(wisdomBus),
				timestamp: new Date().toISOString()
			};

			xLog.saveProcessFile(
				`${moduleName}_promptList.log`,
				`\n\n\n${moduleName}---------------------------------------------------\nOpenAI Embedding Request (Atomic Facts):\nModel: text-embedding-3-small\nSource Element: ${sourceRefId}\nAtomic Facts: ${atomicFactsJson.substring(0, 200)}...\n----------------------------------------------------\n\n`,
				{ append: true },
			);

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

					// Generate real OpenAI embedding for this atomic fact
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

				// Create wisdom object for migration helper
				const wisdom = {
					atomicEmbeddings: embeddingRecords, // Standard interface name
					embeddingRecords: embeddingRecords, // Legacy compatibility  
					totalAtomicEmbeddings: embeddingRecords.length,
					sourceRefId: sourceRefId
				};

				// Log the response details
				const responseData = {
					operation: 'generate-atomic-embeddings',
					sourceRefId,
					result: embeddingRecords,
					wisdom,
					processing_info: {
						status: 'real_openai',
						embeddings_generated: embeddingRecords.length,
						model: 'text-embedding-3-small',
						timestamp: new Date().toISOString()
					}
				};

				xLog.saveProcessFile(
					`${moduleName}_responseList.log`,
					`\n\n\n${moduleName}---------------------------------------------------\nGenerate Atomic Embeddings Response:\n${JSON.stringify(responseData, null, 2)}\n----------------------------------------------------\n\n`,
					{ append: true },
				);

				callback(null, {
					wisdom,
					message: `Generated ${embeddingRecords.length} atomic embeddings for ${sourceRefId}`
				});
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