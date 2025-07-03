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
		
	let processDetailLogDirName;
	if (commandLineParameters.switches.allElements) {
		processDetailLogDirName = 'allElements';
	} else if (
		commandLineParameters.switches.showElements &&
		!targetObjectNameList.length
	) {
		processDetailLogDirName = 'showElements'; // Dummy name for showElements
	} else {
		processDetailLogDirName = Array.isArray(targetObjectNameList)
			? targetObjectNameList.join('_')
			: targetObjectNameList;
	}
	
	
	return processDetailLogDirName;
	
	};

//END OF moduleFunction() ============================================================


module.exports = moduleFunction({ moduleName }); //returns initialized moduleFunction
