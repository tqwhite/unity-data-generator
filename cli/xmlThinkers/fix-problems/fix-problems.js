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

console.log(`\n=-=============   latestWisdom  ========================= [fix-problems.js.moduleFunction]\n`);


console.dir({['latestWisdom']:latestWisdom}, { showHidden: false, depth: 4, colors: true });

console.log(`\n=-=============   latestWisdom  ========================= [fix-problems.js.moduleFunction]\n`);


			const { promptList, extractionParameters } =
				promptGenerator.iterativeGeneratorPrompt({
					latestXml: latestWisdom.xml,
					latestValidationMsg: latestWisdom.validationMsg.error,
					elementSpecWorksheetJson,
					employerModuleName: moduleName,
				}); //like everything I make, this returns an array
			return { promptList, extractionParameters }; //extraction parameters are needed for unpacking resukt
		};

	function regexEscape(s) {
		return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
	}

	const filterOutput = (result = '', extractionParameters) => {
		// this could receive a complex string and extract one or more segments for a response
		const regEx = new RegExp(
			`${regexEscape(extractionParameters.frontDelimiter)}(?<xmlResult>.*?)${regexEscape(extractionParameters.backDelimitter)}`,
		);
		const tmp = result.replace(/\n/g, '<Q22820234623146231362>').match(regEx);
		const xml = tmp
			? tmp
					.qtGetSurePath('groups.xmlResult', result)
					.replace(/<Q22820234623146231362>/g, '\n')
			: result;

		const regEx2 = new RegExp(
			`${regexEscape(extractionParameters.explanationFrontDelimitter)}(?<xmlResult>.*?)${regexEscape(extractionParameters.explanationBackDelimitter)}`,
		);
		const tmp2 = result.replace(/\n/g, '<Q22820234623146231362>').match(regEx2);
		const explanation = tmp
			? tmp2
					.qtGetSurePath('groups.xmlResult', result)
					.replace(/<Q22820234623146231362>/g, '\n')
			: result;
		
console.log(`\n=-=============   xml.replace  ========================= [fix-problems.js.moduleFunction]\n`);


		 return { xml:xml.replace(/a/i, 'x'), explanation }; //force validation error
		return { xml, explanation };
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
			const { promptGenerator, formulatePromptList } = args;

			const { promptList, extractionParameters } =
				formulatePromptList(promptGenerator)(args);

			xLog.saveProcessFile(
				`${moduleName}_promptList.log`,
				`\n\n\n${moduleName}---------------------------------------------------\n${promptList[0].content}\n----------------------------------------------------\n\n`,
				{ append: true },
			);

			next('', { ...args, promptList, extractionParameters });
		});

		// --------------------------------------------------------------------------------
		// TASKLIST ITEM TEMPLATE

		taskList.push((args, next) => {
			const { accessSmartyPants, promptList, systemPrompt, temperatureFactor } =
				args;

			const localCallback = (err, result) => {
				next(err, { ...args, ...result });
			};

			accessSmartyPants(
				{ promptList, systemPrompt, temperatureFactor },
				localCallback,
			);
		});

		// --------------------------------------------------------------------------------
		// TASKLIST ITEM TEMPLATE

		taskList.push((args, next) => {
			const { filterOutput, wisdom: rawWisdom, extractionParameters } = args;

			const wisdom = filterOutput(rawWisdom, extractionParameters); //presently the source of being upperCase

			next('', { ...args, wisdom });
		});

		// --------------------------------------------------------------------------------
		// INIT AND EXECUTE THE PIPELINE

		const initialData = {
			promptGenerator,
			formulatePromptList,
			accessSmartyPants,
			systemPrompt,
			filterOutput,
			...args,
		};
		pipeRunner(taskList.getList(), initialData, (err, args) => {

			const { wisdom } = args;

			const lastThinkerWisdom = args.qtGetSurePath(
				`thinkerResponses.${args.lastThinkerName}.wisdom.xml`,
			);

			xLog.verbose(
				`\n------------------------\nXML Refinement Explanation:\n${wisdom.explanation}\n------------------------`,
			);

			const refinementReportPartialTemplate = `
====================================================================================================
XML REFINEMENT PASS ${new Date().toLocaleString()}

The Refined XML below was evaluated. Here are the details of the process that allowed for the errors...
------------------------\nBefore Refining XML:\n${lastThinkerWisdom}\n------------------------
------------------------\nRefined XML:\n${wisdom.xml}\n------------------------
------------------------\nXML Refinement Explanation:\n${wisdom.explanation}\n------------------------

The XML Validation API Refined version was submited to the validation API with this result:

<!validationMessage!>

------------------------
			`;

			callback(err, { wisdom: {...wisdom, isValid:true, refinementReportPartialTemplate}, args }); //valid a priori since it was just fixed
		});
	};

	return { executeRequest };
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;
//module.exports = new moduleFunction();
//moduleFunction().workingFunction().qtDump();

