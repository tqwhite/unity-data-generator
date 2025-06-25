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
	const { thinkerParameters={} } = args; // Extract from args with default
	const localThinkerParameters = thinkerParameters.qtGetSurePath(moduleName, {});
	
	// Priority: thinkerParameters over getConfig
	const configFromSection = getConfig(moduleName);
	const finalConfig = { ...configFromSection, ...localThinkerParameters };
	
	
	const {promptLibraryModulePath} = finalConfig;

	const { thinkerSpec, smartyPants } = args;

	const systemPrompt =
		'You are a data scientist, Working to accurately generate synthetic test data. You are determined to produce complete, useful test data.';

	// ================================================================================
	// UTILITIES

	const promptGenerator = require('../lib/prompt-generator')({promptLibraryModulePath});

	const formulatePromptList = (promptGenerator) => {
		return ({ latestWisdom, elementSpecWorksheetJson } = {}) => {

			let validationMessagesString = 'No errors found.';
			if (latestWisdom.qtGetSurePath('validationMessage', {}).error) {
				validationList.push(latestWisdom.validationMessage.error);
				validationMessagesString = validationList.join('\n');
			}
			return promptGenerator.iterativeGeneratorPrompt({
				...latestWisdom,
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
		const taskList = new taskListPlus();

		// --------------------------------------------------------------------------------
		// TASKLIST ITEM TEMPLATE

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
			const { wisdom: rawWisdom, promptElements, latestWiisdom } = args;
			const { extractionParameters, extractionFunction } = promptElements;

			xLog.saveProcessFile(
				`${moduleName}_responseList.log`,
				`\n\n\n${moduleName}---------------------------------------------------\n${rawWisdom}\n----------------------------------------------------\n\n`,
				{ append: true },
			);
			
			const wisdom = {...latestWiisdom, ...extractionFunction(rawWisdom)};

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

			callback(err, {
				wisdom: { ...wisdom, isValid: true, refinementReportPartialTemplate },
				args,
			}); //valid a priori since it was just fixed
		});
	};

	return { executeRequest };
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;
//module.exports = new moduleFunction();
//moduleFunction().workingFunction().qtDump();

