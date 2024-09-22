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
		(thinkerExchangePromptData = {}) => {
			//sample: const promptList = [{ role: 'user', content: 'one sentence about neutron starts' }];
			const { potentialFinalObject, validationMessage } =
				thinkerExchangePromptData;
			const replaceObject = {
				...thinkerExchangePromptData,
				potentialFinalObject,
				validationMessage: thinkerExchangePromptData.validationMessage?JSON.stringify(thinkerExchangePromptData.validationMessage, '', '\t'):'No XML structural errors are known',
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
		const regEx = new RegExp( `${regexEscape( extractionParameters.frontDelimiter, )}(?<xmlResult>.*?)${regexEscape(extractionParameters.backDelimitter)}`, );
		const tmp = result.replace(/\n/g, '<Q22820234623146231362>').match(regEx);
		const xml = tmp ? tmp .qtGetSurePath('groups.xmlResult', result) .replace(/<Q22820234623146231362>/g, '\n') : result;
		
		
		const regEx2 = new RegExp( `${regexEscape( extractionParameters.explanationFrontDelimitter, )}(?<xmlResult>.*?)${regexEscape(extractionParameters.explanationBackDelimitter)}`, );
		const tmp2 = result.replace(/\n/g, '<Q22820234623146231362>').match(regEx2);
		const explanation = tmp ? tmp2 .qtGetSurePath('groups.xmlResult', result) .replace(/<Q22820234623146231362>/g, '\n') : result;

		
		return {xml, explanation};
	};

	// ================================================================================
	// TALK TO AI

	const accessSmartyPants = (args, callback) => {
		let { promptList, systemPrompt, temperatureFactor } = args;

		const localCallback = (err, result) => {
			callback('', result);
		};
		promptList.unshift({ role: 'system', content: systemPrompt });
		smartyPants.accessExternalResource({ promptList, temperatureFactor }, localCallback); //in this case, smartyPants is gpt4-completion
	};

	// ================================================================================
	// ================================================================================
	// DO THE JOB

	const executeRequest = (args, callback) => {
		const { thinkerExchangePromptData } = args;

		const taskList = new taskListPlus();

		// --------------------------------------------------------------------------------
		// TASKLIST ITEM TEMPLATE

// 		taskList.push((args, next) => {
// 			const rawAiResponseObject={placeholder:'rawAiResponseObject'};
// 			const processedWisdom='this is processedWisdom';
// 			next('', {...args, processedWisdom, rawAiResponseObject});
// 		});


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
			const { accessSmartyPants, promptList, systemPrompt, thinkerExchangePromptData } = args;
			const {temperatureFactor}=thinkerExchangePromptData
			const localCallback = (err, result) => {

				next(err, { ...args, ...result });
			};

			accessSmartyPants({ promptList, systemPrompt, temperatureFactor }, localCallback);
		});

		// --------------------------------------------------------------------------------
		// TASKLIST ITEM TEMPLATE

		taskList.push((args, next) => {
			const { filterOutput, wisdom: rawWisdom, extractionParameters } = args;

			const {xml:processedWisdom, explanation} = filterOutput(rawWisdom, extractionParameters); //presently the source of being upperCase
			next('', { ...args, processedWisdom, explanation });
		});

		// --------------------------------------------------------------------------------
		// INIT AND EXECUTE THE PIPELINE

		const initialData = {
			promptGenerator,
			formulatePromptList,
			accessSmartyPants,
			thinkerExchangePromptData,
			systemPrompt,
			filterOutput
		};
		pipeRunner(taskList.getList(), initialData, (err, args) => {

			const { processedWisdom:wisdom, explanation, rawAiResponseObject, thinkerExchangePromptData } = args;
			
			xLog.verbose(`\n------------------------\nXML Refinement Explanation:\n${explanation}\n------------------------`)
			
			const refinementReport=`
====================================================================================================
XML REFINEMENT PASS ${new Date().toLocaleString()}

The Refined XML below was evaluated. Here are the details of the process that allowed for the errors...
------------------------\nOriginal XML:\n${thinkerExchangePromptData.potentialFinalObject}\n------------------------
------------------------\nRefined XML:\n${wisdom}\n------------------------
------------------------\nXML Refinement Explanation:\n${explanation}\n------------------------

The XML Validation API returned the following message for the Refined version:

<!validationMessage!>

------------------------
			`;

			callback(err, { wisdom, explanation, refinementReport, rawAiResponseObject });
		});
	};

	return { executeRequest };
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;
//module.exports = new moduleFunction();
//moduleFunction().workingFunction().qtDump();

