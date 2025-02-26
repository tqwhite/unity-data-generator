'use strict';

/**
 * Schema Manager Module
 * Handles database schema creation and management
 */

/**
 * Create a table schema based on data
 * @param {Object} db - Database connection
 * @param {string} tableName - Name of the table to create
 * @param {Array} data - Data records used to determine schema
 * @returns {Array} The schema columns created
 */
function createTableSchema(db, tableName, data) {
  const { xLog } = process.global;
  
  // Collect all unique property names across all records
  const allProperties = new Set(['refId']); // Always include the primary key
  
  data.forEach(record => {
    Object.keys(record).forEach(key => allProperties.add(key));
  });
  
  // Create SQL for table schema
  const columnDefs = Array.from(allProperties).map(prop => {
    if (prop === 'refId') {
      return `"${prop}" TEXT PRIMARY KEY`;
    } else {
      return `"${prop}" TEXT`;
    }
  }).join(', ');
  
  // Create the table
  const createTableSQL = `CREATE TABLE "${tableName}" (${columnDefs})`;
  db.prepare(createTableSQL).run();
  
  xLog.status(`Created table "${tableName}" with columns: ${Array.from(allProperties).join(', ')}`);
  
  return Array.from(allProperties);
}

/**
 * Check if a table exists in the database
 * @param {Object} db - Database connection
 * @param {string} tableName - Name of the table to check
 * @returns {boolean} True if table exists, false otherwise
 */
function tableExists(db, tableName) {
  const result = db.prepare(
    `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
  ).get(tableName);
  
  return result !== undefined;
}

/**
 * Get the schema of an existing table
 * @param {Object} db - Database connection
 * @param {string} tableName - Name of the table
 * @returns {Array} Array of column information
 */
function getTableSchema(db, tableName) {
  // Check if table exists
  if (!tableExists(db, tableName)) {
    return null;
  }
  
  // Get table information using PRAGMA
  return db.prepare(`PRAGMA table_info("${tableName}")`).all();
}

module.exports = {
  createTableSchema,
  tableExists,
  getTableSchema
};