#!/usr/bin/env node
'use strict';
// Suppress punycode deprecation warning
process.noDeprecation = true;

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

const qt = require('qtools-functional-library'); //also exposes qtLog(); qt.help({printOutput:true, queryString:'.*', sendJson:false});

const os = require('os');
const path = require('path');
const fs = require('fs');

console.log(`HELLO FROM ${__dirname}/${moduleName}`);


//START OF moduleFunction() ============================================================
const moduleFunction = ({ moduleName } = {}) => ({ unused }={}) => {
	const { xLog, getConfig, rawConfig, commandLineParameters, projectRoot } = process.global;
	const localConfig = getConfig(moduleName); //moduleName is closure

console.log(`\n=-=============   localConfig  ========================= [database-operations.js.]\n`);


console.dir({['localConfig']:localConfig}, { showHidden: false, depth: 4, colors: true });

console.log(`\n=-=============   localConfig  ========================= [database-operations.js.]\n`);


	const workingFunction = () => {
		return 'hello';
	};
	
	xLog.status(`${moduleName} is initialized`);
	return { workingFunction };
};

//END OF moduleFunction() ============================================================


module.exports = moduleFunction({ moduleName });

