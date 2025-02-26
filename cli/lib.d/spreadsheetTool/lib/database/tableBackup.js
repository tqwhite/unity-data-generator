'use strict';

/**
 * Table Backup Module
 * Handles backing up and purging database tables
 */

/**
 * Backup a table if it exists
 * @param {Object} db - Database connection
 * @param {string} tableName - Name of the table to backup
 * @returns {string|null} The name of the backup table if created, null otherwise
 */
function backupTable(db, tableName) {
  const { xLog } = process.global;
  
  // Check if table exists
  const tableExists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(tableName);
  
  if (!tableExists) {
    // Table doesn't exist, no backup needed
    return null;
  }
  
  // Create backup table name with timestamp
  const now = new Date();
  const dateStr = `${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
  
  // Find the next available version number
  let version = 1;
  let backupTableName;
  
  do {
    backupTableName = `${tableName}_backup_${dateStr}_v${version}`;
    const backupExists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(backupTableName);
    if (!backupExists) break;
    version++;
  } while (version < 100); // Safety limit
  
  // Create backup table
  db.prepare(`CREATE TABLE "${backupTableName}" AS SELECT * FROM "${tableName}"`).run();
  xLog.status(`Created backup table: ${backupTableName}`);
  
  // Drop original table
  db.prepare(`DROP TABLE "${tableName}"`).run();
  xLog.status(`Dropped original table: ${tableName}`);
  
  return backupTableName;
}

/**
 * Purge old backup tables
 * @param {Object} db - Database connection
 * @param {string} baseTableName - Base table name
 * @param {number} retainCount - Number of recent backups to keep
 * @returns {Object} Object with kept and deleted table names
 */
function purgeBackupTables(db, baseTableName, retainCount = 3) {
  // Find all backup tables for the specified base table
  const allTablesSQL = `SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '${baseTableName}_backup_%' ORDER BY name DESC`;
  const backupTables = db.prepare(allTablesSQL).all();
  
  if (backupTables.length === 0) {
    // No backup tables found
    return { kept: [], deleted: [] };
  }
  
  // Keep the most recent ones based on retainCount
  const tablesToKeep = backupTables.slice(0, retainCount);
  const tablesToDelete = backupTables.slice(retainCount);
  
  // Drop the older tables
  if (tablesToDelete.length > 0) {
    tablesToDelete.forEach(table => {
      const dropSQL = `DROP TABLE "${table.name}"`;
      db.prepare(dropSQL).run();
    });
  }
  
  return {
    kept: tablesToKeep.map(t => t.name),
    deleted: tablesToDelete.map(t => t.name)
  };
}

module.exports = {
  backupTable,
  purgeBackupTables
};