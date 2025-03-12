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

	const accessSmartyPants = (
		{ suggestionUrl, elementDefinition },
		callback,
	) => {
		const localCallback = (error, stdout, stderr) => {
			const suggestionList = stdout.split('\n');

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

