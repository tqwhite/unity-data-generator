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
	// REAL OPENAI CHAT COMPLETION

	const accessSmartyPants = async (args, callback) => {
		const { promptList, systemPrompt } = args;
		
		xLog.verbose(`${moduleName}: Calling real OpenAI with system prompt: ${systemPrompt.substring(0, 100)}...`);
		
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
			
			// Prepare messages for chat completion
			const messages = [
				{ role: 'system', content: systemPrompt },
				...promptList
			];
			
			// Log the complete prompt
			xLog.saveProcessFile(
				`${moduleName}_promptList.log`,
				`\n\n\n${moduleName}---------------------------------------------------\nOpenAI Chat Completion Request:\nModel: gpt-4o-2024-08-06\nMessages:\n${JSON.stringify(messages, null, 2)}\n----------------------------------------------------\n\n`,
				{ append: true },
			);
			
			// Call OpenAI chat completion
			const response = await openai.chat.completions.create({
				model: 'gpt-4o-2024-08-06',
				messages: messages,
				temperature: 0,
				max_tokens: 4000
			});
			
			const aiResponse = response.choices[0].message.content;
			
			// Try to parse JSON response for atomic facts
			let atomicFacts;
			try {
				atomicFacts = JSON.parse(aiResponse);
			} catch (parseError) {
				// If parsing fails, wrap the response as a simple fact
				atomicFacts = {
					elements: [{
						element_id: "extracted_content",
						facts: [{ text: aiResponse }],
						semantic_categories: ["extracted"],
						functional_role: "content analysis"
					}]
				};
			}
			
			xLog.verbose(`${moduleName}: Generated real atomic facts from OpenAI`);
			callback(null, { atomicFacts: JSON.stringify(atomicFacts) });
			
		} catch (error) {
			xLog.error(`${moduleName}: OpenAI chat completion failed: ${error.message}`);
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
			// DEBUG: Log what we receive
			xLog.verbose(`${moduleName}: DEBUG - args keys: [${Object.keys(args).join(', ')}]`);
			xLog.verbose(`${moduleName}: DEBUG - wisdomBus type: ${typeof wisdomBus}`);
			xLog.verbose(`${moduleName}: DEBUG - latestWisdom type: ${typeof latestWisdom}`);
			
			if (wisdomBus) {
				xLog.verbose(`${moduleName}: DEBUG - wisdomBus methods: [${Object.getOwnPropertyNames(wisdomBus).join(', ')}]`);
			}
			if (latestWisdom) {
				xLog.verbose(`${moduleName}: DEBUG - latestWisdom keys: [${Object.keys(latestWisdom).join(', ')}]`);
			}
			
			// Handle both vector generation (currentElement) and query processing (queryString)
			// For framework mode, get parameters from wisdom-bus
			let currentElement, queryString;
			
			if (wisdomBus && typeof wisdomBus.getLatestWisdom === 'function') {
				// Use wisdom-bus accessor (correct UDG pattern)
				currentElement = wisdomBus.getLatestWisdom('currentElement');
				queryString = wisdomBus.getLatestWisdom('queryString');
				
				xLog.verbose(`${moduleName}: DEBUG - from getLatestWisdom: currentElement=${currentElement}, queryString=${queryString}`);
				
				// If not found in wisdom-bus, check if they were passed as initial data
				if (!queryString && !currentElement) {
					// Get the consolidated wisdom view which includes initialThinkerData
					const consolidatedWisdom = wisdomBus.consolidate ? wisdomBus.consolidate().wisdom : {};
					currentElement = consolidatedWisdom.currentElement;
					queryString = consolidatedWisdom.queryString;
					
					xLog.verbose(`${moduleName}: DEBUG - from consolidated: currentElement=${currentElement}, queryString=${queryString}`);
				}
			} else if (latestWisdom) {
				// Fallback to latestWisdom object (legacy support)
				currentElement = latestWisdom.currentElement;
				queryString = latestWisdom.queryString;
				
				xLog.verbose(`${moduleName}: DEBUG - from latestWisdom: currentElement=${currentElement}, queryString=${queryString}`);
			}
			
			let inputText, processingContext;
			if (currentElement) {
				// Vector generation mode - processing element definitions
				inputText = currentElement.Definition || currentElement.Description || '';
				processingContext = `element ${currentElement.refId || currentElement.GlobalID}`;
				xLog.verbose(`${moduleName}: Processing element ${currentElement.refId || currentElement.GlobalID}`);
			} else if (queryString) {
				// Query processing mode - processing query string
				inputText = queryString;
				processingContext = `query string "${queryString}"`;
				xLog.verbose(`${moduleName}: Processing query string: "${queryString}"`);
			} else {
				return callback(new Error(`${moduleName}: neither currentElement nor queryString found in wisdom bus`));
			}

			// Get prompts from prompt library
			if (!promptGenerator) {
				return callback(new Error(`${moduleName}: promptGenerator not provided via dependency injection`));
			}

			const prompts = promptGenerator.getPrompts('extractAtomicFacts');
			if (!prompts) {
				return callback(new Error(`${moduleName}: Could not get prompts for extractAtomicFacts`));
			}

			const systemPrompt = prompts.system;
			const userPrompt = prompts.extractAtomicFactsPrompt({
				definition: inputText
			});

			xLog.verbose(`${moduleName}: Got prompts from prompt library`);

			// Formulate prompt list for AI
			const promptList = [userPrompt];

			// Log the prompt details
			const promptData = {
				operation: 'extract-atomic-facts',
				currentElement: {
					refId: currentElement.refId || currentElement.GlobalID,
					definition: currentElement.Definition || currentElement.Description || ''
				},
				promptList,
				systemPrompt,
				timestamp: new Date().toISOString()
			};

			xLog.saveProcessFile(
				`${moduleName}_promptList.log`,
				`\n\n\n${moduleName}---------------------------------------------------\nProcessing: ${processingContext}\n\n${systemPrompt}\n\n${userPrompt.content}\n----------------------------------------------------\n\n`,
				{ append: true },
			);

			// Call real OpenAI API for atomic fact extraction
			accessSmartyPants({ promptList, systemPrompt }, (err, result) => {
				if (err) {
					return callback(err);
				}

				xLog.verbose(`${moduleName}: Extracted atomic facts for ${currentElement.refId || currentElement.GlobalID}`);

				// Save results to wisdom-bus (correct UDG pattern)
				const sourceRefId = currentElement ? (currentElement.refId || currentElement.GlobalID) : refId;
				
				if (wisdomBus && typeof wisdomBus.saveWisdom === 'function') {
					wisdomBus.saveWisdom('atomicFacts', result.atomicFacts);
					wisdomBus.saveWisdom('sourceRefId', sourceRefId);
					wisdomBus.saveWisdom('queryString', queryString || null);
					wisdomBus.saveWisdom('processingContext', processingContext);
				} else if (latestWisdom) {
					// Fallback: modify latestWisdom object directly (for legacy support)
					latestWisdom.atomicFacts = result.atomicFacts;
					latestWisdom.sourceRefId = sourceRefId;
					latestWisdom.queryString = queryString || null;
					latestWisdom.processingContext = processingContext;
				}

				// Log the response details
				const responseData = {
					operation: 'extract-atomic-facts',
					processingContext,
					sourceRefId: sourceRefId,
					queryString: queryString,
					aiResponse: result,
					processing_info: {
						status: 'real_openai',
						facts_extracted: true,
						model: 'gpt-4o-2024-08-06',
						timestamp: new Date().toISOString()
					}
				};

				xLog.saveProcessFile(
					`${moduleName}_responseList.log`,
					`\n\n\n${moduleName}---------------------------------------------------\nExtract Atomic Facts Response:\n${JSON.stringify(responseData, null, 2)}\n----------------------------------------------------\n\n`,
					{ append: true },
				);

				// Return success only (correct UDG pattern)
				callback(null, {
					success: true,
					message: `Extracted atomic facts for ${processingContext}`
				});
			});

		} catch (error) {
			xLog.error(`${moduleName}: Error processing atomic facts: ${error.message}`);
			callback(error);
		}
	};

	return { executeRequest };
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;