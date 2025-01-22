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
		const localCallback = (err, suggestionList) => {
			callback('', {suggestionList});
		};

		const url = 'https://genericwhite.com/ping';
		xLog.status(`validating with ${url}`);

		const axiosParms = {
			method: 'get',
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
				// const result = response.data;
				const result = [
					"Suggestion One", "Suggestion Two", "Suggesiton Three"
				];
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
		const currentXml = args.qtGetSurePath('latestWisdom.initialThinkerData');
		const elementDefinition = args.qtGetSurePath('latestWisdom.initialThinkerData');

		if (!currentXml) {
			throw `No XML received from previous Thinker (fix-problems) in ${moduleName}`;
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

			const localCallback = (err, {suggestionList}={}) => {

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

			accessSmartyPants(currentXml, localCallback);
		});

		// --------------------------------------------------------------------------------
		// INIT AND EXECUTE THE PIPELINE

		const initialData = {
			...args,
			currentXml,
			elementDefinition
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

