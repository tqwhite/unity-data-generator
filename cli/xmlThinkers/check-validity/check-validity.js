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

//START OF moduleFunction() ============================================================

const moduleFunction = function (args = {}) {
	const { xLog } = process.global;

	const { thinkerSpec, smartyPants } = args; //ignoring thinker specs included in args


	// ================================================================================
	// UTILITIES
	
	

	const httpsAgent = new https.Agent({
		rejectUnauthorized: false,
	});

	// ================================================================================
	// TALK TO AI

	const accessSmartyPants = (currentXml, callback) => {
		const localCallback = (err, validationMessage) => {
			let isValid = false;
			if (validationMessage == 'XML is valid.') {
				isValid = true;
			}
			xLog.verbose(`XML VALIDATION RESULT: ${validationMessage}`);
			callback('', { validationMessage, isValid });
		};
		const url = 'https://testharness.a4l.org/SIFController/api/validate/4.3/';
		const axiosParms = {
			method: 'post',
			url,
			data: currentXml,
			headers: {
				Accept: '*/*',
				'Content-Type': 'text/plain',
				'Accept-Language': 'en-US,en;q=0.5',
				'X-Requested-With': 'XMLHttpRequest',
				Connection: 'keep-alive',
				Referer: 'Unity Data Generator',
				Pragma: 'no-cache',
				'Cache-Control': 'no-cache',
			},
		};

		if (url.match(/^https/i)) {
			axiosParms.httpsAgent = httpsAgent;
		}

		axios(axiosParms)
			.then((response) => {
				const result = response.data;
				localCallback('', result);
			})
			.catch((err) => {
				localCallback(
					`${err.toString()} ${decodeURI(err.qtGetSurePath('response.data', 'no message'))}`,
				);
			});
	};

	// ================================================================================
	// ================================================================================
	// DO THE JOB

	const executeRequest = (args, callback) => {
		const currentXml = args.qtGetSurePath(
			'thinkerExchangePromptData.latestResponse.wisdom',
			'got nothing from previous process (fix-problems.js)',
		);
		const refinementReport = args.qtGetSurePath(
			'thinkerExchangePromptData.latestResponse.refinementReport',
			'got nothing from previous process (fix-problems.js)',
		);

		const { thinkerExchangePromptData } = args;
		const taskList = new taskListPlus();

		// --------------------------------------------------------------------------------
		// TASKLIST ITEM TEMPLATE

		taskList.push((args, next) => {
			const { currentXml } = args;

			const localCallback = (err, { validationMessage, isValid }) => {
				if (err) {
					next(err, args); //next('skipRestOfPipe', args);
					return;
				}

				const fileString = refinementReport
					? refinementReport.replace(/<!validationMessage!>/, validationMessage)
					: `No refinement report was generated for inValid XML error ${validationMessage}`;

				console.log(`fileString=${fileString}`);

				if (!isValid) {
					require('fs').writeFileSync('/tmp/refinementLog.log', fileString, {
						append: true,
					});
					xLog.status(`refinement results are saved in /tmp/refinementLog.log`);
				}

				next('', { ...args, validationMessage, isValid });
			};
			

			accessSmartyPants(currentXml, localCallback);
		});

		// --------------------------------------------------------------------------------
		// INIT AND EXECUTE THE PIPELINE

		const initialData = {
			currentXml,
		};
		pipeRunner(taskList.getList(), initialData, (err, args) => {
			const {
				isValid,
				validationMessage,
				currentXml: wisdom,
				rawAiResponseObject = { source: "John's endpoint" },
			} = args;
			callback(err, {
				wisdom,
				validationMessage,
				isValid,
				rawAiResponseObject,
			});
		});
	};

	return { executeRequest };
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;
//module.exports = new moduleFunction();
//moduleFunction().workingFunction().qtDump();

