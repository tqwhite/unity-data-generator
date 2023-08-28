#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot
//const projectRoot=fs.realpathSync(path.join(__dirname, '..', '..')); // adjust the number of '..' to fit reality

const qt = require('qtools-functional-library'); //qt.help({printOutput:true, queryString:'.*', sendJson:false});

	const { Configuration, OpenAIApi } = require('openai');

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

//NOTENOTENOTENOTENOTE: this is actually used by conversation-generator.js

const moduleFunction = function() {
	const { xLog, getConfig } = process.global;
	const {smartyPantsList} = getConfig(moduleName); //getConfig(`${moduleName}`);

	const smartyPantsFactory = ({smartyPantsName}) => {
		const {moduleName, accessParms}=smartyPantsList[smartyPantsName];
		const smartyPants=require(`./lib/${moduleName}`)({accessParms})
		return smartyPants;
	};


	return smartyPantsFactory;
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;
//module.exports = new moduleFunction();
//moduleFunction().workingFunction().qtDump();

