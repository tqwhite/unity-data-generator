'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const dbManager = require('../../lib/database/dbManager');

// Mock process.global for testing
const mockXLog = {
  status: jest.fn(),
  result: jest.fn(),
  error: jest.fn()
};

// Set up process.global before tests
beforeAll(() => {
  process.global = {
    xLog: mockXLog,
    commandLineParameters: {
      switches: {}
    }
  };
});

// Clean up after tests
afterEach(() => {
  jest.clearAllMocks();
});

describe('Database Manager', () => {
  let testDbPath;
  let testData;
  
  beforeEach(() => {
    // Create temporary database file for each test
    testDbPath = path.join(os.tmpdir(), `test-spreadsheet-${Date.now()}.sqlite3`);
    
    // Sample test data
    testData = {
      metadata: {
        fileName: 'test.xlsx',
        totalSheets: 1,
        totalRows: 2,
        columns: ['Name', 'Type', 'XPath']
      },
      data: [
        {
          Name: 'TestElement1',
          Type: 'String',
          XPath: '/test/element1',
          SheetName: 'Sheet1'
        },
        {
          Name: 'TestElement2', 
          Type: 'Number',
          XPath: '/test/element2',
          SheetName: 'Sheet1'
        }
      ]
    };
  });
  
  afterEach(() => {
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('saveData', () => {
    test('should save spreadsheet data to database', async () => {
      await dbManager.saveData(testDbPath, testData);
      
      expect(mockXLog.status).toHaveBeenCalledWith(expect.stringContaining('Writing data to database'));
      expect(mockXLog.status).toHaveBeenCalledWith(expect.stringContaining('Database updated successfully with 2 records'));
      expect(fs.existsSync(testDbPath)).toBe(true);
    });

    test('should save data to custom table name', async () => {
      const customTableName = 'customTable';
      await dbManager.saveData(testDbPath, testData, customTableName);
      
      // Verify data was saved to custom table
      const readResult = await dbManager.readData(testDbPath, customTableName);
      expect(readResult.data).toHaveLength(2);
      expect(readResult.metadata.tableName).toBe(customTableName);
    });

    test('should generate refId for records', async () => {
      await dbManager.saveData(testDbPath, testData);
      const readResult = await dbManager.readData(testDbPath);
      
      // Should not include refId in output (it's removed)
      readResult.data.forEach(record => {
        expect(record.refId).toBeUndefined();
        expect(record.createdAt).toBeDefined();
        expect(record.updatedAt).toBeDefined();
      });
    });

    test('should backup existing table before overwriting', async () => {
      // Save data first time
      await dbManager.saveData(testDbPath, testData);
      
      // Save again with different data
      const newData = {
        ...testData,
        data: [{
          Name: 'NewElement',
          Type: 'Boolean',
          XPath: '/test/new',
          SheetName: 'Sheet1'
        }]
      };
      
      await dbManager.saveData(testDbPath, newData);
      
      // Should have logged backup creation
      expect(mockXLog.status).toHaveBeenCalledWith(expect.stringContaining('Created backup table'));
      expect(mockXLog.status).toHaveBeenCalledWith(expect.stringContaining('Dropped original table'));
    });
  });

  describe('readData', () => {
    beforeEach(async () => {
      // Save test data first
      await dbManager.saveData(testDbPath, testData);
    });

    test('should read data from database', async () => {
      const result = await dbManager.readData(testDbPath);
      
      expect(result.data).toHaveLength(2);
      expect(result.metadata.tableName).toBe('naDataModel');
      expect(result.metadata.totalRows).toBe(2);
      expect(result.data[0].Name).toBe('TestElement1');
      expect(result.data[1].Name).toBe('TestElement2');
    });

    test('should read from custom table name', async () => {
      const customTableName = 'customTable';
      await dbManager.saveData(testDbPath, testData, customTableName);
      
      const result = await dbManager.readData(testDbPath, customTableName);
      expect(result.metadata.tableName).toBe(customTableName);
      expect(result.data).toHaveLength(2);
    });

    test('should throw error if table does not exist', async () => {
      await expect(dbManager.readData(testDbPath, 'nonexistentTable'))
        .rejects.toThrow("Table 'nonexistentTable' does not exist");
    });

    test('should remove refId from output but keep other generated fields', async () => {
      const result = await dbManager.readData(testDbPath);
      
      result.data.forEach(record => {
        expect(record.refId).toBeUndefined(); // refId should be removed
        expect(record.createdAt).toBeDefined(); // timestamps should remain
        expect(record.updatedAt).toBeDefined();
      });
    });
  });

  describe('purgeBackups', () => {
    beforeEach(async () => {
      // Create some backup tables by saving data multiple times with explicit backups
      await dbManager.saveData(testDbPath, testData, 'testPurgeTable');
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay for different timestamps
      await dbManager.saveData(testDbPath, testData, 'testPurgeTable');
      await new Promise(resolve => setTimeout(resolve, 10));
      await dbManager.saveData(testDbPath, testData, 'testPurgeTable');
      await new Promise(resolve => setTimeout(resolve, 10));
      await dbManager.saveData(testDbPath, testData, 'testPurgeTable');
    });

    test('should purge old backup tables', async () => {
      const result = await dbManager.purgeBackups(testDbPath, 1, 'testPurgeTable');
      
      expect(result.kept).toHaveLength(1);
      expect(result.deleted.length).toBeGreaterThan(0);
      expect(mockXLog.status).toHaveBeenCalledWith(expect.stringContaining('Successfully purged'));
    });

    test('should keep specified number of recent backups', async () => {
      const result = await dbManager.purgeBackups(testDbPath, 2, 'testPurgeTable');
      
      expect(result.kept).toHaveLength(2);
      expect(mockXLog.status).toHaveBeenCalledWith(expect.stringContaining('Kept the most recent 2 backups:'));
    });
  });

  describe('generateRefId', () => {
    test('should generate consistent refId from XPath', () => {
      const record1 = { XPath: '/test/element1', Name: 'Test' };
      const record2 = { XPath: '/test/element1', Name: 'Different' };
      
      const refId1 = dbManager.generateRefId(record1);
      const refId2 = dbManager.generateRefId(record2);
      
      expect(refId1).toBe(refId2); // Same XPath should generate same refId
      expect(refId1).toMatch(/^\d+$/); // Should be numeric string
    });

    test('should use Path as fallback when XPath is missing', () => {
      const record = { Path: '/test/element1', Name: 'Test' };
      const refId = dbManager.generateRefId(record);
      
      expect(refId).toMatch(/^\d+$/);
      expect(refId).toBeDefined();
    });

    test('should generate refId from other fields when XPath and Path are missing', () => {
      const record = { Name: 'Test', Type: 'String', Description: 'A test element' };
      const refId = dbManager.generateRefId(record);
      
      expect(refId).toMatch(/^\d+$/);
      expect(refId).toBeDefined();
    });

    test('should generate different refIds for different records', () => {
      const record1 = { XPath: '/test/element1' };
      const record2 = { XPath: '/test/element2' };
      
      const refId1 = dbManager.generateRefId(record1);
      const refId2 = dbManager.generateRefId(record2);
      
      expect(refId1).not.toBe(refId2);
    });
  });

  describe('initDatabase', () => {
    test('should create database directory if it does not exist', () => {
      const nonExistentDir = path.join(os.tmpdir(), 'nonexistent', 'test.sqlite3');
      
      const db = dbManager.initDatabase(nonExistentDir);
      
      expect(fs.existsSync(path.dirname(nonExistentDir))).toBe(true);
      db.close();
      
      // Clean up
      fs.unlinkSync(nonExistentDir);
      fs.rmdirSync(path.dirname(nonExistentDir));
    });
  });
});