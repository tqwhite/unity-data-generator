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
	// TALK TO AI (SKELETON - Mock for now)

	const accessSmartyPants = (args, callback) => {
		const { promptList, systemPrompt } = args;
		
		xLog.verbose(`${moduleName}: Would call AI with system prompt: ${systemPrompt.substring(0, 100)}...`);
		xLog.verbose(`${moduleName}: Would call AI with prompts: ${JSON.stringify(promptList).substring(0, 200)}...`);

		// SKELETON: Return mock atomic facts in correct format
		const mockResponse = {
			elements: [
				{
					element_id: "mock_element_1",
					facts: [
						{ text: "This is a mock atomic fact for testing" },
						{ text: "Framework integration testing is in progress" }
					],
					semantic_categories: ["testing", "framework"],
					functional_role: "validation testing",
					conceptual_dimensions: [
						{ dimension: "scope", position: "specific" },
						{ dimension: "granularity", position: "atomic" }
					]
				}
			]
		};

		// Simulate async AI call
		setTimeout(() => {
			callback('', { atomicFacts: JSON.stringify(mockResponse) });
		}, 100);
	};

	// ================================================================================
	// DO THE JOB

	const executeRequest = (args, callback) => {
		const { wisdomBus } = args;

		if (!wisdomBus) {
			return callback(new Error(`${moduleName}: wisdom-bus is required`));
		}

		try {
			// Handle both vector generation (currentElement) and query processing (queryString)
			const currentElement = wisdomBus.qtGetSurePath('currentElement');
			const queryString = wisdomBus.qtGetSurePath('queryString');
			
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

			// Call AI (mock for skeleton)
			accessSmartyPants({ promptList, systemPrompt }, (err, result) => {
				if (err) {
					return callback(err);
				}

				xLog.verbose(`${moduleName}: Extracted atomic facts for ${currentElement.refId || currentElement.GlobalID}`);

				// Add atomic facts to wisdom bus
				const updatedWisdom = {
					...wisdomBus,
					atomicFacts: result.atomicFacts,
					sourceRefId: currentElement.refId || currentElement.GlobalID
				};

				// Log the response details
				const responseData = {
					operation: 'extract-atomic-facts',
					processingContext,
					sourceRefId: currentElement ? (currentElement.refId || currentElement.GlobalID) : null,
					queryString: queryString || null,
					aiResponse: result,
					updatedWisdom,
					processing_info: {
						status: 'mock_data',
						facts_extracted: true,
						timestamp: new Date().toISOString()
					}
				};

				xLog.saveProcessFile(
					`${moduleName}_responseList.log`,
					`\n\n\n${moduleName}---------------------------------------------------\nExtract Atomic Facts Response:\n${JSON.stringify(responseData, null, 2)}\n----------------------------------------------------\n\n`,
					{ append: true },
				);

				callback('', updatedWisdom);
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