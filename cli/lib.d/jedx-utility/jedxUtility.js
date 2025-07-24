#!/usr/bin/env node
'use strict';
// Suppress punycode deprecation warning
process.noDeprecation = true;

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

const qt = require('qtools-functional-library'); //also exposes qtLog(); qt.help({printOutput:true, queryString:'.*', sendJson:false});

const os = require('os');
const path = require('path');
const fs = require('fs');


// =====================================================================
// FUNCTION MODULES
// =====================================================================

const duplicateWorkerSets = require('./lib/duplicateWorkerSets');

//START OF moduleFunction() ============================================================
const moduleFunction =
	({ moduleName } = {}) =>
	({ unused } = {}) => {
		const { xLog, getConfig, rawConfig, commandLineParameters, projectRoot } =
			process.global;
		const localConfig = getConfig(moduleName); //moduleName is closure

		// ---------------------------------------------------------------------
		// Route to appropriate function based on command line switches
		
		if (commandLineParameters.switches.duplicateWorkerSets) {
			const count = commandLineParameters.qtGetSurePath('values.count.0', 10);
			const addToDupeSet = commandLineParameters.switches.addToDupeSet || false;
			
			const duplicateWorkerSetsModule = duplicateWorkerSets({ moduleName: 'duplicateWorkerSets' });
			return duplicateWorkerSetsModule.execute({ count, addToDupeSet });
		}


	};

//END OF moduleFunction() ============================================================

const findProjectRoot=({rootFolderName='system', closest=true}={})=>__dirname.replace(new RegExp(`^(.*${closest?'':'?'}\/${rootFolderName}).*$`), "$1");
const projectRoot=findProjectRoot(); // call with {closest:false} if there are nested rootFolderName directories and you want the top level one

const configFileProcessor = require('qtools-config-file-processor');
const configName= os.hostname() == 'qMini.local' ? 'instanceSpecific/qbook' : '' ; //when deployed, usually the config is in the configs/ dir
const configDirPath = `${projectRoot}/configs/${configName}/`;
const config = configFileProcessor.getConfig(`${moduleName}.ini`, configDirPath)

const commandLineParser = require('qtools-parse-command-line');
const commandLineParameters = commandLineParser.getParameters({noFunctions: true});
//

// prettier-ignore
{
	process.global = {};
	process.global.xLog = require('qtools-x-log');;
	process.global.getConfig=typeof(getConfig)!='undefined' ? getConfig : (moduleName => ({[moduleName]:`no configuration data for ${moduleName}`}[moduleName]));
	process.global.commandLineParameters=typeof(commandLineParameters)!='undefined'?commandLineParameters:undefined;;
	process.global.projectRoot=projectRoot;
	process.global.rawConfig={}; //this should only be used for debugging, use getConfig(moduleName)
	}

module.exports = moduleFunction({ moduleName })({}); //runs it right now


