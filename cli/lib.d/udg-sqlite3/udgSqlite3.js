#!/usr/bin/env node
'use strict';
// Suppress punycode deprecation warning
process.noDeprecation = true;

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

// const qt = require('qtools-functional-library'); //also exposes qtLog(); qt.help({printOutput:true, queryString:'.*', sendJson:false});

const os = require('os');
const path = require('path');
const fs = require('fs');

console.log(`HELLO FROM ${__dirname}/${moduleName}`);

// npm i qtools-functional-library
// npm i qtools-config-file-processor
// npm i qtools-parse-command-line
// npm i qtools-asynchronous-pipe-plus # often want this for later

//
const commandLineParser = require('qtools-parse-command-line');


const { exec, execSync } = require('child_process');


//START OF moduleFunction() ============================================================
const moduleFunction =
	({ moduleName } = {}) =>
	({ unused } = {}) => {
		const { xLog, getConfig, rawConfig, commandLineParameters, projectRoot } =
			process.global;
		const localConfig = getConfig(moduleName); //moduleName is closure

		const input = process.argv.slice(2).join(' ');

		exec(
			`sqlite3 /Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/datastore/cedsIds.sqlite3 "${input}"`,
			(error, stdout, stderr) => {
				if (error) {
					console.error(`error: ${error.message}`);
					return;
				}
				if (stderr) {
					console.error(`stderr: ${stderr}`);
					return;
				}
				console.log(`stdout: ${stdout}`);
			},
		);
		
		
	};

//END OF moduleFunction() ============================================================


// find project root
const findProjectRoot = ({ rootFolderName = 'system', closest = true } = {}) =>
	__dirname.replace(
		new RegExp(`^(.*${closest ? '' : '?'}\/${rootFolderName}).*$`),
		'$1',
	);
const projectRoot = findProjectRoot(); // call with {closest:false} if there are nested rootFolderName directories and you want the top level one


// prettier-ignore
{
	process.global = {};
	process.global.xLog = fs.existsSync('./lib/x-log')?require('./lib/x-log'):{ status: console.log, error: console.error, result: console.log };
	process.global.getConfig=typeof(getConfig)!='undefined' ? getConfig : (moduleName => ({[moduleName]:`no configuration data for ${moduleName}`}[moduleName]));
	process.global.commandLineParameters=typeof(commandLineParameters)!='undefined'?commandLineParameters:undefined;;
	process.global.projectRoot=projectRoot;
	process.global.rawConfig={}; //this should only be used for debugging, use getConfig(moduleName)
	}
console.log(
	`running as standalone, WARNING: overwrites xLog() if this branch runs in a sustem`,
);
module.exports = moduleFunction({ moduleName })({}); //runs it right now
//module.exports = moduleFunction({config, commandLineParameters, moduleName})();


