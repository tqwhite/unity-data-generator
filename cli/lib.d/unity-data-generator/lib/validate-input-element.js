#!/usr/bin/env node
'use strict';
// Suppress punycode deprecation warning
process.noDeprecation = true;

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

// const qt = require('qtools-functional-library'); //also exposes qtLog(); qt.help({printOutput:true, queryString:'.*', sendJson:false});

const os = require('os');
const path = require('path');
const fs = require('fs');


//START OF moduleFunction() ============================================================
const moduleFunction =
	({ moduleName } = {}) =>
	({ thoughtProcessName }) => {
		const { xLog, getConfig, rawConfig, commandLineParameters } =
			process.global;
		const localConfig = getConfig(moduleName); //moduleName is closure

		// Get the list of target object names from command-line parameters
		let targetObjectNameList = commandLineParameters.qtGetSurePath(
			'values.elements',
			[],
		);

		// If no target objects are specified, use 'fileList' from command-line parameters
		if (!targetObjectNameList.length) {
			targetObjectNameList = commandLineParameters.qtGetSurePath(
				'fileList',
				[],
			);
		}

		// If no target objects and no 'listElements' or 'allElements' or 'showElements' switch, and no elementCounts, show error and exit
		if (
			!targetObjectNameList.length &&
			!commandLineParameters.switches.listElements &&
			!commandLineParameters.switches.allElements &&
			!commandLineParameters.switches.showElements &&
			!commandLineParameters.values.elementCounts
		) {
			xLog.error('Target element name is required. Try -help or -listElements');
			process.exit(1);
		}
	};

//END OF moduleFunction() ============================================================


module.exports = moduleFunction({ moduleName }); //returns initialized moduleFunction
