'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const Database = require('better-sqlite3');
const tableBackup = require('../../lib/database/tableBackup');

// Mock process.global for testing
const mockXLog = {
  status: jest.fn(),
  result: jest.fn(),
  error: jest.fn()
};

beforeAll(() => {
  process.global = {
    xLog: mockXLog
  };
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('Table Backup', () => {
  let testDbPath;
  let db;
  
  beforeEach(() => {
    // Create temporary database for each test
    testDbPath = path.join(os.tmpdir(), `test-backup-${Date.now()}.sqlite3`);
    db = new Database(testDbPath);
  });
  
  afterEach(() => {
    // Clean up test database
    if (db) {
      db.close();
    }
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('backupTable', () => {
    test('should backup existing table and drop original', () => {
      // Create test table with data
      db.exec(`
        CREATE TABLE testTable (
          id INTEGER PRIMARY KEY,
          name TEXT,
          value TEXT
        )
      `);
      
      db.exec(`
        INSERT INTO testTable (name, value) VALUES 
        ('item1', 'value1'),
        ('item2', 'value2')
      `);
      
      const backupTableName = tableBackup.backupTable(db, 'testTable');
      
      // Should return a backup table name
      expect(backupTableName).toMatch(/^testTable_backup_\d{6}_v1$/);
      
      // Original table should no longer exist
      const originalExists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get('testTable');
      expect(originalExists).toBeUndefined();
      
      // Backup table should exist with data
      const backupExists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(backupTableName);
      expect(backupExists).toBeDefined();
      
      const backupData = db.prepare(`SELECT * FROM "${backupTableName}"`).all();
      expect(backupData).toHaveLength(2);
      expect(backupData[0].name).toBe('item1');
      expect(backupData[1].name).toBe('item2');
      
      // Should log backup creation
      expect(mockXLog.status).toHaveBeenCalledWith(`Created backup table: ${backupTableName}`);
      expect(mockXLog.status).toHaveBeenCalledWith('Dropped original table: testTable');
    });

    test('should return null when table does not exist', () => {
      const backupTableName = tableBackup.backupTable(db, 'nonexistentTable');
      
      expect(backupTableName).toBeNull();
      expect(mockXLog.status).not.toHaveBeenCalled();
    });

    test('should handle multiple backups with version numbers', () => {
      // Create test table
      db.exec(`
        CREATE TABLE testTable (
          id INTEGER,
          name TEXT
        )
      `);
      
      // First backup
      const backup1 = tableBackup.backupTable(db, 'testTable');
      expect(backup1).toMatch(/v1$/);
      
      // Recreate original table
      db.exec(`
        CREATE TABLE testTable (
          id INTEGER,
          name TEXT
        )
      `);
      
      // Second backup (same day)
      const backup2 = tableBackup.backupTable(db, 'testTable');
      expect(backup2).toMatch(/v2$/);
      
      // Both backup tables should exist
      const backup1Exists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(backup1);
      const backup2Exists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(backup2);
      
      expect(backup1Exists).toBeDefined();
      expect(backup2Exists).toBeDefined();
    });

    test('should generate date-based backup names', () => {
      // Create test table
      db.exec(`CREATE TABLE testTable (id INTEGER)`);
      
      const backupTableName = tableBackup.backupTable(db, 'testTable');
      
      // Should contain current date in YYMMDD format
      const today = new Date();
      const dateStr = `${today.getFullYear().toString().slice(-2)}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
      
      expect(backupTableName).toContain(dateStr);
    });

    test('should handle version limit safety check', () => {
      // This test ensures the loop doesn't run indefinitely
      // Create 5 backup tables manually to test the safety limit
      db.exec(`CREATE TABLE testTable (id INTEGER)`);
      
      // Create many existing backup tables to approach the limit
      for (let i = 1; i <= 5; i++) {
        const today = new Date();
        const dateStr = `${today.getFullYear().toString().slice(-2)}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
        const backupName = `testTable_backup_${dateStr}_v${i}`;
        db.exec(`CREATE TABLE "${backupName}" (id INTEGER)`);
      }
      
      // Should still create the next version
      const backupTableName = tableBackup.backupTable(db, 'testTable');
      expect(backupTableName).toMatch(/v6$/);
    });
  });

  describe('purgeBackupTables', () => {
    beforeEach(() => {
      // Create multiple backup tables for testing
      const today = new Date();
      const dateStr = `${today.getFullYear().toString().slice(-2)}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
      
      // Create 5 backup tables
      for (let i = 1; i <= 5; i++) {
        const backupName = `testTable_backup_${dateStr}_v${i}`;
        db.exec(`CREATE TABLE "${backupName}" (id INTEGER)`);
      }
    });

    test('should keep specified number of recent backups', () => {
      const result = tableBackup.purgeBackupTables(db, 'testTable', 2);
      
      expect(result.kept).toHaveLength(2);
      expect(result.deleted).toHaveLength(3);
      
      // Verify kept tables still exist
      result.kept.forEach(tableName => {
        const exists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(tableName);
        expect(exists).toBeDefined();
      });
      
      // Verify deleted tables no longer exist
      result.deleted.forEach(tableName => {
        const exists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(tableName);
        expect(exists).toBeUndefined();
      });
    });

    test('should return empty arrays when no backup tables exist', () => {
      // Use a different base table name that has no backups
      const result = tableBackup.purgeBackupTables(db, 'nonexistentTable', 3);
      
      expect(result.kept).toEqual([]);
      expect(result.deleted).toEqual([]);
    });

    test('should handle retainCount larger than available backups', () => {
      const result = tableBackup.purgeBackupTables(db, 'testTable', 10);
      
      expect(result.kept).toHaveLength(5); // All available backups kept
      expect(result.deleted).toEqual([]);
    });

    test('should handle retainCount of 0', () => {
      const result = tableBackup.purgeBackupTables(db, 'testTable', 0);
      
      expect(result.kept).toEqual([]);
      expect(result.deleted).toHaveLength(5); // All backups deleted
      
      // Verify all backup tables are gone
      const remainingTables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'testTable_backup_%'`).all();
      expect(remainingTables).toHaveLength(0);
    });

    test('should order backups by name (most recent first)', () => {
      const result = tableBackup.purgeBackupTables(db, 'testTable', 2);
      
      // Kept tables should be the highest version numbers (most recent)
      expect(result.kept[0]).toMatch(/v5$/);
      expect(result.kept[1]).toMatch(/v4$/);
      
      // Deleted tables should be the lower version numbers (oldest)
      expect(result.deleted).toEqual(expect.arrayContaining([
        expect.stringMatching(/v1$/),
        expect.stringMatching(/v2$/),
        expect.stringMatching(/v3$/)
      ]));
    });

    test('should only affect backups for specified base table', () => {
      // Create backup tables for a different base table
      const today = new Date();
      const dateStr = `${today.getFullYear().toString().slice(-2)}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
      
      db.exec(`CREATE TABLE "otherTable_backup_${dateStr}_v1" (id INTEGER)`);
      db.exec(`CREATE TABLE "otherTable_backup_${dateStr}_v2" (id INTEGER)`);
      
      const result = tableBackup.purgeBackupTables(db, 'testTable', 2);
      
      // Should only affect testTable backups
      expect(result.kept).toHaveLength(2);
      expect(result.deleted).toHaveLength(3);
      
      // Other table backups should still exist
      const otherBackupsExist = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'otherTable_backup_%'`).all();
      expect(otherBackupsExist).toHaveLength(2);
    });
  });
});