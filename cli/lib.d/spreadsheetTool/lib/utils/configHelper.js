'use strict';

/**
 * Configuration Helper
 * Handles loading and managing configuration for the spreadsheet tool
 */

const path = require('path');
const fs = require('fs');

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
  
  // Initialize ATP (Anthropic Thought Processor)
  const initAtp = require('../../../../../lib/qtools-ai-framework/jina')({
    configFileBaseName: moduleName,
    applicationBasePath,
	applicationControls: ['-loadDatabase', '-purgeBackupDbTables', '-list', '--tableName'],
  });
  
  // Access global variables set up by initAtp
  const { xLog, getConfig, commandLineParameters } = process.global;
  
  // Get configuration specific to this module
  let { outputsPath, databaseFilePath, retainOnDbBackupPurge = 3 } = getConfig(moduleName);
  
  // If database path is not specified, try to find it
  if (!databaseFilePath) {
    // Try to get from embedVectorTools config
    const embedVectorConfig = getConfig('init-ceds-vectors');
    databaseFilePath = embedVectorConfig ? embedVectorConfig.databaseFilePath : null;
    
    if (databaseFilePath) {
      xLog.status(`Using database path from embedVectorTools: ${databaseFilePath}`);
    } else {
      // Use default path if not found
      databaseFilePath = path.join(applicationBasePath, 'data', 'data.sqlite3');
      xLog.status(`Using default database path: ${databaseFilePath}`);
      
      // Ensure directory exists
      fs.mkdirSync(path.dirname(databaseFilePath), { recursive: true });
    }
  }
  
  const config = {
    outputsPath,
    databaseFilePath,
    retainOnDbBackupPurge,
    xLog,                   // Logger
    applicationBasePath,    // Root directory of the application
    tableName: 'naDataModel' // Default table name for data storage
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