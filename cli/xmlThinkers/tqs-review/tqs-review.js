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
	const { xLog, batchSpecificDebugLogDirPath } = process.global;
	const tempFilePath = require('path').join(
		batchSpecificDebugLogDirPath,
		`${moduleName}_prompts.log`,
	);
	xLog.status(`logging all prompts into ${tempFilePath} [${moduleName}]`);

	const { thinkerSpec, smartyPants } = args; //ignoring thinker specs included in args

	const systemPrompt =
		'You are a data scientist, Working to accurately process XML data. You are determined to produce complete, useful test data.';

	// ================================================================================
	// UTILITIES

	const promptGenerator = require('../lib/prompt-generator')();

	const formulatePromptList =
		(promptGenerator) =>
		(thinkerExchangePromptData = {}) => {
			//sample: const promptList = [{ role: 'user', content: 'one sentence about neutron starts' }];
			const {
				specObj,
				currentXml,
				potentialFinalObject,
				elementSpecWorksheetJson,
			} = thinkerExchangePromptData;
			const replaceObject = {
			elementSpecWorksheetJson,
				specObj,
				potentialFinalObject,
				newXmlSegment: thinkerExchangePromptData.latestResponse.wisdom,
				currentXml,
				employerModuleName: moduleName,
			};

			const { promptList, extractionParameters } =
				promptGenerator.iterativeGeneratorPrompt(replaceObject);
			return { promptList, extractionParameters };
		};

	function regexEscape(s) {
		return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
	}

	const filterOutput = (result = '', extractionParameters) => {
		// this could receive a complex string and extract one or more segments for a response
		const regEx = new RegExp(
			`${regexEscape(
				extractionParameters.frontDelimiter,
			)}(?<xmlResult>.*?)${regexEscape(extractionParameters.backDelimitter)}`,
		);
		const tmp = result.replace(/\n/g, '<Q22820234623146231362>').match(regEx);

		// 		const tmp = result
		// 			.replace(/\n/g, '<Q22820234623146231362>')
		// 			.match(/\[START XML SAMPLE\](?<xmlResult>.*?)\[END XML SAMPLE\]/);

		const final = tmp
			? tmp
					.qtGetSurePath('groups.xmlResult', result)
					.replace(/<Q22820234623146231362>/g, '\n')
			: result;
		return final;
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

			const { promptList, extractionParameters } = formulatePromptList(
				promptGenerator,
			)(thinkerExchangePromptData);

			require('fs').appendFileSync(
				tempFilePath,
				`\n\n\n${moduleName}---------------------------------------------------\n${promptList[0].content}\n----------------------------------------------------\n\n`,
			);

			next('', { ...args, promptList, extractionParameters });
		});

		// --------------------------------------------------------------------------------
		// TASKLIST ITEM TEMPLATE

		taskList.push((args, next) => {
			const { accessSmartyPants, promptList, systemPrompt } = args;

			const localCallback = (err, result) => {
				next(err, { ...args, ...result });
			};
			accessSmartyPants({ promptList, systemPrompt }, localCallback);
		});

		// --------------------------------------------------------------------------------
		// TASKLIST ITEM TEMPLATE

		taskList.push((args, next) => {
			const { filterOutput, wisdom: rawWisdom, extractionParameters } = args;

			const processedWisdom = filterOutput(rawWisdom, extractionParameters); //presently the source of being upperCase

			xLog.verbose(
				`\nPROCESSED WISDOM:\n${processedWisdom}\n[${moduleName}]\n`,
			);

			next('', { ...args, processedWisdom });
		});

		// --------------------------------------------------------------------------------
		// INIT AND EXECUTE THE PIPELINE

		const initialData = {
			promptGenerator,
			formulatePromptList,
			accessSmartyPants,
			filterOutput,
			thinkerExchangePromptData,
			systemPrompt,
		};
		pipeRunner(taskList.getList(), initialData, (err, args) => {
			const { processedWisdom: wisdom, rawAiResponseObject } = args;
			callback(err, { wisdom, rawAiResponseObject });
		});
	};

	return { executeRequest };
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;
//module.exports = new moduleFunction();
//moduleFunction().workingFunction().qtDump();

