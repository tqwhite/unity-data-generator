'use strict';

/**
 * CLI Handler
 * Handles command-line interface options and command parsing
 */

const path = require('path');
const fs = require('fs');

/**
 * Determine the operation mode based on command-line parameters
 * @param {Object} cliParams - The command-line parameters
 * @returns {string} The operation mode as a string constant
 */
function determineOperationMode(cliParams) {
  const { xLog } = process.global;
  
  // Debug: output command line parameters
  xLog.status(`Command line parameters: ${JSON.stringify(cliParams)}`);
  
  // Check for help flag
  if (cliParams.switches.help) {
    return 'HELP';
  }
  
  // Check for listing sheets flag
  if (cliParams.switches.list) {
    const sheetFile = cliParams.qtGetSurePath('fileList[0]', '');
    xLog.status(`List mode - Sheet file: ${sheetFile}`);
    if (!sheetFile) {
      throw new Error('Spreadsheet file path is required when using -list option');
    }
    return 'LIST_SHEETS';
  }
  
  // Check for purging backup tables
  if (cliParams.switches.purgeBackupDbTables) {
    return 'PURGE_BACKUPS';
  }
  
  // Check for loading database flag
  if (cliParams.switches.loadDatabase) {
    const spreadsheetFile = cliParams.qtGetSurePath('fileList[0]', '');
    xLog.status(`Load database mode - Spreadsheet file: ${spreadsheetFile}`);
    if (!spreadsheetFile) {
      throw new Error('Input spreadsheet file is required when using -loadDatabase');
    }
    return 'LOAD_DATABASE';
  }
  
  // Default mode: generate files from database
  const defaultFile = cliParams.qtGetSurePath('fileList[0]', '');
  xLog.status(`Generate files mode - Default file: ${defaultFile}`);
  return 'GENERATE_FILES';
}

/**
 * Display help message to the console
 */
function showHelp() {
  const { xLog } = process.global;
  
  xLog.result(`
Spreadsheet Tool - Read Excel files into structured data

USAGE:
  spreadsheetTool [inputFile] [outputDirectory]   Generate JSON/Excel files from database (default)
  spreadsheetTool -loadDatabase inputFile [outputDirectory]   Load spreadsheet INTO database, then generate files
  
  inputFile          Path to the Excel spreadsheet file (required with -loadDatabase, optional otherwise)
  outputDirectory    Directory for output files (optional, default is configured output path)

OPTIONS:
  -list              List all sheets in the spreadsheet
  -loadDatabase      Load spreadsheet data INTO the database (by default, database is not updated)
  -purgeBackupDbTables  Remove old database table backups, keeping only the most recent ones
  -echoAlso          Display the output in the console
  -help              Show this help message
  --tableName=name   Specify custom table name (default: camelCase from input filename)

EXAMPLES:
  spreadsheetTool -list MyData.xlsx
    Lists all worksheets in MyData.xlsx
    
  spreadsheetTool -loadDatabase MyData.xlsx
    Creates table 'myData' from MyData.xlsx and generates output files
    
  spreadsheetTool -loadDatabase MyData.xlsx --tableName=customTable
    Creates table 'customTable' from MyData.xlsx
    
  spreadsheetTool -loadDatabase "JEDx Sample Data.xls"
    Creates table 'jedxSampleData' (camelCase, special chars removed)
  `);
  
  process.exit(0);
}

/**
 * Get the output file path based on CLI parameters and configuration
 * @param {Object} cliParams - Command-line parameters
 * @param {Object} config - Application configuration
 * @param {string} extension - File extension (e.g., 'json', 'xlsx')
 * @returns {string} The absolute path to the output file
 */
function getOutputFilePath(cliParams, config, extension) {
  const spreadsheetFile = cliParams.qtGetSurePath('fileList[0]', '');
  const outputPathArg = cliParams.qtGetSurePath('fileList[1]', '');
  
  let finalOutputPath;
  let baseFileName;
  
  // Determine output directory
  if (outputPathArg) {
    finalOutputPath = outputPathArg;
    fs.mkdirSync(finalOutputPath, { recursive: true });
  } else {
    finalOutputPath = config.outputsPath;
  }
  
  // Determine base file name
  if (spreadsheetFile) {
    baseFileName = path.basename(spreadsheetFile, path.extname(spreadsheetFile));
  } else {
    baseFileName = 'database_export';
  }
  
  // Construct the output file path
  let outputFilePath;
  if (extension === 'xlsx') {
    outputFilePath = path.join(finalOutputPath, `${baseFileName}_generated.xlsx`);
  } else {
    outputFilePath = path.join(finalOutputPath, `${baseFileName}.${extension}`);
  }
  
  // Ensure the output directory exists
  const outputDir = path.dirname(outputFilePath);
  fs.mkdirSync(outputDir, { recursive: true });
  
  return outputFilePath;
}

module.exports = {
  determineOperationMode,
  showHelp,
  getOutputFilePath
};