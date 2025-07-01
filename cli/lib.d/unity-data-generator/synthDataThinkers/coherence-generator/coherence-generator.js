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

	const convertProcessedElementsToPromptFormat = (processedElements) => {
		const convertedElements = {};
		
		Object.keys(processedElements).forEach(key => {
			try {
				// Parse the JSON string to object, then stringify for clean formatting
				convertedElements[key] = JSON.parse(processedElements[key]);
			} catch (err) {
				xLog.error(`Failed to parse JSON for ${key}: ${err.message}`);
				// Keep original if parse fails
				convertedElements[key] = processedElements[key];
			}
		});
		
		return JSON.stringify(convertedElements, null, 2);
	};

	const convertPromptFormatToProcessedElements = (promptFormatData) => {
		const convertedElements = {};
		
		try {
			// Parse the AI response JSON
			const parsedData = typeof promptFormatData === 'string' 
				? JSON.parse(promptFormatData) 
				: promptFormatData;
			
			Object.keys(parsedData).forEach(key => {
				// Convert each object back to JSON string format
				convertedElements[key] = JSON.stringify(parsedData[key], '', '\t');
			});
			
		} catch (err) {
			xLog.error(`Failed to convert prompt format back to processedElements: ${err.message}`);
			throw new Error(`Conversion failed: ${err.message}`);
		}
		
		return convertedElements;
	};

	const formulatePromptList =
		(promptGenerator) =>
		({ latestWisdom } = {}) => {
			// Convert processedElements for prompt consumption
			const convertedProcessedElements = convertProcessedElementsToPromptFormat(latestWisdom.processedElements);
			
			return promptGenerator.iterativeGeneratorPrompt({
				...latestWisdom,
				processedElements: convertedProcessedElements,
				employerModuleName: moduleName,
			});
		};

	// ================================================================================
	// TALK TO AI

	const accessSmartyPants = (args, callback) => {
		let { promptList, systemPrompt } = args;

		const localCallback = (err, result) => {
			callback('', result);
		};
		promptList.unshift({ role: 'system', content: systemPrompt });
		smartyPants.accessExternalResource({ promptList }, localCallback);
	};

	// ================================================================================
	// ================================================================================
	// DO THE JOB

	const executeRequest = (args, callback) => {
		const { latestWisdom } = args;

		// Critical validation: coherence-generator REQUIRES processedElements from iterate-over-collection
		const {processedElements} = latestWisdom;
		
		if (!processedElements) {
			const errorMsg = `CRITICAL ERROR in ${moduleName}: No processedElements received from previous conversation. This is required input for coherence analysis.`;
			xLog.error(errorMsg);
			throw new Error(errorMsg);
		}


		const taskList = new taskListPlus();

		// --------------------------------------------------------------------------------
		// GENERATE PROMPTS

		taskList.push((args, next) => {
			const {
				promptGenerator,
				formulatePromptList,
			} = args;

			const promptElements = formulatePromptList(promptGenerator)(args);

			xLog.saveProcessFile(
				`${moduleName}_promptList.log`,
				`\n\n\n${moduleName}---------------------------------------------------\n${promptElements.promptList[0].content}\n----------------------------------------------------\n\n`,
				{ append: true },
			);

			next('', { ...args, promptElements });
		});

		// --------------------------------------------------------------------------------
		// CALL AI

		taskList.push((args, next) => {
			const { accessSmartyPants, promptElements, systemPrompt } = args;
			const { promptList } = promptElements;

			const localCallback = (err, result) => {
console.log(`\n=-=============   result  ========================= [coherence-generator.js.moduleFunction]\n`)


				next(err, { ...args, ...result });
			};

			accessSmartyPants({ promptList, systemPrompt }, localCallback);
		});

		// --------------------------------------------------------------------------------
		// EXTRACT RESULTS

		taskList.push((args, next) => {
			const { wisdom: rawWisdom, promptElements, latestWisdom } = args;
			const { extractionParameters, extractionFunction } = promptElements;

			xLog.saveProcessFile(
				`${moduleName}_responseList.log`,
				`\n\n\n${moduleName}---------------------------------------------------\n${rawWisdom}\n----------------------------------------------------\n\n`,
				{ append: true },
			);

			const extractedData = extractionFunction(rawWisdom);
			const { processedElements: extractedProcessedElements } = extractedData;

			// Critical validation: coherence-generator MUST produce processedElements
			if (!extractedProcessedElements) {
				const errorMsg = `CRITICAL ERROR in ${moduleName}: Failed to extract processedElements from AI response. Check prompt and extraction function.`;
				xLog.error(errorMsg);
				throw new Error(errorMsg);
			}

			// Convert back to original format: {key: "json string", key2: "json string"}
			const processedElements = convertPromptFormatToProcessedElements(extractedProcessedElements);

			// For answer-until-valid facilitator, we need to return isValid=true
			const isValid = true;
			next('', { ...args, processedElements, isValid });
		});

		// --------------------------------------------------------------------------------
		// INIT AND EXECUTE THE PIPELINE

		const initialData = {
			promptGenerator,
			formulatePromptList,
			accessSmartyPants,
			systemPrompt,
			...args,
		};

		pipeRunner(taskList.getList(), initialData, (err, args) => {
			const { latestWisdom, isValid, processedElements } = args;
			
			// Create new wisdom object without circular references
			// Copy all properties except _conversationMetadata which contains circular refs
			xLog.status(`HACK: Circular reference hack, fix this.`);
			const { _conversationMetadata, ...safeWisdom } = latestWisdom;
			const wisdom = {
				...safeWisdom,
				isValid,
			};

			wisdom.processedElements=processedElements; //send the revised data onward
			

			xLog.verbose(
				`${moduleName}: Wisdom property content:\n${JSON.stringify(processedElements, null, 2)}`,
			);
			xLog.saveProcessFile(
				`${moduleName}_processedElements.log`,
				`\n\n\n${moduleName}---------------------------------------------------\n${JSON.stringify(processedElements, null, 2)}\n----------------------------------------------------\n\n`,
				{ append: true },
			);
			
			
			xLog.status(`${moduleName}: Completed with isValid=${isValid}`);
			callback(err, { wisdom, args });
		});
	};

	return { executeRequest };
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;
//module.exports = new moduleFunction();
//moduleFunction().workingFunction().qtDump();
