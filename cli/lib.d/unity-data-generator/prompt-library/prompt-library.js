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

		promptObjects.setLibraryPath(path.join(__dirname, 'prompts.d'));

		const passThroughParameters = { promptApplicationName };
		promptObjects.loadModules({ passThroughParameters });
		promptObjects.seal(); //make the library immutable

		// Helper function to list available libraries
		const getAvailableLibraries = () => {
			return Object.keys(promptObjects).filter((name) => name.match(/prompts/));
		};

		// Validate library exists
		if (!promptObjects[promptApplicationName]) {
			const available = getAvailableLibraries();
			xLog.error(`Prompt library '${promptApplicationName}' not found.`);
			xLog.error(`Available libraries: ${available.join(', ')}`);
			throw new Error(`Invalid prompt library: ${promptApplicationName}`);
		}

		// Load only the selected library
		const promptLibrary = promptObjects[promptApplicationName]();

		return promptLibrary;
	};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction({ moduleName });
