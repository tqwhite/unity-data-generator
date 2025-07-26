'use strict';

/**
 * Configuration Helper
 * Handles loading and managing configuration for the spreadsheet tool
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

// Direct qtools library usage instead of qtools-ai-framework
const commandLineParser = require('qtools-parse-command-line');
const configFileProcessor = require('qtools-config-file-processor');

// Find project root directory
const findProjectRoot = ({ rootFolderName = 'system', closest = true } = {}) =>
  __dirname.replace(
    new RegExp(`^(.*${closest ? '' : '?'}\/${rootFolderName}).*$`),
    '$1',
  );

const applicationBasePath = findProjectRoot();

/**
 * Initialize configuration and global variables
 * @returns {Object} Object containing configuration and CLI parameters
 */
async function initialize() {
  // Determine module name for configuration lookup
  const moduleName = 'spreadsheetTool';
  
  // Initialize xLog directly
  const xLog = require('qtools-x-log');
  
  // Parse command line parameters with application controls
  const applicationControls = [
    '-help',
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
    '--configPath',
    '--refIdSourceNames'
  ];
  
  const commandLineParameters = commandLineParser.getParameters({
    applicationControls: applicationControls
  });
  
  // Set up configuration path
  const configName = os.hostname().match(/^q/) ? 'instanceSpecific/qbook' : '';
  const configDirPath = `${applicationBasePath}/configs/${configName}/`;
  
  // Load configuration directly
  const rawConfig = configFileProcessor.getConfig(
    `${moduleName}.ini`,
    configDirPath,
    { resolve: true }
  );
  
  const getConfig = (sectionName) => rawConfig[sectionName];
  
  // Set up process.global for compatibility
  process.global = {
    xLog,
    getConfig,
    commandLineParameters,
    rawConfig
  };
  
  // Get configuration specific to this module
  const moduleConfig = getConfig(moduleName) || {};
  let { outputsPath, databaseFilePath, retainOnDbBackupPurge = 3, refIdSourceNames=[], defaultTableName } = moduleConfig;
  
  // If database path is not specified, try to find it
  if (!databaseFilePath) {
    xLog.error('No database file path specified in either command line or config');
    throw 'No database file path specified in either command line or config';
  }
  
  // Check for CLI override of refIdSourceNames
  if (commandLineParameters.values.refIdSourceNames && commandLineParameters.values.refIdSourceNames.length > 0) {
    refIdSourceNames = commandLineParameters.values.refIdSourceNames[0];
  }
  
  const config = {
    outputsPath,
    databaseFilePath,
    retainOnDbBackupPurge,
    refIdSourceNames,       // Configurable refId generation
    xLog,                   // Logger
    applicationBasePath,    // Root directory of the application
    defaultTableName // Configurable default table name for data storage
  };
  
  return {
    config,
    cliParams: commandLineParameters
  };
}

module.exports = {
  initialize,
  findProjectRoot
};