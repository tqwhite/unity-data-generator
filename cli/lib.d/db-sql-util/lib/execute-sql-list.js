#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

// const qt = require('qtools-functional-library'); //also exposes qtLog(); qt.help({printOutput:true, queryString:'.*', sendJson:false});

const os = require('os');
const path = require('path');
const fs = require('fs');


//START OF moduleFunction() ============================================================
const moduleFunction = ({ moduleName } = {}) => ({ unused }={}) => {
	const { xLog, getConfig, rawConfig, commandLineParameters } = process.global;
	const {databaseFilePath} = getConfig(moduleName); //moduleName is closure

console.log(`databaseFilePath=${databaseFilePath}`);

	const workingFunction = () => {
		return 'hello';
	};
	
	xLog.status(`${moduleName} is initialized`);
	return { workingFunction };
};

//END OF moduleFunction() ============================================================


	module.exports = moduleFunction({ moduleName }); //returns initialized moduleFunction
