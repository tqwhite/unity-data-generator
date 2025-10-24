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
		xLog.verbose(`${moduleName}: Generating real OpenAI embedding for: ${text.substring(0, 50)}...`);
		
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
			
			// Log the embedding request
			xLog.saveProcessFile(
				`${moduleName}_promptList.log`,
				`\n\n\n${moduleName}---------------------------------------------------\nOpenAI Embedding Request:\nModel: text-embedding-3-small\nInput: "${text}"\n----------------------------------------------------\n\n`,
				{ append: true },
			);
			
			// Generate real embedding using OpenAI API
			const response = await openai.embeddings.create({
				model: 'text-embedding-3-small',
				input: text
			});
			
			const embedding = response.data[0].embedding;
			
			const result = {
				embedding: embedding,
				model: 'text-embedding-3-small',
				success: true
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
			// Handle both vector generation (currentElement) and query processing (queryString)
			// Try wisdomBus accessor first, then fallback to latestWisdom object
			let currentElement, queryString;
			
			if (wisdomBus && typeof wisdomBus.qtGetSurePath === 'function') {
				currentElement = wisdomBus.qtGetSurePath('currentElement');
				queryString = wisdomBus.qtGetSurePath('queryString');
			} else if (latestWisdom) {
				currentElement = latestWisdom.currentElement;
				queryString = latestWisdom.queryString;
			}
			
			let inputText, processingContext, refId;
			if (currentElement) {
				// Vector generation mode - processing element definitions
				inputText = currentElement.Definition || currentElement.Description || '';
				refId = currentElement.refId || currentElement.GlobalID;
				processingContext = `element ${refId}`;
				xLog.verbose(`${moduleName}: Processing element ${refId}`);
			} else if (queryString) {
				// Query processing mode - processing query string
				inputText = queryString;
				refId = 'query';
				processingContext = `query string "${queryString}"`;
				xLog.verbose(`${moduleName}: Processing query string: "${queryString}"`);
			} else {
				return callback(new Error(`${moduleName}: neither currentElement nor queryString found in wisdom bus`));
			}

			// Log the input/operation details
			const promptData = {
				operation: 'generate-simple-embeddings',
				processingContext,
				inputText: inputText.substring(0, 200) + (inputText.length > 200 ? '...' : ''),
				wisdomBus_keys: Object.keys(wisdomBus),
				timestamp: new Date().toISOString()
			};

			const contentPreview = inputText.substring(0, 100) + (inputText.length > 100 ? '...' : '');
			xLog.saveProcessFile(
				`${moduleName}_promptList.log`,
				`\n\n\n${moduleName}---------------------------------------------------\nProcessing: ${processingContext}\nOpenAI Embedding Request:\nModel: text-embedding-3-small\nContent: "${contentPreview}"\n----------------------------------------------------\n\n`,
				{ append: true },
			);

			// Get prompts from prompt library (though simple embeddings may not need complex prompts)
			if (!promptGenerator) {
				return callback(new Error(`${moduleName}: promptGenerator not provided via dependency injection`));
			}

			const prompts = promptGenerator.getPrompts('generateSimpleEmbeddings');
			if (prompts) {
				xLog.verbose(`${moduleName}: Got prompts from prompt library`);
			}

			if (!inputText || inputText.trim() === '') {
				return callback(new Error(`${moduleName}: No content to embed for ${processingContext}`));
			}

			// Generate real OpenAI embedding
			generateEmbedding(inputText, (err, result) => {
				if (err) {
					return callback(err);
				}

				xLog.verbose(`${moduleName}: Generated simple embedding for ${processingContext}`);

				// Get semantic analyzer version for version-aware vector operations
				const { commandLineParameters } = process.global;
				const semanticAnalysisMode = commandLineParameters.qtGetSurePath('values.semanticAnalysisMode[0]', 'simpleVector');
				const semanticAnalyzerVersion = 'simple_version1'; // Simple vector always uses version 1
				
				// Create wisdom object for migration helper
				const wisdom = {
					simpleEmbedding: result.embedding,
					embeddingModel: result.model,
					sourceRefId: refId,
					embeddableContent: inputText,
					processingContext: processingContext,
					semanticAnalyzerVersion: semanticAnalyzerVersion
				};

				// Log the response details
				const responseData = {
					operation: 'generate-simple-embeddings',
					processingContext,
					sourceRefId: refId,
					embeddableContent: inputText,
					result,
					wisdom,
					processing_info: {
						status: 'real_openai',
						embedding_generated: true,
						model: result.model,
						timestamp: new Date().toISOString()
					}
				};

				xLog.saveProcessFile(
					`${moduleName}_responseList.log`,
					`\n\n\n${moduleName}---------------------------------------------------\nGenerate Simple Embeddings Response:\n${JSON.stringify(responseData, null, 2)}\n----------------------------------------------------\n\n`,
					{ append: true },
				);

				callback(null, {
					wisdom,
					message: `Generated simple embedding for ${processingContext}`
				});
			});

		} catch (error) {
			xLog.error(`${moduleName}: Error generating simple embedding: ${error.message}`);
			callback(error);
		}
	};

	return { executeRequest };
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;