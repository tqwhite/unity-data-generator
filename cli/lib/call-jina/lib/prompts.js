#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

console.log(`HELLO FROM ${__dirname}/${moduleName}`);

// npm i qtools-functional-library
// npm i qtools-config-file-processor
// npm i qtools-parse-command-line
// npm i qtools-asynchronous-pipe-plus # often want this for later

// const qt = require('qtools-functional-library'); //qt.help({printOutput:true, queryString:'.*', sendJson:false});
// 
// const commandLineParser = require('qtools-parse-command-line');
// const configFileProcessor = require('qtools-config-file-processor');
// 
// //get config file data
// const path=require('path');
// const fs=require('fs');
// const os=require('os');
// const projectRoot=fs.realpathSync(path.join(__dirname, '..', '..')); // adjust the number of '..' to fit reality
// const configName= os.hostname() == 'qMax.local' ? 'qbook' : '${configDirName}' ;
// 
// const configDirPath = `${projectRoot}/configs/instanceSpecific/${configName}/`;
// const config = configFileProcessor.getConfig('systemParameters.ini', configDirPath)
// 
// const commandLineParameters = commandLineParser.getParameters();
// 
// 
// 
// console.dir({['config']:config}, { showHidden: false, depth: 4, colors: true });
// console.dir({['commandLineParameters']:commandLineParameters}, { showHidden: false, depth: 4, colors: true });

//START OF moduleFunction() ============================================================

const moduleFunction = ({config, commandLineParameters, moduleName}={})=>(args={})=>{
// 	process.global = {};
// 	process.global.xLog = xLog;
// 	const { getConfig } = args;
// 	const localConfig = {}; //getConfig(`${moduleName}`);
//  const localConfig=config[moduleName];

	const workingFunctionActual = instanceArgs => operatingArgs => {
		return 'hello';
	};

	const workingFunction = workingFunctionActual({ ...localConfig, ...args });

	return { workingFunction };
};

//END OF moduleFunction() ============================================================



module.exports = moduleFunction({moduleName});

//module.exports = moduleFunction({config, commandLineParameters, moduleName});

//module.exports = moduleFunction({moduleName})();

//module.exports = moduleFunction({config, commandLineParameters, moduleName})();
