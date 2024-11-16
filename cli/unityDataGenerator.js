#!/usr/bin/env node
'use strict';

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
// MODULE IMPORTS

// Import necessary modules
const path = require('path');
const os = require('os');
const fs = require('fs');

// process.global.configPath=process.env.udgConfigPath; // unused, jina finds the config on its own, see node_modules/qtools-ai-thought-processor/...figure-out-config-path.js
const initJina = require('qtools-ai-thought-processor/jina'); // SIDE EFFECTS: Initializes xLog and getConfig in process.global

// =============================================================================
// MODULE NAME DETERMINATION

// Derive the module name from the current filename (without extension)
const moduleName = path.basename(__filename, '.js');

// =============================================================================
// MAIN EXECUTION FUNCTION

(async () => {

  // =============================================================================
  // INITIALIZATION

  // Access global variables set up by 'initJina'
  const { xLog, getConfig, commandLineParameters } = process.global;

  // Get configuration specific to this module
  let { thoughtProcessSpecificationList, outputsPath } = getConfig(moduleName);

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
  let targetObjectNameList = commandLineParameters.qtGetSurePath('values.elements', []);

  // If no target objects are specified, use 'fileList' from command-line parameters
  if (!targetObjectNameList.length) {
    targetObjectNameList = commandLineParameters.qtGetSurePath('fileList', []);
  }

  // If no target objects and no 'listElements' switch, show error and exit
  if (!targetObjectNameList.length && !commandLineParameters.switches.listElements) {
    xLog.error('Target element name is required. Try -help or -listElements');
    process.exit(1);
  }

  // =============================================================================
  // OUTPUT FILE DETERMINATION

  // Convert targetObjectNameList to a string for use in file names
  const targetObjectNamesString = Array.isArray(targetObjectNameList)
    ? targetObjectNameList.join('_')
    : targetObjectNameList;

  // Determine the output file path
  const outputFilePath = outFile || path.join(outputsPath, `${targetObjectNamesString}.xml`);

  // Ensure the output directory exists
  const outputDir = path.dirname(outputFilePath);
  fs.mkdirSync(outputDir, { recursive: true });

  // =============================================================================
  // JINA INTERACTION

  // Initialize Jina and set up facilitators
  const { askJina, makeFacilitators } = initJina();
  const facilitators = makeFacilitators({ thoughtProcessSpecificationList });

  // Interact with Jina to get wisdom
  const wisdom = await askJina({
    facilitators,
    targetObjectNameList,
    debugLogName: targetObjectNamesString,
  })
  .catch(err=>{
  	if (err){
  		xLog.error(`Error: ${err.toString()}. Exit. No Output.`);
  		process.exit(1);
  	}
  });

  // Get the latest refined XML
  const refinedXml = wisdom.latestXml;

  // =============================================================================
  // OUTPUT HANDLING

  // Optionally echo the refined XML to the console
  if (commandLineParameters.switches.echoAlso) {
    xLog.result(`\n\n${refinedXml}\n\n`);
  }

  // Save the process file (for logging or debugging)
  xLog.saveProcessFile(`${moduleName}_${path.basename(outputFilePath)}`, refinedXml);

  // Write the refined XML to the output file
  fs.writeFileSync(outputFilePath, refinedXml, 'utf-8');

  // Log the output file path
  xLog.status(`Output file path: ${outputFilePath}`);

})(); // End of main execution function