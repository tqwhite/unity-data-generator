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
	const { promptLibraryModulePath } = getConfig(moduleName);

	const { thinkerSpec, smartyPants } = args; //ignoring thinker specs included in args
	const systemPrompt =
		"You are a top level expert in XML data modeling and syntax. Your goal is to provide actual data. Explanations are only for exceptions and are very brief. Let's think step by step and check conclusions.";

	// ================================================================================
	// UTILITIES

	const promptGenerator = require('../lib/prompt-generator')({
		promptLibraryModulePath,
	});

	const formulatePromptList =
		(promptGenerator) =>
		({ latestWisdom, elementSpecWorksheetJson } = {}) => {
			return promptGenerator.iterativeGeneratorPrompt({
				...latestWisdom,
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
		promptList.unshift({ role: 'user', content: systemPrompt });
		smartyPants.accessExternalResource({ promptList }, localCallback); //in this case, smartyPants is gpt4-completion
	};

	// ================================================================================
	// ================================================================================
	// DO THE JOB

	const executeRequest = (args, callback) => {
		const taskList = new taskListPlus();

		// --------------------------------------------------------------------------------
		// TASKLIST ITEM TEMPLATE

		taskList.push((args, next) => {
			const { promptGenerator, formulatePromptList, sifElement } = args;

			// args.latestWisdom.initialThinkerData is supplied by task-runner in qtools.ai()
			args.latestWisdom.latestXml=args.latestWisdom.latestXml?args.latestWisdom.latestXml:args.latestWisdom.initialThinkerData;

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
			const { wisdom: rawWisdom, promptElements, latestWisdom } = args;
			const { extractionParameters, extractionFunction } = promptElements;

			xLog.saveProcessFile(
				`${moduleName}_responseList.log`,
				`\n\n\n${moduleName}---------------------------------------------------\n${rawWisdom}\n----------------------------------------------------\n\n`,
				{ append: true },
			);
			const tmp = extractionFunction(rawWisdom);
			const { latestXml, initialThinkerData } = extractionFunction(rawWisdom);
			const wisdom = { ...latestWisdom, latestXml };

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
			callback(err, { wisdom, args }); //generally, wisdom can contain many extracted values
		});
	};

	return { executeRequest };
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;
//module.exports = new moduleFunction();
//moduleFunction().workingFunction().qtDump();

