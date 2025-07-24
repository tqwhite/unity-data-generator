#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot
//const projectRoot=fs.realpathSync(path.join(__dirname, '..', '..')); // adjust the number of '..' to fit reality

const qt = require('qtools-functional-library'); //qt.help({printOutput:true, queryString:'.*', sendJson:false});
const asynchronousPipePlus = new require('qtools-asynchronous-pipe-plus')();
const pipeRunner = asynchronousPipePlus.pipeRunner;
const taskListPlus = asynchronousPipePlus.taskListPlus;

//START OF moduleFunction() ============================================================

const moduleFunction = function (args = {}) {
	const { xLog, getConfig } = process.global;
	const { thinkerParameters = {}, promptGenerator } = args; // Extract from args with default
	const localThinkerParameters = thinkerParameters.qtGetSurePath(
		moduleName,
		{},
	);
	const allThinkersParameters = thinkerParameters.qtGetSurePath(
		'allThinkers',
		{},
	);
	

	// Priority: localThinkerParameters > allThinkersParameters > configFromSection
	const configFromSection = getConfig(moduleName);
	const finalConfig = {
		...configFromSection,
		...allThinkersParameters,
		...localThinkerParameters,
	};
	

	xLog.verbose(
		`Thinker Parameters (${moduleName})\n    ` +
			Object.keys(finalConfig)
				.map((name) => `${name}=${finalConfig[name]}`)
				.join('\n    '),
	);
	

	const { thinkerSpec, smartyPants } = args;
	const systemPrompt =
		"You are an expert in data analysis and JSON manipulation. Your goal is to process data accurately and add the requested properties. Be precise and thorough.";

	// ================================================================================
	// UTILITIES

	const convertStorageToPromptFormat = (storageFormatElements) => {
		const promptFormatElements = {};
		
		Object.keys(storageFormatElements).forEach(key => {
			try {
				// Parse the JSON string to object, then stringify for clean formatting
				promptFormatElements[key] = JSON.parse(storageFormatElements[key]);
			} catch (err) {
				xLog.error(`Failed to parse JSON for ${key}: ${err.message}`);
				// Keep original if parse fails
				promptFormatElements[key] = storageFormatElements[key];
			}
		});
		
		return JSON.stringify(promptFormatElements, null, 2);
	};

	const convertPromptToStorageFormat = (promptFormatData) => {
		const storageFormatElements = {};
		
		try {
			// Parse the AI response JSON
			const parsedData = typeof promptFormatData === 'string' 
				? JSON.parse(promptFormatData) 
				: promptFormatData;
			
			Object.keys(parsedData).forEach(key => {
				// Convert each object back to JSON string format
				storageFormatElements[key] = JSON.stringify(parsedData[key], '', '\t');
			});
			
		} catch (err) {
			xLog.saveProcessFile(`${moduleName}_BadPromptFormatData`, promptFormatData);
			xLog.error(`Saved promptFormatData in ${moduleName}_BadPromptFormatData`);
			xLog.error(`Failed to convert prompt format back to storageFormat: ${err.message}`);
			throw new Error(`Conversion failed: ${err.message}`);
		}
		
		return storageFormatElements;
	};

	const formulatePromptList = (promptGenerator) => {
		return ({ inputWisdom } = {}) => {
			// Convert processedElements for prompt consumption
			const promptFormatElements = convertStorageToPromptFormat(inputWisdom.processedElements);
			
			// Handle validation messages like fix-problems does
			let validationMessagesString = 'No validation errors detected. Proceed with relationship optimization and coherence improvements.';
			if (inputWisdom.qtGetSurePath('validationMessage', {})) {
				const validationMessage = inputWisdom.validationMessage;
				if (validationMessage && validationMessage.errors && validationMessage.errors.length > 0) {
					validationMessagesString = `${validationMessage.errorCount} validation errors detected:\n\n`;
					validationMessage.errors.forEach((error, index) => {
						validationMessagesString += `Error ${index + 1}: ${error.type} (${error.severity})\n`;
						validationMessagesString += `Issue: ${error.issue}\n`;
						validationMessagesString += `Fix: ${error.fix}\n\n`;
					});
				}
			}
			
			return promptGenerator.iterativeGeneratorPrompt({
				...inputWisdom,
				processedElements: promptFormatElements,
				validationMessagesString,
				employerModuleName: moduleName, // Use the new prompt
			});
		};
	};

	// ================================================================================
	// TALK TO AI

	const accessSmartyPants = (aiRequestData, callback) => {
		let { promptList, systemPrompt } = aiRequestData;

		const localCallback = (err, result) => {
			callback('', result);
		};
		promptList.unshift({ role: 'system', content: systemPrompt });
		smartyPants.accessExternalResource({ promptList }, localCallback);
	};

	// ================================================================================
	// ================================================================================
	// DO THE JOB

	const executeRequest = (initialArgs, callback) => {
		const { latestWisdom: inputWisdom } = initialArgs;

		// Critical validation: coherence-generator REQUIRES processedElements from iterate-over-collection
		const {processedElements: storageFormatElements} = inputWisdom;
		
		if (!storageFormatElements) {
			const errorMsg = `CRITICAL ERROR in ${moduleName}: No processedElements received from previous conversation. This is required input for coherence analysis.`;
			xLog.error(errorMsg);
			throw new Error(errorMsg);
		}


		const taskList = new taskListPlus();

		// --------------------------------------------------------------------------------
		// GENERATE PROMPTS

		taskList.push((promptGenerationData, next) => {
			const {
				promptGenerator,
				formulatePromptList,
				accessor,
				inputWisdom
			} = promptGenerationData;

			const promptElements = formulatePromptList(promptGenerator)({ inputWisdom, accessor }); //takes wisdom object with data to process; returns promptList (OpenAI format), extractionFunction, extractionParameters, and tools from prompt library

			xLog.saveProcessFile(
				`${moduleName}_promptList.log`,
				`\n\n\n${moduleName}---------------------------------------------------\n${promptElements.promptList[0].content}\n----------------------------------------------------\n\n`,
				{ append: true },
			);

			next('', { ...promptGenerationData, promptElements });
		});

		// --------------------------------------------------------------------------------
		// APPLY PRE-AI TOOLS

		taskList.push((preAiProcessingData, next) => {
			const { promptElements, inputWisdom, accessor } = preAiProcessingData;
			const { tools } = promptElements;

			// Apply beforeAiProcess tool if available
			if (tools && tools.beforeAiProcess) {
				try {
					const storageFormatElements = accessor ? accessor.getLatestWisdom('processedElements') : inputWisdom.processedElements;
					const promptFormatElements = convertStorageToPromptFormat(storageFormatElements);
					const balancedPromptElements = tools.beforeAiProcess(promptFormatElements);
					const balancedStorageElements = convertPromptToStorageFormat(balancedPromptElements);
					
					// Update inputWisdom with balanced data
					const enhancedWisdom = {
						...inputWisdom,
						processedElements: balancedStorageElements
					};
					
					next('', { ...preAiProcessingData, inputWisdom: enhancedWisdom });
				} catch (error) {
					xLog.error(`${moduleName}: Error applying beforeAiProcess tool: ${error.message}`);
					next('', preAiProcessingData); // Continue without tool processing
				}
			} else {
				next('', preAiProcessingData);
			}
		});

		// --------------------------------------------------------------------------------
		// CALL AI

		taskList.push((aiInteractionData, next) => {
			const { accessSmartyPants, promptElements, systemPrompt } = aiInteractionData;
			const { promptList } = promptElements;

			const localCallback = (err, result) => {
				next(err, { ...aiInteractionData, ...result });
			};

			accessSmartyPants({ promptList, systemPrompt }, localCallback); //promptList is one or more OpenAI formatted prompts sent from the prompt generator; systemPrompt is hard coded
		});

		// --------------------------------------------------------------------------------
		// EXTRACT RESULTS

		taskList.push((extractionData, next) => {
			const { wisdom: rawWisdom, promptElements, inputWisdom } = extractionData;
			const { extractionParameters, extractionFunction } = promptElements;

			xLog.saveProcessFile(
				`${moduleName}_responseList.log`,
				`\n\n\n${moduleName}---------------------------------------------------\n${rawWisdom}\n----------------------------------------------------\n\n`,
				{ append: true },
			);

			const extractedResponseData = extractionFunction(rawWisdom);
			const { processedElements: extractedPromptElements } = extractedResponseData;

			// Critical validation: coherence-generator MUST produce processedElements
			if (!extractedPromptElements) {
				const errorMsg = `CRITICAL ERROR in ${moduleName}: Failed to extract processedElements from AI response. Check prompt and extraction function.`;
				xLog.error(errorMsg);
				throw new Error(errorMsg);
			}

			// Convert back to original format: {key: "json string", key2: "json string"}
			const finalStorageElements = convertPromptToStorageFormat(extractedPromptElements);

			// Let check-group-validity determine isValid - do not set it here
			next('', { ...extractionData, processedElements: finalStorageElements });
		});

		// --------------------------------------------------------------------------------
		// INIT AND EXECUTE THE PIPELINE

		const initialPipelineData = {
			promptGenerator,
			formulatePromptList,
			accessSmartyPants,
			systemPrompt,
			inputWisdom,
			...initialArgs,
		};

		pipeRunner(taskList.getList(), initialPipelineData, (err, finalPipelineData) => {
			const { inputWisdom, processedElements: finalStorageElements } = finalPipelineData;
			
			// Create new wisdom object without circular references
			// Copy all properties except _conversationMetadata which contains circular refs
			xLog.status(`HACK: Circular reference hack, fix this.`);
			const { _conversationMetadata, ...safeWisdom } = inputWisdom;
			const outputWisdom = {
				...safeWisdom,
			};

			outputWisdom.processedElements = finalStorageElements; //send the revised data onward
			

			xLog.verbose(
				`${moduleName}: Wisdom property content:\n${JSON.stringify(finalStorageElements, null, 2)}`,
			);
			xLog.saveProcessFile(
				`${moduleName}_processedElements.log`,
				`\n\n\n${moduleName}---------------------------------------------------\n${JSON.stringify(finalStorageElements, null, 2)}\n----------------------------------------------------\n\n`,
				{ append: true },
			);
			
			
			callback(err, { wisdom: outputWisdom, args: finalPipelineData });
		});
	};

	return { executeRequest };
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;
//module.exports = new moduleFunction();
//moduleFunction().workingFunction().qtDump();
