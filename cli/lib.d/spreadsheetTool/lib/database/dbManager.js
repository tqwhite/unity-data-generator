'use strict';

/**
 * Database Manager
 * Handles database operations for spreadsheet data
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const tableBackup = require('./tableBackup');
const schemaManager = require('./schemaManager');

// Default table name
const DEFAULT_TABLE_NAME = 'naDataModel';

/**
 * Initialize a database connection
 * @param {string} databaseFilePath - Path to the SQLite database file
 * @returns {Object} Database connection object
 */
function initDatabase(databaseFilePath) {
  const Database = require('better-sqlite3');
  
  // Ensure directory exists
  const dbDir = path.dirname(databaseFilePath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  // Initialize database with basic logging
  return new Database(databaseFilePath, { 
    verbose: process.env.NODE_ENV === 'development' ? console.log : null 
  });
}

/**
 * Save data to the database
 * @param {string} databaseFilePath - Path to the database file
 * @param {Object} spreadsheetData - Data from the spreadsheet
 * @param {string} tableName - Name of the table to save to (optional)
 * @returns {Promise<void>}
 */
async function saveData(databaseFilePath, spreadsheetData, tableName = DEFAULT_TABLE_NAME) {
  const { xLog } = process.global;
  const db = initDatabase(databaseFilePath);
  
  try {
    xLog.status(`Writing data to database at: ${databaseFilePath}`);
    
    // Backup existing table if it exists
    tableBackup.backupTable(db, tableName);
    
    // Create the table schema
    schemaManager.createTableSchema(db, tableName, spreadsheetData.data);
    
    // Insert data with generated numeric refIds
    const processedData = spreadsheetData.data.map(record => {
      // Generate a numeric refId (stored as string for compatibility)
      const refId = generateRefId(record);
      return { 
        ...record, 
        refId: refId
      };
    });
    
    // Perform batch insert as a transaction
    insertDataTransaction(db, tableName, processedData);
    
    xLog.status(`Database updated successfully with ${processedData.length} records`);
  } finally {
    // Always close the database connection
    db.close();
  }
}

/**
 * Read data from the database
 * @param {string} databaseFilePath - Path to the database file
 * @param {string} tableName - Name of the table to read from (optional)
 * @returns {Promise<Object>} The data read from the database
 */
async function readData(databaseFilePath, tableName = DEFAULT_TABLE_NAME) {
  const { xLog } = process.global;
  const db = initDatabase(databaseFilePath);
  
  try {
    xLog.status(`Reading data from database at: ${databaseFilePath}`);
    
    // Check if table exists
    const tableExists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(tableName);
    if (!tableExists) {
      throw new Error(`Table '${tableName}' does not exist in the database. Use -loadDatabase to create it first.`);
    }
    
    // Read all rows from the table
    const rows = db.prepare(`SELECT * FROM "${tableName}"`).all();
    
    // Remove only string refId from the results, keep refIdInt
    const cleanData = rows.map(row => {
      const { refId, ...rest } = row;
      // Keep refIdInt if it exists, as it's useful for vector databases
      return rest;
    });
    
    // Get unique columns (excluding refId)
    const allColumns = new Set();
    cleanData.forEach(row => {
      Object.keys(row).forEach(key => allColumns.add(key));
    });
    
    // Create result data structure
    const resultData = {
      metadata: {
        source: 'Database',
        tableName,
        totalRows: cleanData.length,
        columns: Array.from(allColumns)
      },
      data: cleanData
    };
    
    xLog.status(`Loaded ${cleanData.length} records from database table '${tableName}'`);
    
    return resultData;
  } finally {
    // Always close the database connection
    db.close();
  }
}

/**
 * Purge old database backup tables
 * @param {string} databaseFilePath - Path to the database file
 * @param {number} retainCount - Number of recent backups to keep
 * @param {string} baseTableName - Base table name for backups (optional)
 * @returns {Promise<Object>} Results of the purge operation
 */
async function purgeBackups(databaseFilePath, retainCount, baseTableName = DEFAULT_TABLE_NAME) {
  const { xLog } = process.global;
  const db = initDatabase(databaseFilePath);
  
  try {
    xLog.status(`Purging old backup tables for ${baseTableName}...`);
    const result = tableBackup.purgeBackupTables(db, baseTableName, retainCount);
    
    if (result && result.deleted && result.deleted.length > 0) {
      xLog.status(`Successfully purged ${result.deleted.length} backup tables`);
      xLog.status(`Kept the most recent ${result.kept.length} backups: ${result.kept.join(', ')}`);
      xLog.status(`Deleted old backups: ${result.deleted.join(', ')}`);
    } else {
      xLog.status(`No backup tables were deleted. Either none found or all were within the retain count (${retainCount}).`);
    }
    
    return result;
  } finally {
    // Always close the database connection
    db.close();
  }
}

/**
 * Generate a refId for a record
 * @param {Object} record - The record to generate an ID for
 * @returns {string} Numeric refId as a string
 */
function generateRefId(record) {
  // Create a deterministic string from the record, excluding any existing refId
  const { refId, ...recordWithoutRefId } = record;
  const str = JSON.stringify(recordWithoutRefId);
  
  // Generate a SHA-256 hash of the record data
  const hash = crypto.createHash('sha256').update(str).digest('hex');
  
  // Convert the first 12 characters of the hash to a numeric refId
  // Using BigInt ensures it can represent large integers precisely
  // Converting to string for storage compatibility
  return BigInt('0x' + hash.substring(0, 12)).toString();
}

/**
 * Insert data into a table as a transaction
 * @param {Object} db - Database connection
 * @param {string} tableName - Name of the table
 * @param {Array} records - Records to insert
 */
function insertDataTransaction(db, tableName, records) {
  // Start a transaction for faster inserts
  const insertTransaction = db.transaction((records) => {
    // Get all property names (columns) from all records
    const allProperties = new Set();
    records.forEach(record => {
      Object.keys(record).forEach(key => allProperties.add(key));
    });
    
    // Create a prepared statement for insertion
    const props = Array.from(allProperties);
    const placeholders = props.map(() => '?').join(',');
    const insertSQL = `INSERT INTO "${tableName}" (${props.map(p => `"${p}"`).join(',')}) VALUES (${placeholders})`;
    const insertStmt = db.prepare(insertSQL);
    
    // Insert each record
    records.forEach(record => {
      const values = props.map(prop => record[prop] || null);
      insertStmt.run(values);
    });
  });
  
  // Execute the transaction with all records
  insertTransaction(records);
}

module.exports = {
  saveData,
  readData,
  purgeBackups,
  initDatabase,
  generateRefId
};