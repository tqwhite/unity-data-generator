#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot
//const projectRoot=fs.realpathSync(path.join(__dirname, '..', '..')); // adjust the number of '..' to fit reality

const qt = require('qtools-functional-library'); //qt.help({printOutput:true, queryString:'.*', sendJson:false});
const asynchronousPipePlus = new require('qtools-asynchronous-pipe-plus')();
const pipeRunner = asynchronousPipePlus.pipeRunner;
const taskListPlus = asynchronousPipePlus.taskListPlus;

// NOTE: THIS IS USUALLY A TQ NO-NO. This value is common to all instantiations of this
// module. Fortunately, this is a batch program so it is only instantiated for the one
// processing run.

const validationList=[];

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

	const systemPrompt =
		'You are a data scientist, Working to accurately generate synthetic test data. You are determined to produce complete, useful test data.';

	// ================================================================================
	// UTILITIES

	const formulatePromptList = (promptGenerator) => {
		return ({ latestWisdom, elementSpecWorksheetJson, accessor } = {}) => {
			// Get elementSpecWorksheetJson from metadata if using wisdomBus
			if (accessor && !elementSpecWorksheetJson) {
				elementSpecWorksheetJson = accessor.getMetadata('elementSpecWorksheetJson');
			}
			
			// Get validation message from wisdomBus or latestWisdom
			const validationMessage = accessor ? accessor.getLatestWisdom('validationMessage') : latestWisdom.validationMessage;

			let validationMessagesString = 'No errors found.';
			if (validationMessage && validationMessage.error) {
				validationList.push(validationMessage.error);
				validationMessagesString = validationList.join('\n');
			}
			
			// Get generatedSynthData from wisdomBus or latestWisdom
			const generatedSynthData = accessor ? accessor.getLatestWisdom('generatedSynthData') : latestWisdom.generatedSynthData;
			
			return promptGenerator.iterativeGeneratorPrompt({
				...latestWisdom,
				generatedSynthData,
				elementSpecWorksheetJson,
				validationMessagesString,
				employerModuleName: moduleName,
			});
		};
	};


	// ================================================================================
	// TALK TO AI

	const accessSmartyPants = (args, callback) => {
		let { promptList, systemPrompt, temperatureFactor } = args;

		const localCallback = (err, result) => {
			callback('', result);
		};
		promptList.unshift({ role: 'system', content: systemPrompt });
		smartyPants.accessExternalResource(
			{ promptList, temperatureFactor },
			localCallback,
		); //in this case, smartyPants is gpt4-completion
	};

	// ================================================================================
	// ================================================================================
	// DO THE JOB

	const executeRequest = (args, callback) => {
		const { wisdomBus } = args;
		const taskList = new taskListPlus();
		
		// wisdomBus is already an accessor created by conversation-generator
		const accessor = wisdomBus;
		
		// Critical validation: fix-problems REQUIRES generatedSynthData from previous thinker
		const generatedSynthData = accessor ? accessor.getLatestWisdom('generatedSynthData') : args.qtGetSurePath('latestWisdom.generatedSynthData');
		if (!generatedSynthData) {
			const errorMsg = `CRITICAL ERROR in ${moduleName}: No generatedSynthData received from previous thinker. This is required input for fix-problems processing.`;
			xLog.error(errorMsg);
			throw new Error(errorMsg);
		}

		// --------------------------------------------------------------------------------
		// TASKLIST ITEM TEMPLATE

		taskList.push((args, next) => {
			const {
				promptGenerator,
				formulatePromptList,
				accessor
			} = args;

			const promptElements = formulatePromptList(promptGenerator)({ ...args, accessor });

			xLog.saveProcessFile(
				`${moduleName}_promptList.log`,
				`\n\n\n${moduleName}---------------------------------------------------\n${promptElements.promptList[0].content}\n----------------------------------------------------\n\n`,
				{ append: true },
			);

			next('', { ...args, promptElements });
		});

		// --------------------------------------------------------------------------------
		// TASKLIST ITEM TEMPLATE

		taskList.push((args, next) => {
			const { accessSmartyPants, promptElements, systemPrompt } = args;
			const { promptList } = promptElements;

			const localCallback = (err, result) => {
				next(err, { ...args, ...result });
			};

			accessSmartyPants({ promptList, systemPrompt }, localCallback);
		});

		// --------------------------------------------------------------------------------
		// TASKLIST ITEM TEMPLATE

		taskList.push((args, next) => {
			const { wisdom: rawWisdom, promptElements, latestWisdom, accessor } = args;
			const { extractionParameters, extractionFunction } = promptElements;

			xLog.saveProcessFile(
				`${moduleName}_responseList.log`,
				`\n\n\n${moduleName}---------------------------------------------------\n${rawWisdom}\n----------------------------------------------------\n\n`,
				{ append: true },
			);
			
			const extractedData = extractionFunction(rawWisdom);
			const wisdom = {...latestWisdom, ...extractedData};
			
			// Save to wisdom-bus if available
			if (accessor && extractedData.generatedSynthData) {
				accessor.saveWisdom('generatedSynthData', extractedData.generatedSynthData);
			}
			if (accessor && extractedData.explanation) {
				accessor.saveWisdom('fixProblemsExplanation', extractedData.explanation);
			}

			next('', { ...args, wisdom });
		});

		// --------------------------------------------------------------------------------
		// INIT AND EXECUTE THE PIPELINE

		const initialData = {
			promptGenerator,
			formulatePromptList,
			accessSmartyPants,
			systemPrompt,
			...args,
			wisdomBus,
			accessor
		};
		pipeRunner(taskList.getList(), initialData, (err, args) => {
			const { wisdom } = args;

			const lastThinkerWisdom = args.qtGetSurePath(
				`thinkerResponses.${args.lastThinkerName}.wisdom.generatedSynthData`,
			);

			xLog.verbose(
				`\n------------------------\nSynthData Refinement Explanation:\n${wisdom.explanation}\n------------------------`,
			);

			const refinementReportPartialTemplate = `
====================================================================================================
SynthData REFINEMENT PASS ${new Date().toLocaleString()}

The Refined SynthData below was evaluated. Here are the details of the process that allowed for the errors...

------------------------\nBefore Refining SynthData:\n${lastThinkerWisdom}\n------------------------

------------------------\nRefined SynthData:\n${wisdom.generatedSynthData}\n------------------------

------------------------\nSynthData Refinement Explanation:\n${wisdom.explanation}\n------------------------

The Refined SynthData was submited to the validation API with this result:

<!validationMessage!>

------------------------
			`;

			// Save refinement report to wisdom-bus if available
			if (accessor) {
				accessor.saveWisdom('refinementReportPartialTemplate', refinementReportPartialTemplate);
				accessor.saveWisdom('isValid', true);
			}
			
			// Maintain backward compatibility
			if (wisdomBus) {
				// Return success only when using wisdomBus
				callback(err, { success: !err });
			} else {
				// Return wisdom for legacy mode
				callback(err, {
					wisdom: { ...wisdom, isValid: true, refinementReportPartialTemplate },
					args,
				});
			}
		});
	};

	return { executeRequest };
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;
//module.exports = new moduleFunction();
//moduleFunction().workingFunction().qtDump();

