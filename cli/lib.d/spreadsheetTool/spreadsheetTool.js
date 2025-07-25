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

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

// Import core modules
const path = require('path');
const fs = require('fs');
const os = require('os');

// =====================================================================
// PROJECT ROOT CONFIGURATION
// =====================================================================

// ---------------------------------------------------------------------
// findProjectRoot - locates the project root directory by searching for rootFolderName

const findProjectRoot = ({ rootFolderName = 'system', closest = true } = {}) =>
	__dirname.replace(
		new RegExp(`^(.*${closest ? '' : '?'}\/${rootFolderName}).*$`),
		'$1',
	);
const applicationBasePath = findProjectRoot();

// =====================================================================
// INITIALIZE QTOOLS-AI-FRAMEWORK FIRST
// =====================================================================

// ---------------------------------------------------------------------
// helpText - application-specific help integration

const helpText = require('./lib/help-text');

// CRITICAL: This must happen before requiring any modules that access process.global
const initAtp = require('../../../lib/qtools-ai-framework/jina')({
	configFileBaseName: moduleName,
	applicationBasePath,
	helpText,
	applicationControls: [
		'-loadDatabase',
		'-purgeBackupDbTables', 
		'-list',
		'-analyzeOnly',
		'-saveToDatabase',
		'-skipValidation',
		'-overwriteTable',
		'--tableName',
		'--inputFile',
		'--outputFile',
		'--sheetName',
		'--configPath'
	],
}); // SIDE EFFECTS: Initializes xLog and getConfig in process.global

// =====================================================================
// MODULE IMPORTS (AFTER JINA INITIALIZATION)
// =====================================================================

// Import lib modules
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

// ---------------------------------------------------------------------
// moduleFunction - main application entry point and execution pipeline

const moduleFunction =
	({ moduleName } = {}) =>
	async ({ unused }) => {
		const { xLog, getConfig, rawConfig, commandLineParameters } =
			process.global;
		
		// =====================================================================
		// MAIN APPLICATION EXECUTION PIPELINE
		// =====================================================================
		
		// ---------------------------------------------------------------------
		// 1. Get configuration
		
		const config = getConfig(moduleName);
		if (!config) {
			xLog.error(`No configuration found for ${moduleName}`);
			return {};
		}
		
		// ---------------------------------------------------------------------
		// 2. Process command line parameters and determine operation mode
		
		const operationMode = determineOperationMode(commandLineParameters);
		
		// ---------------------------------------------------------------------
		// 3. Handle different operation modes
		
		switch (operationMode) {
			case 'HELP':
				// Help is handled by framework
				return {};
				
			case 'LIST_SHEETS':
				return await handleListSheets(commandLineParameters, config);
				
			case 'ANALYZE_ONLY':
				return await handleAnalyzeOnly(commandLineParameters, config);
				
			case 'PROCESS_SPREADSHEET':
				return await handleProcessSpreadsheet(commandLineParameters, config);
				
			default:
				xLog.error('No valid operation mode specified. Use --help for usage information.');
				return {};
		}
	};

// ---------------------------------------------------------------------
// Helper functions for operation mode determination and handling

function determineOperationMode(commandLineParameters) {
	if (commandLineParameters.switches.list) {
		return 'LIST_SHEETS';
	}
	if (commandLineParameters.switches.analyzeOnly) {
		return 'ANALYZE_ONLY';
	}
	if (commandLineParameters.qtGetSurePath('values.inputFile.0') || 
		commandLineParameters.fileList?.length) {
		return 'PROCESS_SPREADSHEET';
	}
	
	return 'HELP';
}

