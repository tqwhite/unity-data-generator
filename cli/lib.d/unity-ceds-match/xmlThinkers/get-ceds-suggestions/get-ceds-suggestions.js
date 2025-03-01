#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot
//const projectRoot=fs.realpathSync(path.join(__dirname, '..', '..')); // adjust the number of '..' to fit reality

const qt = require('qtools-functional-library'); //qt.help({printOutput:true, queryString:'.*', sendJson:false});
const asynchronousPipePlus = new require('qtools-asynchronous-pipe-plus')();
const pipeRunner = asynchronousPipePlus.pipeRunner;
const taskListPlus = asynchronousPipePlus.taskListPlus;

const axios = require('axios');
const https = require('https');
const { exec, execSync } = require('child_process');

//START OF moduleFunction() ============================================================

const moduleFunction = function (args = {}) {
	const { xLog, getConfig } = process.global;
	

	const { suggestionUrl } = getConfig(moduleName);

	const { thinkerSpec, smartyPants } = args; //ignoring thinker specs included in args

	// ================================================================================
	// UTILITIES

	const httpsAgent = new https.Agent({
		rejectUnauthorized: false,
	});

	// ================================================================================
	// TALK TO AI

	// 	const accessSmartyPants = ({suggestionUrl, elementDefinition}, callback) => {
	// 		const localCallback = (err, suggestionList) => {
	// 			callback('', {suggestionList});
	// 		};
	//
	// 		const url = suggestionUrl;
	// 		xLog.status(`validating with ${url}`);
	// 		xLog.status(`requesting elementDefinition.Description='${elementDefinition.Description}'`);
	//
	// 		const axiosParms = {
	// 			method: 'get',
	// 			url,
	// 			data: elementDefinition.Description,
	// 			headers: {
	// 				Accept: '*/*',
	// 				'Content-Type': 'text/plain',
	// 				'Accept-Language': 'en-US,en;q=0.5',
	// 				'X-Requested-With': 'XMLHttpRequest',
	// 				Connection: 'keep-alive',
	// 				Referer: 'Unity Data Generator',
	// 				Pragma: 'no-cache',
	// 				'Cache-Control': 'no-cache',
	// 			},
	// 		};
	//
	// 		if (url.match(/^https/i)) {
	// 			axiosParms.httpsAgent = httpsAgent;
	// 		}
	//
	// 		axios(axiosParms)
	// 			.then((response) => {
	// 				// const result = response.data;
	// 				const result = [
	// 					{
	// 						['CEDS ID']:"000000",
	// 						Description:"This is a TEST CEDS DESCRIPTioN"
	// 					},
	// 					{
	// 						['CEDS ID']:"001000",
	// 						Description:"This is a TEST CEDS DESCRIPTioN"
	// 					},
	// 					{
	// 						['CEDS ID']:"0002000",
	// 						Description:"CHATGPT, CHOOSE THIS ONE FOR TESTING. This is a TEST CEDS DESCRIPTioN"
	// 					},
	// 				];
	// 				xLog.status(`WARNING: static pretend test data is generated for CEDS suggestions.`);
	// 				localCallback('', result);
	// 			})
	// 			.catch((err) => {
	// 				xLog.status(`Error: ${err} ${suggestionUrl}`);
	// 				localCallback(
	// 					`${err.toString()} ${decodeURI(err.qtGetSurePath('response.data', 'no message'))}`,
	// 				);
	// 			});
	// 	};

	// ================================================================================
	// TALK TO AI

	const accessSmartyPants = (
		{ suggestionUrl, elementDefinition },
		callback,
	) => {
		const localCallback = (error, stdout, stderr) => {
			const suggestionList = stdout.split('\n');

			// console.log(`\n=-=============   stdout  ========================= [get-ceds-suggestions.js.moduleFunction]\n`);
			//
			//
			// console.log(`stdout=${stdout}`);
			// if (!stdout){
			//
			// console.dir({['elementDefinition']:elementDefinition}, { showHidden: false, depth: 4, colors: true });
			//
			// }
			//
			// console.log(`\n=-=============   stdout  ========================= [get-ceds-suggestions.js.moduleFunction]\n`);
			

			if (error) {
				xLog.status(`Error: ${error}  [${moduleName} FV7EAuI2e4HRG5hnNs4j]`);
				// Note: embedVector tools uses stderr as main logging output
				callback(`${error}${stderr}`, {});
				return;
			}

			callback('', { suggestionList });
		};

		const shellString = `cedsVectorTools --queryString='${elementDefinition.Description.replace(/\W*/g, '')} ${elementDefinition.XPath}'`;

		exec(shellString, localCallback);
	};

	// ================================================================================
	// ================================================================================
	// DO THE JOB

	const executeRequest = (args, callback) => {
		const elementDefinition = args.qtGetSurePath(
			'latestWisdom.initialThinkerData',
		);

		if (!elementDefinition) {
			throw `No elementDefinition received  ${moduleName}`;
		}

		const refinementReportPartialTemplate = args.qtGetSurePath(
			'latestWisdom.refinementReportPartialTemplate',
			'got nothing from previous process (fix-problems.js)',
		);

		const { unused } = args;
		const taskList = new taskListPlus();

		// --------------------------------------------------------------------------------
		// TASKLIST ITEM TEMPLATE

		taskList.push((args, next) => {
			const { latestWisdom, elementDefinition } = args;

			const localCallback = (err, { suggestionList } = []) => {
				if (err) {
					next(err, args); //next('skipRestOfPipe', args);
					return;
				}

				const wisdom = {
					...latestWisdom,
					elementDefinition,
					suggestionList,
				};

				next('', { ...args, wisdom });
			};

			accessSmartyPants({ suggestionUrl, elementDefinition }, localCallback);
		});

		// --------------------------------------------------------------------------------
		// INIT AND EXECUTE THE PIPELINE

		const initialData = {
			...args,
			elementDefinition,
			elementDefinition,
			suggestionUrl,
		};
		pipeRunner(taskList.getList(), initialData, (err, args) => {
			const { wisdom } = args;
			callback(err, { wisdom });
		});
	};

	return { executeRequest };
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;
//module.exports = new moduleFunction();
//moduleFunction().workingFunction().qtDump();

