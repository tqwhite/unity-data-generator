#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot
const path = require('path');

//START OF moduleFunction() ============================================================

const moduleFunction =
	({ config, commandLineParameters, moduleName } = {}) =>
	(args = {}) => {
		const { xLog, commandLineParameters, getConfig } = process.global;
		const unityConfig = getConfig('unityDataGenerator');

		const promptApplicationName = commandLineParameters.qtGetSurePath?.(
			'values.promptLibrary[0]',
			unityConfig.defaultPromptLibrary,
		);

		const promptObjects = require('qtools-library-dot-d')({
			libraryName: 'promptObjects',
		});
		
		xLog.status(`Running prompt application: ${promptApplicationName}`);


		const passThroughParameters = { promptApplicationName };
		
		// Load only the selected library
		const promptLibrary = require(`./prompts.d/${promptApplicationName}`)({passThroughParameters})();;

		return promptLibrary;
	};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction({ moduleName });
