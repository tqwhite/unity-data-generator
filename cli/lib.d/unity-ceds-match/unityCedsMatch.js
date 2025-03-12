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
const initAtp = require('qtools-ai-thought-processor/jina')({
	configFileBaseName: moduleName,
	applicationBasePath,
		applicationControls: ['-loadDatabase'],

}); // SIDE EFFECTS: Initializes xLog and getConfig in process.global

// =============================================================================
// MAIN EXECUTION FUNCTION

(async () => {
	// =============================================================================
	// INITIALIZATION

	// Access global variables set up by 'initAtp'
	const { xLog, getConfig, commandLineParameters } = process.global;

	// Get configuration specific to this module
	let { outputsPath, databaseFilePath } = getConfig(moduleName);

	// Get configuration specific to qTools-AI
	let { thoughtProcessConversationList } = getConfig(
		'App_Specific_Thought_Process',
	);

	// =============================================================================
	// COMMAND-LINE PARAMETERS PROCESSING

	// Check for help flag
	if (commandLineParameters.switches.help) {
		const helpText = require('./xmlThinkers/think-about-matching-with-ceds/help-text')(moduleName);
		xLog.result(helpText);
		process.exit(0);
	}

	// Check if database loading is requested
	const loadDatabase = commandLineParameters.switches.loadDatabase;

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

	// If no target objects and no 'listElements' switch, show error and exit
	if (
		!targetObjectNameList.length &&
		!commandLineParameters.switches.listElements
	) {
		xLog.error('Target element name is required. Try -help or -listElements');
		process.exit(1);
	}
	
	// Import the database saver if loading to database is requested
	let dbSaver;
	if (loadDatabase) {
		dbSaver = require('./lib/database/dbSaver');
		xLog.status(`Database integration enabled, will save to ${databaseFilePath}`);
	}

	const retrieveSpreadsheet =
		require('./lib/get-spreadsheet-data')();

	const demoFuncAsync = (args) => {
		return new Promise((resolve, reject) => {
			retrieveSpreadsheet.executeRequest(args, (err, result) => {
				if (err) {
					reject(err);
				} else {
					resolve(result);
				}
			});
		});
	};

	// =============================================================================
	// OUTPUT FILE DETERMINATION

	// Convert targetObjectNameList to a string for use in file names
	const targetObjectNamesString = Array.isArray(targetObjectNameList)
		? targetObjectNameList.join('_')
		: targetObjectNameList;

	// Determine the output file path
	const outputFilePath =
		outFile || path.join(outputsPath, `${targetObjectNamesString}.json`);

	// Ensure the output directory exists
	const outputDir = path.dirname(outputFilePath);
	fs.mkdirSync(outputDir, { recursive: true });

	// =============================================================================
	// JINA INTERACTION

	// Initialize Jina and set up facilitators
	const { findTheAnswer, makeFacilitators } = initAtp({
		configName: moduleName,
	});
	const facilitators = makeFacilitators({ thoughtProcessConversationList });

	const { wisdom: spreadsheetData } = await demoFuncAsync({});
	const { elementSpecWorksheetJson: spreadSheetJson } = spreadsheetData;
	const sifObjectDefinition = JSON.parse(spreadSheetJson);
	const cedsRecommendationList = [];

	for (const sifElement of sifObjectDefinition) {
		if (!sifElement.Description || sifElement.Name.match(/@/) || sifElement.Type.match(/Type$/)) {
			continue; // Skip objects matching the conditions
		}

	//	sifElement.origCedsId = sifElement['CEDS ID'];

		if (sifElement['CEDS ID']) {
			xLog.status(
				`Moving CEDS ID to origCedsId sifElement.Name=${sifElement.Name} ${sifElement['CEDS ID']}`,
			);
			sifElement.origCedsId = sifElement['CEDS ID'];
			delete sifElement['CEDS ID'];
		} else {
			xLog.status(
				`No CEDS ID sifElement.Name=${sifElement.Name} ${sifElement['CEDS ID']}`,
			);
		}

		try {
			const wisdom = await findTheAnswer({
				facilitators,
				initialThinkerData: sifElement,
				debugLogName: targetObjectNamesString,
			});
			cedsRecommendationList.push(wisdom.cedsRecommentation);
		} catch (err) {
			xLog.error(`Error: ${err.toString()}. Exit. No Output.`);
			process.exit(1);
		}
	}

	// Get the latest refined XML
	const cedsRecommendationListJson = JSON.stringify(
		cedsRecommendationList,
		'',
		'\t',
	);

	// =============================================================================
	// OUTPUT HANDLING

	// Optionally echo the refined XML to the console
	if (commandLineParameters.switches.echoAlso) {
		xLog.result(`\n\n${cedsRecommendationListJson}\n\n`);
	}

	// Save the process file (for logging or debugging)
	xLog.saveProcessFile(
		`${moduleName}_${path.basename(outputFilePath)}`,
		cedsRecommendationListJson,
	);

	// Write the refined XML to the output file
	fs.writeFileSync(outputFilePath, cedsRecommendationListJson, 'utf-8');

	// Log the output file path
	xLog.status(`Process file directory: ${xLog.getProcessFilesDirectory()}`);
	xLog.status(`Output file path: ${outputFilePath}`);
	
	// =============================================================================
	// DATABASE SAVING
	
	// Save to database if the -loadDatabase flag is used
	if (loadDatabase && cedsRecommendationList.length > 0) {
		try {
			xLog.status('Saving CEDS match results to database...');
			const stats = await dbSaver.saveCedsMatches(databaseFilePath, cedsRecommendationList);
			xLog.status(`Database save complete: ${stats.inserted} inserted, ${stats.updated} updated, ${stats.skipped} skipped (out of ${stats.total} total)`);
		} catch (err) {
			xLog.error(`Database save error: ${err.message}`);
		}
	}
})(); // End of main execution function
