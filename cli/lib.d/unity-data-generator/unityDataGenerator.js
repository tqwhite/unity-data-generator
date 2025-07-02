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

// process.global.configPath=process.env.udgConfigPath; // unused, jina finds the config on its own, see node_modules/qtools-ai-thought-processor/...figure-out-config-path.js
const initAtp = require('../../../lib/qtools-ai-framework/jina')({
	configFileBaseName: moduleName,
	applicationBasePath,
	applicationControls: [
		'--thoughtProcess',
		'--promptVersion',
		'-showElements',
		'-allElements',
		'--elements',
		'--elementCounts',
	],
}); // SIDE EFFECTS: Initializes xLog and getConfig in process.global
// =============================================================================
// MAIN EXECUTION FUNCTION

(async () => {
	// =============================================================================
	// INITIALIZATION

	// Access global variables set up by 'initAtp'
	const { xLog, getConfig, commandLineParameters } = process.global;

	// Normalize input: convert fileList to --elements for backward compatibility
	const fileList = commandLineParameters.qtGetSurePath('fileList', []);
	const elementsFlag = commandLineParameters.values.elements;

	if (fileList.length > 0 && !elementsFlag) {
		commandLineParameters.values.elements = fileList;
		commandLineParameters.fileList = [];
		xLog.status(
			`Converted positional arguments to --elements: ${fileList.join(',')}`,
		);
	}

	// Get configuration specific to this module
	let { outputsPath } = getConfig(moduleName);

	// Retrieve the output file path from command-line parameters
	let thoughtProcessName = commandLineParameters.qtGetSurePath(
		'values.thoughtProcess[0]',
		'UDG_Thought_Process',
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
	// COMMAND-LINE PARAMETERS PROCESSING

	// Retrieve the output file path from command-line parameters
	const outFile = commandLineParameters.qtGetSurePath('values.outFile[0]', '');

	// If an output file is specified, adjust outputsPath accordingly
	if (outFile) {
		outputsPath = path.dirname(outFile);
		fs.mkdirSync(outputsPath, { recursive: true });
	}

	// Get the list of target object names from command-line parameters
	let targetObjectNameList = commandLineParameters.qtGetSurePath(
		'values.elements',
		[],
	);

	// If no target objects are specified, use 'fileList' from command-line parameters
	if (!targetObjectNameList.length) {
		targetObjectNameList = commandLineParameters.qtGetSurePath('fileList', []);
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

	// =============================================================================
	// VALIDATE ELEMENTCOUNTS PARAMETER
	
	// Validate elementCounts against available spreadsheet elements (if specified)
	if (commandLineParameters.values.elementCounts) {
		try {
			// Get the same spreadsheet path that get-all-elements uses
			const { thinkerParameters } = getConfig(thoughtProcessName);
			const elementSpecWorksheetPath = 
				thinkerParameters.qtGetSurePath('get-specification-data.spreadsheetPath') ||
				thinkerParameters.qtGetSurePath('elementSpecWorksheetPath') ||
				thinkerParameters.qtGetSurePath('spreadsheetPath');
			
			if (!elementSpecWorksheetPath) {
				xLog.error('ERROR: Cannot validate elementCounts - spreadsheet path not found in configuration');
				process.exit(1);
			}
			
			// Read spreadsheet to get available elements
			const xlsx = require('xlsx');
			const workbook = xlsx.readFile(elementSpecWorksheetPath);
			const availableElements = workbook.SheetNames;
			
			// Parse and validate elementCounts
			const elementCounts = commandLineParameters.values.elementCounts;
			const invalidElements = [];
			
			elementCounts.forEach(countSpec => {
				const [elementName, count] = countSpec.split(':');
				if (!availableElements.includes(elementName)) {
					invalidElements.push(elementName);
				}
			});
			
			// Show error and exit if any invalid elements found
			if (invalidElements.length > 0) {
				const errorMessage = invalidElements.length === 1
					? `Element '${invalidElements[0]}' specified in --elementCounts does not exist in spreadsheet.`
					: `Elements ${invalidElements.map(name => `'${name}'`).join(', ')} specified in --elementCounts do not exist in spreadsheet.`;
				xLog.error(`ERROR: ${errorMessage} Available elements: ${availableElements.join(', ')}`);
				process.exit(1);
			}
			
			xLog.status(`Validated elementCounts: all specified elements exist in spreadsheet`);
			
		} catch (error) {
			xLog.error(`ERROR: Failed to validate elementCounts: ${error.message}`);
			process.exit(1);
		}
	}

	// =============================================================================
	// OUTPUT FILE DETERMINATION

	// Convert targetObjectNameList to a string for use in file names
	let targetObjectNamesString;
	if (commandLineParameters.switches.allElements) {
		targetObjectNamesString = 'allElements';
	} else if (
		commandLineParameters.switches.showElements &&
		!targetObjectNameList.length
	) {
		targetObjectNamesString = 'showElements'; // Dummy name for showElements
	} else {
		targetObjectNamesString = Array.isArray(targetObjectNameList)
			? targetObjectNameList.join('_')
			: targetObjectNameList;
	}

	// Determine the output file path
	const outputFilePath =
		outFile || path.join(outputsPath, `${targetObjectNamesString}.synthData`);

	// Ensure the output directory exists
	const outputDir = path.dirname(outputFilePath);
	fs.mkdirSync(outputDir, { recursive: true });

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
		targetObjectNameList,
		debugLogName: targetObjectNamesString,
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
			xLog.result({['finalSynthData']:finalSynthData}, { showHidden: false, depth: 4, colors: true });
	}
	// Save the process file (for logging or debugging)
	xLog.saveProcessFile(
		`${moduleName}_${path.basename(outputFilePath)}`,
		JSON.stringify(finalSynthData),
	);

	// Set up batch-specific debug log directory
	const batchSpecificDebugResultDirPath = path.join(
		outputsPath,
		`${thoughtProcessName}_${Math.floor(Date.now() / 1000)
			.toString()
			.slice(-4)}`,
	);

	fs.mkdirSync(batchSpecificDebugResultDirPath, { recursive: true });
	

	const fileExtension = resultFileType ? resultFileType : synthData;

	Object.keys(finalSynthData).forEach((name) => {
		const outputFilePath = path.join(
			batchSpecificDebugResultDirPath,
			`${name}.${fileExtension}`,
		);
		fs.writeFileSync(outputFilePath, finalSynthData[name], 'utf-8');
	});
	xLog.status(`\nWrote files for: ${Object.keys(finalSynthData).length?Object.keys(finalSynthData):'No objects created'}`);

	// Log the output file path
	xLog.status(`Detail logs path: ${xLog.getProcessFilesDirectory()}`);
	xLog.status(`Output file path: ${batchSpecificDebugResultDirPath}`);
})(); // End of main execution function
