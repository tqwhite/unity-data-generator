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
	const { xLog } = process.global;

	const { thinkerSpec, smartyPants } = args; //ignoring thinker specs included in args

	const systemPrompt =
		'You are a data scientist, Working to accurately process XML data. You are determined to produce complete, useful test data.';

	// ================================================================================
	// UTILITIES

	const promptGenerator = require('../lib/prompt-generator')();

	const formulatePromptList =
		(promptGenerator) =>
		({ latestWisdom, elementSpecWorksheetJson } = {}) => {
			return promptGenerator.iterativeGeneratorPrompt({
				...latestWisdom,
				elementSpecWorksheetJson,
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
		smartyPants.accessExternalResource({ promptList }, localCallback); //in this case, smartyPants is gpt4-completion
	};

	// ================================================================================
	// ================================================================================
	// DO THE JOB

	const executeRequest = (args, callback) => {
		const { thinkerExchangePromptData } = args;
		const taskList = new taskListPlus();

		// --------------------------------------------------------------------------------
		// TASKLIST ITEM TEMPLATE

		taskList.push((args, next) => {
			const {
				promptGenerator,
				formulatePromptList,
				thinkerExchangePromptData,
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
			const { wisdom: rawWisdom, promptElements } = args;
			const { extractionParameters, extractionFunction } = promptElements;

			xLog.saveProcessFile(
				`${moduleName}_responseList.log`,
				`\n\n\n${moduleName}---------------------------------------------------\n${rawWisdom}\n----------------------------------------------------\n\n`,
				{ append: true },
			);

			const wisdom = extractionFunction(rawWisdom);

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
			const { wisdom, rawAiResponseObject } = args;
			callback(err, { wisdom, args });
		});
	};

	return { executeRequest };
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;
//module.exports = new moduleFunction();
//moduleFunction().workingFunction().qtDump();

