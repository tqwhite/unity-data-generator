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

// Import core modules
const path = require('path');
const fs = require('fs');

// Import lib modules
const configHelper = require('./lib/utils/configHelper');
const cliHandler = require('./lib/utils/cliHandler');
const spreadsheetReader = require('./lib/spreadsheet/excelReader');
const spreadsheetWriter = require('./lib/spreadsheet/excelWriter');
const dbManager = require('./lib/database/dbManager');

// =============================================================================
// HELPER FUNCTIONS

/**
 * Generate a camelCase table name from a filename
 * @param {string} filename - The input filename
 * @returns {string} CamelCase table name with illegal characters removed
 */
function generateTableNameFromFilename(filename) {
  if (!filename) return 'defaultTable';
  
  // Get basename without extension
  const baseName = path.basename(filename, path.extname(filename));
  
  // Split on common separators and non-word characters
  const words = baseName
    .split(/[^a-zA-Z0-9]+/)
    .filter(word => word.length > 0)
    .map(word => word.toLowerCase());
  
  // Convert to camelCase: first word lowercase, subsequent words capitalized
  const camelCase = words
    .map((word, index) => {
      if (index === 0) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join('');
  
  // Ensure it starts with a letter (prepend 'table' if it doesn't)
  if (!/^[a-zA-Z]/.test(camelCase)) {
    return 'table' + camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
  }
  
  return camelCase || 'defaultTable';
}

// =============================================================================
// MAIN EXECUTION FUNCTION

(async () => {
  try {
    // Initialize configuration and CLI parameters
    const { config, cliParams } = await configHelper.initialize();
    
    // Process command-line arguments and determine operating mode
    const operationMode = cliHandler.determineOperationMode(cliParams);
    
    // Handle different operation modes
    switch (operationMode) {
      case 'HELP':
        cliHandler.showHelp();
        break;
        
      case 'LIST_SHEETS':
        // When using -list, check actual structure of fileList
        const listFileList = cliParams.fileList || [];
        // The first item in fileList is the spreadsheet file
        if (!listFileList.length) {
          throw new Error('Spreadsheet file path is required when using -list option');
        }
        
        // Use the first file path in the list
        const listSpreadsheetFile = listFileList[0];
        config.xLog.status(`Listing sheets for file: ${listSpreadsheetFile}`);
        
        // Check file existence
        if (!fs.existsSync(listSpreadsheetFile)) {
          throw new Error(`Spreadsheet file not found: ${listSpreadsheetFile}`);
        }
        
        await spreadsheetReader.listSheets(listSpreadsheetFile);
        break;
        
      case 'PURGE_BACKUPS':
        await dbManager.purgeBackups(config.databaseFilePath, config.retainOnDbBackupPurge);
        break;
        
      case 'LOAD_DATABASE':
        // When using -loadDatabase, check actual structure of fileList
        const fileList = cliParams.fileList || [];
        // The first item in fileList is the spreadsheet file
        if (!fileList.length) {
          throw new Error('Input spreadsheet file is required when using -loadDatabase');
        }
        
        // Use the first file path in the list
        const loadSpreadsheetFile = fileList[0];
        config.xLog.status(`Using spreadsheet file: ${loadSpreadsheetFile}`);
        
        // Check file existence
        if (!fs.existsSync(loadSpreadsheetFile)) {
          throw new Error(`Spreadsheet file not found: ${loadSpreadsheetFile}`);
        }
        
        // Read spreadsheet data
        const spreadsheetData = await spreadsheetReader.readSpreadsheet(loadSpreadsheetFile);
        
        // Get table name from command line or generate from filename
        const tableName = cliParams.values.tableName ? 
          cliParams.values.tableName[0] : 
          generateTableNameFromFilename(loadSpreadsheetFile);
        config.xLog.status(`Using table name: ${tableName}`);
        
        // Save to database
        await dbManager.saveData(config.databaseFilePath, spreadsheetData, tableName);
        
        // Generate output files from database
        await generateOutputFiles(config, cliParams);
        break;
        
      case 'GENERATE_FILES':
        // Simply generate output files from existing database
        await generateOutputFiles(config, cliParams);
        break;
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
})();

// Helper function to generate output files from database
async function generateOutputFiles(config, cliParams) {
  // Get table name from command line or generate from filename
  const fileList = cliParams.fileList || [];
  const spreadsheetFile = fileList.length > 0 ? fileList[0] : null;
  const tableName = cliParams.values.tableName ? 
    cliParams.values.tableName[0] : 
    generateTableNameFromFilename(spreadsheetFile);
  
  // Read data from database
  const dbData = await dbManager.readData(config.databaseFilePath, tableName);
  
  // Get output paths from command line
  const outputPathArg = fileList.length > 1 ? fileList[1] : null;
  
  // Determine base filename and output directory
  let baseFileName;
  let outputDir;
  
  if (outputPathArg) {
    outputDir = outputPathArg;
    if (spreadsheetFile) {
      baseFileName = path.basename(spreadsheetFile, path.extname(spreadsheetFile));
    } else {
      baseFileName = 'database_export';
    }
  } else if (spreadsheetFile) {
    outputDir = config.outputsPath;
    baseFileName = path.basename(spreadsheetFile, path.extname(spreadsheetFile));
  } else {
    outputDir = config.outputsPath;
    baseFileName = 'database_export';
  }
  
  // Ensure output directory exists
  fs.mkdirSync(outputDir, { recursive: true });
  
  // Generate output file paths
  const jsonPath = path.join(outputDir, `${baseFileName}.json`);
  const excelPath = path.join(outputDir, `${baseFileName}_generated.xlsx`);
  
  config.xLog.status(`Using output paths: JSON=${jsonPath}, Excel=${excelPath}`);
  
  // Write files
  await spreadsheetWriter.writeJsonFile(jsonPath, dbData);
  await spreadsheetWriter.writeExcelFile(excelPath, dbData);
}