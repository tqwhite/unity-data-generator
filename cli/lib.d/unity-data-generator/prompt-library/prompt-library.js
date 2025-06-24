#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot
const path = require('path');

//START OF moduleFunction() ============================================================

const moduleFunction =
	({ config, commandLineParameters, moduleName, promptLibraryName } = {}) =>
	(args = {}) => {
		const { xLog } = process.global;
		
		const promptObjects = require('qtools-library-dot-d')({
			libraryName: 'promptObjects',
		});
		promptObjects.setLibraryPath(path.join(__dirname, 'prompts.d'));

		const passThroughParameters = {};
		promptObjects.loadModules({ passThroughParameters });
		promptObjects.seal(); //make the library immutable
		
		// Helper function to list available libraries
		const getAvailableLibraries = () => {
			return Object.keys(promptObjects)
				.filter((name) => name.match(/prompts/));
		};

		// Get library selection from command line, parameter, config, or default
		const { commandLineParameters: clp, getConfig } = process.global;
		const unityConfig = getConfig && getConfig('unityDataGenerator');
		const selectedLibrary = clp?.qtGetSurePath?.('values.promptLibrary[0]') 
			|| promptLibraryName 
			|| unityConfig?.defaultPromptLibrary
			|| 'tq-prompts'; // default fallback

		// Validate library exists
		if (!promptObjects[selectedLibrary]) {
			const available = getAvailableLibraries();
			xLog && xLog.error && xLog.error(`Prompt library '${selectedLibrary}' not found.`);
			xLog && xLog.error && xLog.error(`Available libraries: ${available.join(', ')}`);
			throw new Error(`Invalid prompt library: ${selectedLibrary}`);
		}

		// Log which library is being used
		xLog && xLog.status && xLog.status(`Using prompt library: ${selectedLibrary}`);

		// Load only the selected library
		const promptLibrary = promptObjects[selectedLibrary]();

		return promptLibrary;
	};

//END OF moduleFunction() ============================================================


module.exports = moduleFunction({ moduleName });
