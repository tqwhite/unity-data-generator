'use strict';

/**
 * Database Saver for Unity CEDS Matches
 * Saves CEDS match results to database
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Table name for CEDS matches
const CEDS_MATCHES_TABLE = 'unityCedsMatches';

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
 * Generate a refId from an XPath value
 * @param {string} xpathValue - The XPath value to hash
 * @returns {string} Numeric refId as a string
 */
function generateRefIdFromXPath(xpathValue) {
  // Use only the XPath value for generating the refId
  const valueTohash = xpathValue || '';
  
  // Generate a SHA-256 hash of the XPath value
  const hash = crypto.createHash('sha256').update(valueTohash).digest('hex');
  
  // Convert the first 12 characters of the hash to a numeric refId
  // Using BigInt ensures it can represent large integers precisely
  // Converting to string for storage compatibility
  return BigInt('0x' + hash.substring(0, 12)).toString();
}

/**
 * Create the table schema for CEDS matches
 * @param {Object} db - Database connection
 */
function createTableSchema(db) {
  const { xLog } = process.global;
  
  // Check if table exists first
  const tableExists = db.prepare(
    `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
  ).get(CEDS_MATCHES_TABLE);
  
  if (!tableExists) {
    // Create table if it doesn't exist
    const createTableSQL = `
      CREATE TABLE "${CEDS_MATCHES_TABLE}" (
        "refId" TEXT PRIMARY KEY,
        "_CEDSElementsRefId" TEXT,
        "naDataModelRefId" TEXT,
        "confidence" TEXT,
        "jsonResultString" TEXT,
        "createdAt" TEXT,
        "updatedAt" TEXT
      )
    `;
    
    db.prepare(createTableSQL).run();
    xLog.status(`Created table "${CEDS_MATCHES_TABLE}"`);
  }
}

/**
 * Save CEDS match results to the database
 * @param {string} databaseFilePath - Path to the database file
 * @param {Array} matchResults - Array of CEDS match results
 * @returns {Promise<Object>} Result statistics
 */
async function saveCedsMatches(databaseFilePath, matchResults) {
  const { xLog } = process.global;
  const db = initDatabase(databaseFilePath);
  const stats = { total: matchResults.length, inserted: 0, updated: 0, skipped: 0 };
  
  try {
    xLog.status(`Writing CEDS matches to database at: ${databaseFilePath}`);
    
    // Create table schema if needed
    createTableSchema(db);
    
    // Begin a transaction for better performance
    const transaction = db.transaction(() => {
      const currentTimestamp = new Date().toISOString();
      
      // Prepare statements
      const insertStatement = db.prepare(`
        INSERT INTO "${CEDS_MATCHES_TABLE}" 
        (refId, _CEDSElementsRefId, naDataModelRefId, confidence, jsonResultString, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const updateStatement = db.prepare(`
        UPDATE "${CEDS_MATCHES_TABLE}" 
        SET _CEDSElementsRefId = ?, confidence = ?, jsonResultString = ?, updatedAt = ?
        WHERE naDataModelRefId = ?
      `);
      
      const checkExistsStatement = db.prepare(`
        SELECT refId FROM "${CEDS_MATCHES_TABLE}" WHERE naDataModelRefId = ?
      `);
      
      // Process each match result
      for (const match of matchResults) {
        // Skip if no CEDS recommendation ID
        if (!match.CEDS_RECOMMENDATION || !match.CEDS_RECOMMENDATION.id) {
          stats.skipped++;
          continue;
        }
        
        // Extract necessary values
        const cedsId = match.CEDS_RECOMMENDATION.id;
        const xpath = match.SIF_ELEMENT.xpath;
        const confidence = match.CONFIDENCE;
        const jsonString = JSON.stringify(match);
        
        // Generate naDataModelRefId from XPath
        const naDataModelRefId = generateRefIdFromXPath(xpath);
        
        // Check if record already exists
        const existingRecord = checkExistsStatement.get(naDataModelRefId);
        
        if (existingRecord) {
          // Update existing record
          updateStatement.run(cedsId, confidence, jsonString, currentTimestamp, naDataModelRefId);
          stats.updated++;
        } else {
          // Generate a unique refId for this match
          const refId = crypto.randomBytes(8).toString('hex');
          
          // Insert new record
          insertStatement.run(refId, cedsId, naDataModelRefId, confidence, jsonString, currentTimestamp, currentTimestamp);
          stats.inserted++;
        }
      }
    });
    
    // Execute the transaction
    transaction();
    
    xLog.status(`CEDS matches database updated: ${stats.inserted} inserted, ${stats.updated} updated, ${stats.skipped} skipped`);
    return stats;
    
  } finally {
    // Always close the database connection
    db.close();
  }
}

module.exports = {
  saveCedsMatches
};