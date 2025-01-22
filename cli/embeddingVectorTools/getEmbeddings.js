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
// SYSTEM IMPORTS

// Import necessary modules
const path = require('path');
const os = require('os');
const fs = require('fs');

// --------------------------------------------------------------------------------
// FIND PROJECT ROOT
const findProjectRoot=({rootFolderName='system', closest=true}={})=>__dirname.replace(new RegExp(`^(.*${closest?'':'?'}\/${rootFolderName}).*$`), "$1");
const applicationBasePath=findProjectRoot(); // call with {closest:false} if there are nested rootFolderName directories and you want the top level one

// =============================================================================
// MODULE NAME DETERMINATION

// Derive the module name from the current filename (without extension)
const moduleName = path.basename(__filename, '.js');

// =============================================================================
// MODULE IMPORTS

// process.global.configPath=process.env.udgConfigPath; // unused, jina finds the config on its own, see node_modules/qtools-ai-thought-processor/...figure-out-config-path.js
const initAtp = require('qtools-ai-thought-processor/jina')({
	configFileBaseName: moduleName,
	applicationBasePath
}); // NOT USED except for config, command line and xLog into process.global


// =============================================================================
// MAIN EXECUTION FUNCTION

(async () => {

  // =============================================================================
  // INITIALIZATION

  // Access global variables set up by 'initAtp'
  const { xLog, getConfig, commandLineParameters } = process.global;

  // =============================================================================
  // COMMAND-LINE PARAMETERS PROCESSING



  // =============================================================================
  // OUTPUT FILE DETERMINATION



  // =============================================================================
  // JINA INTERACTION


console.log(`\n=-=============   moduleName  ========================= [getEmbeddings.js.]\n`);



})(); // End of main execution function