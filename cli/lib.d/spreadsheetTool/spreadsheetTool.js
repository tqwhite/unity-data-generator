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
// INITIALIZE CONFIGURATION
// =====================================================================

// Import configuration helper
const configHelper = require('./lib/utils/configHelper');

// Initialize configuration and set up process.global
// This must happen before requiring any modules that access process.global
const initPromise = configHelper.initialize();

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
		// Wait for configuration initialization
		const { config, cliParams } = await initPromise;
		const { xLog, getConfig, rawConfig, commandLineParameters } = process.global;
		
		// =====================================================================
		// MAIN APPLICATION EXECUTION PIPELINE
		// =====================================================================
		
		// ---------------------------------------------------------------------
		// 1. Process command line parameters and determine operation mode
		
		const operationMode = determineOperationMode(commandLineParameters);
		
		// ---------------------------------------------------------------------
		// 2. Handle different operation modes
		
		switch (operationMode) {
			case 'HELP':
				// Display help text
				const helpText = require('./lib/help-text');
				console.log(helpText.mainHelp({ defaultRequestFilePath: '', errorMessage: '' }));
				return {};
				
			case 'LIST_SHEETS':
				return await handleListSheets(commandLineParameters, config);
				
			case 'ANALYZE_ONLY':
				return await handleAnalyzeOnly(commandLineParameters, config);
				
			case 'PROCESS_SPREADSHEET':
				return await handleProcessSpreadsheet(commandLineParameters, config);
				
			case 'DATABASE_EXPORT':
				return await handleDatabaseExport(commandLineParameters, config);
				
			default:
				xLog.error('No valid operation mode specified. Use --help for usage information.');
				return {};
		}
	};

// ---------------------------------------------------------------------
// Helper functions for operation mode determination and handling

function determineOperationMode(commandLineParameters) {
	// Check for help first
	if (commandLineParameters.switches.help) {
		return 'HELP';
	}
	
	if (commandLineParameters.switches.list) {
		return 'LIST_SHEETS';
	}
	if (commandLineParameters.switches.analyzeOnly) {
		return 'ANALYZE_ONLY';
	}
	
	// Check for -loadDatabase or explicit input file processing
	if (commandLineParameters.switches.loadDatabase || 
		commandLineParameters.qtGetSurePath('values.inputFile.0')) {
		return 'PROCESS_SPREADSHEET';
	}
	
	// Database export operation: if there are values (like --tableName) 
	// or specific database-related switches
	if (commandLineParameters.qtGetSurePath('values.tableName.0') || 
		Object.keys(commandLineParameters.values).length > 0 ||
		commandLineParameters.switches.purgeBackupDbTables ||
		commandLineParameters.switches.saveToDatabase) {
		return 'DATABASE_EXPORT';
	}
	
	// If there are file arguments but no explicit switches, it might be spreadsheet processing
	if (commandLineParameters.fileList?.length) {
		return 'PROCESS_SPREADSHEET';
	}
	
	// Default to help if no specific operation is detected
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
		
		// Save to database if requested (either -loadDatabase or -saveToDatabase)
		if (commandLineParameters.switches.loadDatabase || commandLineParameters.switches.saveToDatabase) {
			const overwrite = commandLineParameters.switches.overwriteTable;
			const result = await dbManager.saveData(config.databaseFilePath, data, tableName, config.refIdSourceNames);
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
		console.log(`  Processed ${data.data ? data.data.length : 0} rows`);
		if (commandLineParameters.switches.loadDatabase || commandLineParameters.switches.saveToDatabase) {
			console.log(`  Saved to database table: ${tableName}`);
		}
		if (outputFile) {
			console.log(`  Output file: ${outputFile}`);
		}
		
		return { success: true, rowsProcessed: data.data ? data.data.length : 0 };
		
	} catch (error) {
		xLog.error(`Error processing spreadsheet: ${error.message}`);
		return { success: false, error: error.message };
	}
}

async function handleDatabaseExport(commandLineParameters, config) {
	const { xLog } = process.global;
	
	try {
		// Get table name from command line or use default from config
		const tableName = commandLineParameters.qtGetSurePath('values.tableName.0') || config.defaultTableName;
		// Get output directory from --outputFile parameter or fileList[0] or default config path
		const outputDirectory = commandLineParameters.qtGetSurePath('values.outputFile.0') || 
								commandLineParameters.fileList?.[0] || 
								config.outputsPath;
		
		xLog.status(`Exporting database table: ${tableName}`);
		
		// Read data from database
		const data = await dbManager.readData(config.databaseFilePath, tableName);
		
		if (!data || !data.data || data.data.length === 0) {
			xLog.error(`No data found in table: ${tableName}`);
			return { success: false, error: `No data found in table: ${tableName}` };
		}
		
		xLog.status(`Found ${data.data.length} records in table ${tableName}`);
		
		// Generate output files
		const basePath = path.join(outputDirectory, tableName);
		const outputFiles = await spreadsheetWriter.writeDataFiles(basePath, data);
		
		// Report success
		console.log(`\nDatabase export completed successfully:`);
		console.log(`  Table: ${tableName}`);
		console.log(`  Records: ${data.data.length}`);
		console.log(`  Output files:`);
		if (outputFiles.excelPath) {
			console.log(`    Excel: ${outputFiles.excelPath}`);
		}
		if (outputFiles.jsonPath) {
			console.log(`    JSON: ${outputFiles.jsonPath}`);
		}
		if (outputFiles.csvPath) {
			console.log(`    CSV: ${outputFiles.csvPath}`);
		}
		
		return { success: true, recordsExported: data.data.length, outputFiles };
		
	} catch (error) {
		xLog.error(`Error exporting database: ${error.message}`);
		return { success: false, error: error.message };
	}
}
//END OF moduleFunction() ============================================================

// Run the module function
(async () => {
	try {
		const result = await moduleFunction({ moduleName })({});
		if (result && result.error) {
			process.exit(1);
		}
	} catch (error) {
		console.error('Application error:', error.message);
		process.exit(1);
	}
})(); //runs it right now