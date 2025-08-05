#!/usr/bin/env node
'use strict';

// Suppress punycode deprecation warning
process.noDeprecation = true;

/**
 * Copyright 2023 Access for Learning
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Authors: TQ White II (Justkidding, Inc.) and John Lovell (Access for Learning, LLC)
 */
// =============================================================================
// SYSTEM IMPORTS

// Import necessary modules
const path = require('path');
const os = require('os');
const fs = require('fs');

const configFileProcessor = require('qtools-config-file-processor');

// --------------------------------------------------------------------------------
// FIND PROJECT ROOT
const findProjectRoot = ({ rootFolderName = 'system', closest = true } = {}) =>
	__dirname.replace(
		new RegExp(`^(.*${closest ? '' : '?'}\/${rootFolderName}).*$`),
		'$1',
	);
const applicationBasePath = findProjectRoot(); // call with {closest:false} if there are nested rootFolderName directories and you want the top level one

// =============================================================================
// MODULE NAME DETERMINATION

// Derive the module name from the current filename (without extension)
const moduleName = path.basename(__filename, '.js');

// =============================================================================
// MODULE IMPORTS
const helpText=require('./lib/help-text');

// process.global.configPath=process.env.udgConfigPath; // unused, jina finds the config on its own, see node_modules/qtools-ai-thought-processor/...figure-out-config-path.js
const initAtp = require('../../../lib/qtools-ai-framework/jina')({
	configFileBaseName: moduleName,
	applicationBasePath,
	helpText,
	applicationControls: [
		'--thoughtProcess',
		'--promptVersion',
		'-showElements',
		'-allElements',
		'--elements',
		'--elementCounts',
		'-showProgressMessages',
		'--userConfigPath'
	],
}); // SIDE EFFECTS: Initializes xLog, including setProcessFilesDirectory(), and getConfig in process.global
// =============================================================================
// MAIN EXECUTION FUNCTION

