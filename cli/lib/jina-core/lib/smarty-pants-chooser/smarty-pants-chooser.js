#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot
//const projectRoot=fs.realpathSync(path.join(__dirname, '..', '..')); // adjust the number of '..' to fit reality

const qt = require('qtools-functional-library'); //qt.help({printOutput:true, queryString:'.*', sendJson:false});

console.error(`HELLO FROM: ${__filename}`);

//npm i qtools-functional-library
//npm i qtools-config-file-processor
//npm i qtools-parse-command-line

// const path=require('path');
// const fs=require('fs');

// const configFileProcessor = require('qtools-config-file-processor');
//const config = configFileProcessor.getConfig('systemConfig.ini', __dirname)[__filename.replace(__dirname+'/', '').replace(/.js$/, '')];

// const commandLineParser = require('qtools-parse-command-line');
// const commandLineParameters = commandLineParser.getParameters();

//START OF moduleFunction() ============================================================

const moduleFunction = function(args = {}) {
// 	process.global = {};
// 	process.global.xLog = xLog;
// 	const { getConfig } = args;
 	const localConfig = {}; //getConfig(`${moduleName}`);

	const workingFunctionActual = instanceArgs => operatingArgs => {
		return 'hello';
	};

	const workingFunction = workingFunctionActual({ ...localConfig, ...args });

	return { workingFunction };
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;
//module.exports = new moduleFunction();
//moduleFunction().workingFunction().qtDump();

