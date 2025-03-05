#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const qt = require('qtools-functional-library');
const { pipeRunner, taskListPlus, mergeArgs, forwardArgs } = new require(
	'qtools-asynchronous-pipe-plus',
)();

const { exec, execSync } = require('child_process');

//START OF moduleFunction() ============================================================

const moduleFunction = function ({ dotD, passThroughParameters }) {
	// ================================================================================
	// INITIALIZATION

	const { xLog, getConfig, rawConfig, commandLineParameters } = process.global;
	const localConfig = getConfig(moduleName); //moduleName is closure

	const { sqlDb, mapper, dataMapping } = passThroughParameters;

	// ================================================================================
	// SERVICE FUNCTION

	const serviceFunction = (xReq, callback) => {
		

		const taskList = new taskListPlus();

		// --------------------------------------------------------------------------------
		// TASK: Query database for CEDS element by xReq

		taskList.push((args, next) => {
			const { sqlDb, mapper, xReq } = args;
			const localCallback = (error, stdout, stderr) => {
				

				next(error, { ...args, result: stdout });
			};


			const queryString = xReq.query.queryString
console.log(`queryString=${queryString}`);


			const shellCommand = `/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/code/cli/lib.d/ceds-vector-tools/cedsVectorTools.js -json --queryString=${queryString}`;
			exec(shellCommand, localCallback);
		});

		// --------------------------------------------------------------------------------
		// INIT AND EXECUTE THE PIPELINE

		const initialData = { sqlDb, mapper, dataMapping, xReq };
		pipeRunner(taskList.getList(), initialData, (err, args) => {
			if (err) {
				xLog.error(`FAILED: ${err} (${moduleName})`);
				callback(err);
				return;
			}

			callback('', args.result);
		});
	};

	// ================================================================================
	// Access Point Constructor

	const addEndpoint = ({ name, serviceFunction, dotD }) => {
		dotD.logList.push(name);
		dotD.library.add(name, serviceFunction);
	};

	// ================================================================================
	// Do the constructing

	const name = 'ceds-semantic-distance';

	addEndpoint({ name, serviceFunction, dotD });

	return {};
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;