(async () => {
	// =============================================================================
	// INITIALIZATION

	
	// Access global variables set up by 'initAtp' and userConfigs
	const { xLog, getConfig, commandLineParameters } = process.global;
	
	const userConfigPath=commandLineParameters.qtGetSurePath('values.userConfigPath[0]');

	process.global.userConfigs={};
	if (userConfigPath){
			process.global.userConfigs = configFileProcessor.getConfig(
				fs.realpathSync(userConfigPath)
			);
			xLog.status(`User config found: ${userConfigPath}`);
			xLog.status(`                   ${process.global.userConfigs.qtGetSurePath('annotation.description', 'No annotation found for userConfig')}`);
	}

	// Normalize input: convert fileList to --elements for backward compatibility
	const fileList = commandLineParameters.qtGetSurePath('fileList', []);
	const elementsFlag = commandLineParameters.values.elements;

	if (fileList.length > 0 && !elementsFlag) {
		commandLineParameters.values.elements = fileList;
		commandLineParameters.fileList = [];

	}

	// Get configuration specific to this module
	let { objectResultOutputDirPath, showProgressMessages } =
		getConfig(moduleName);

	xLog.setProgressMessageStatus(showProgressMessages);

	// Retrieve the output file path from command-line parameters
	let thoughtProcessName = commandLineParameters.qtGetSurePath(
		'values.thoughtProcess[0]',
	);

	// Get configuration specific to qTools-AI
	let { thoughtProcessConversationList, thinkerParameters, resultFileType } =
		getConfig(thoughtProcessName);

	// If no thoughtProcessName, show error and exit
	if (!thoughtProcessConversationList) {
		xLog.error(
			`ERROR: Thought process '${thoughtProcessName}' is not in the configuration file`,
		);
		process.exit(1);
	}

	xLog.status(`Using thought process: ${thoughtProcessName}`);

	// =============================================================================
	// VALIDATE SPEC EXISTANCE

	require('./lib/validate-input-element')({ thoughtProcessName });
	require('./lib/validate-element-count-parameters')({ thoughtProcessName });

	// =============================================================================
	// COMMAND-LINE PARAMETERS PROCESSING

	// Retrieve the output file path from command-line parameters
	const cliFileOverride = commandLineParameters.qtGetSurePath(
		'values.cliFileOverride[0]',
		'',
	);

	// If an output file is specified, adjust objectResultOutputDirPath accordingly
	if (cliFileOverride) {
		objectResultOutputDirPath = path.dirname(cliFileOverride);
		fs.mkdirSync(objectResultOutputDirPath, { recursive: true });
	}

	// =============================================================================
	// OUTPUT FILE DETERMINATION

	// Determine the output file path
	const outputFilePath = cliFileOverride;

	// Ensure the output directory exists
	const outputDir = path.dirname(outputFilePath);
	fs.mkdirSync(outputDir, { recursive: true });

	// Convert targetObjectNameList to a string for use in file names

	const processDetailLogDirName = require('./lib/calculate-detail-log-name')({
		thoughtProcessName,
	});

	// =============================================================================
	// JINA INTERACTION

	// Initialize Jina and set up facilitators
	const { findTheAnswer, makeFacilitators } = initAtp({
		configName: moduleName,
	});
	const facilitators = makeFacilitators({
		thoughtProcessConversationList,
		thinkerParameters,
		thoughtProcessName,
	});

	// Interact with Jina to get wisdom
	const wisdom = await findTheAnswer({
		facilitators,
		debugLogName: processDetailLogDirName,
	});
	//   .catch(err=>{
	//   	if (err){
	//   		xLog.error(`Error: ${err.toString()}. Exit. No Output.`);
	//   		process.exit(1);
	//   	}
	//   });

	xLog.debug(
		{ ['wisdom']: wisdom },
		{ showHidden: false, depth: null, colors: true },
	);

	// Get the latest refined data (always multi-element format)
	const finalSynthData = wisdom.processedElements;

	// wisdom.elementErrors

	// =============================================================================
	// OUTPUT HANDLING

	// Optionally echo the refined XML to the console
	if (commandLineParameters.switches.echoAlso) {
		xLog.status(
			`===============================================================/n${Object.keys(finalSynthData).length ? Object.keys(finalSynthData) : 'No objects created'}\n`,
		);
		xLog.result(
			{ ['finalSynthData']: finalSynthData },
			{ showHidden: false, depth: 4, colors: true },
		);
		xLog.status(
			'\n===============================================================\n',
		);
	}
	// Save the process file (for logging or debugging)
	xLog.saveProcessFile(
		`${moduleName}_${path.basename(outputFilePath)}`,
		JSON.stringify(finalSynthData),
	);
	
	// Set up batch-specific debug log directory
	let batchSpecificDebugResultDirPath = path.join(
		objectResultOutputDirPath,
		`${thoughtProcessName}_${Math.floor(Date.now() / 1000)
			.toString()
			.slice(-4)}`,
	);
	
	if(userConfigPath){
		batchSpecificDebugResultDirPath=path.join(objectResultOutputDirPath,
		`${path.basename(userConfigPath).replace(/\.ini/, '')}_${Math.floor(Date.now() / 1000)
			.toString()
			.slice(-4)}`, 
			)
	}


	fs.mkdirSync(batchSpecificDebugResultDirPath, { recursive: true });

	const fileExtension = resultFileType ? resultFileType : synthData;

	Object.keys(finalSynthData).forEach((name) => {
		const outputFilePath = path.join(
			batchSpecificDebugResultDirPath,
			`${name}.${fileExtension}`,
		);

		fs.writeFileSync(outputFilePath, finalSynthData[name], 'utf-8');
	});
	xLog.status(
		`\nWrote files for: ${Object.keys(finalSynthData).length ? Object.keys(finalSynthData) : 'No objects created'}`,
	);

	// Log the output file path
	xLog.status(`Detail logs path: ${xLog.getProcessFilesDirectory()}`); // setProcessFilesDirectory() is run by initAtp
	xLog.status(`Output file path: ${batchSpecificDebugResultDirPath}`);
})(); // End of main execution function
