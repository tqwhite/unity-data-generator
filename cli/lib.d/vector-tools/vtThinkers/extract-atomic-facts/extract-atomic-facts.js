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
			// Get current element from iterate-over-collection
			const currentElement = wisdomBus.qtGetSurePath('currentElement');
			if (!currentElement) {
				return callback(new Error(`${moduleName}: currentElement not found in wisdom bus`));
			}

			xLog.verbose(`${moduleName}: Processing element ${currentElement.refId || currentElement.GlobalID}`);

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
				definition: currentElement.Definition || currentElement.Description || ''
			});

			xLog.verbose(`${moduleName}: Got prompts from prompt library`);

			// Formulate prompt list for AI
			const promptList = [userPrompt];

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