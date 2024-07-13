#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot
const path = require('path');

//START OF moduleFunction() ============================================================

const moduleFunction =
	({ config, commandLineParameters, moduleName } = {}) =>
	(args = {}) => {
	
		const promptObjects = require('qtools-library-dot-d')({
			libraryName: 'promptObjects',
		});
		promptObjects.setLibraryPath(path.join(__dirname, 'prompts.d'));

		const passThroughParameters = {};
		promptObjects.loadModules({ passThroughParameters });
		promptObjects.seal(); //make the library immutable
		

		let prompts = {};

		Object.keys(promptObjects)
			.filter((name) => name.match(/prompts/))
			.forEach((name) => {
				prompts = Object.assign(prompts, promptObjects[name]());
			});

		return prompts;
	};

//END OF moduleFunction() ============================================================


module.exports = moduleFunction({ moduleName });