async function handleListSheets(commandLineParameters, config) {
	const { xLog } = process.global;
	
	try {
		// Get input file from parameters
		const inputFile = commandLineParameters.qtGetSurePath('values.inputFile.0') || 
						 commandLineParameters.fileList?.[0];
		
		if (!inputFile) {
			throw new Error('Input file path is required for -list operation');
		}
		
		xLog.status(`Listing sheets in: ${inputFile}`);
		
		// Use existing spreadsheet reader to get sheet names
		const sheets = await spreadsheetReader.getSheetNames(inputFile);
		
		console.log('\nAvailable sheets:');
		sheets.forEach((sheet, index) => {
			console.log(`  ${index + 1}. ${sheet}`);
		});
		
		return { success: true, sheets };
		
	} catch (error) {
		xLog.error(`Error listing sheets: ${error.message}`);
		return { success: false, error: error.message };
	}
}

async function handleAnalyzeOnly(commandLineParameters, config) {
	const { xLog } = process.global;
	
	try {
		const inputFile = commandLineParameters.qtGetSurePath('values.inputFile.0') || 
						 commandLineParameters.fileList?.[0];
		
		if (!inputFile) {
			throw new Error('Input file path is required for analysis');
		}
		
		const sheetName = commandLineParameters.qtGetSurePath('values.sheetName.0');
		
		xLog.status(`Analyzing spreadsheet: ${inputFile}`);
		if (sheetName) {
			xLog.status(`Target sheet: ${sheetName}`);
		}
		
		// Use existing spreadsheet reader for analysis
		const analysis = await spreadsheetReader.analyzeStructure(inputFile, sheetName);
		
		console.log('\nSpreadsheet Analysis:');
		console.log(`  File: ${inputFile}`);
		console.log(`  Sheet: ${analysis.sheetName}`);
		console.log(`  Rows: ${analysis.rowCount}`);
		console.log(`  Columns: ${analysis.columnCount}`);
		console.log('\nColumn Details:');
		analysis.columns.forEach((col, index) => {
			console.log(`  ${index + 1}. ${col.name} (${col.type}) - ${col.sampleValues.length} samples`);
		});
		
		return { success: true, analysis };
		
	} catch (error) {
		xLog.error(`Error analyzing spreadsheet: ${error.message}`);
		return { success: false, error: error.message };
	}
}

async function handleProcessSpreadsheet(commandLineParameters, config) {
	const { xLog } = process.global;
	
	try {
		const inputFile = commandLineParameters.qtGetSurePath('values.inputFile.0') || 
						 commandLineParameters.fileList?.[0];
		
		if (!inputFile) {
			throw new Error('Input file path is required for processing');
		}
		
		const outputFile = commandLineParameters.qtGetSurePath('values.outputFile.0');
		const sheetName = commandLineParameters.qtGetSurePath('values.sheetName.0');
		const tableName = commandLineParameters.qtGetSurePath('values.tableName.0') || 
						 generateTableNameFromFilename(inputFile);
		
		xLog.status(`Processing spreadsheet: ${inputFile}`);
		
		// Read spreadsheet data
		const data = await spreadsheetReader.readSpreadsheet(inputFile, sheetName);
		
		// Save to database if requested
		if (commandLineParameters.switches.saveToDatabase) {
			const overwrite = commandLineParameters.switches.overwriteTable;
			const result = await dbManager.saveToDatabase(data, tableName, overwrite);
			xLog.status(`Data saved to database table: ${tableName}`);
		}
		
		// Save to output file if specified
		if (outputFile) {
			await spreadsheetWriter.writeData(data, outputFile);
			xLog.status(`Data saved to: ${outputFile}`);
		}
		
		// Show summary
		console.log(`\nProcessing completed:`);
		console.log(`  Input: ${inputFile}`);
		console.log(`  Processed ${data.length} rows`);
		if (commandLineParameters.switches.saveToDatabase) {
			console.log(`  Saved to database table: ${tableName}`);
		}
		if (outputFile) {
			console.log(`  Output file: ${outputFile}`);
		}
		
		return { success: true, rowsProcessed: data.length };
		
	} catch (error) {
		xLog.error(`Error processing spreadsheet: ${error.message}`);
		return { success: false, error: error.message };
	}
}
//END OF moduleFunction() ============================================================

// Run the module function
module.exports = moduleFunction({ moduleName })({}); //runs it right now