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

beforeAll(() => {
  process.global = {
    xLog: mockXLog,
    getConfig: jest.fn((moduleName) => {
      if (moduleName === 'dbManager') {
        return { LEGACY_DEFAULT_TABLE_NAME: 'naDataModel' };
      }
      return {};
    }),
    commandLineParameters: {
      switches: {}
    }
  };
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('RefId Generation with --refIdSourceNames', () => {
  let testDbPath;
  let testData;
  
  beforeEach(() => {
    // Create temporary database file for each test
    testDbPath = path.join(os.tmpdir(), `test-refid-${Date.now()}.sqlite3`);
    
    // Sample test data with multiple fields
    testData = {
      metadata: {
        fileName: 'test.xlsx',
        totalSheets: 1,
        totalRows: 2,
        columns: ['Name', 'Type', 'Category', 'XPath']
      },
      data: [
        {
          Name: 'ProductA',
          Type: 'Electronics',
          Category: 'Widget',
          XPath: '/products/electronics/widget',
          SheetName: 'Products'
        },
        {
          Name: 'ProductB',
          Type: 'Clothing',
          Category: 'Apparel',
          XPath: '/products/clothing/apparel',
          SheetName: 'Products'
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

  describe('Default XPath behavior (backward compatibility)', () => {
    test('should use XPath field by default', async () => {
      await dbManager.saveData(testDbPath, testData, 'testTable');
      const result = await dbManager.readData(testDbPath, 'testTable');
      
      // Should have saved data successfully
      expect(result.data).toHaveLength(2);
      expect(result.data[0].Name).toBe('ProductA');
      expect(result.data[1].Name).toBe('ProductB');
    });

    test('should use XPath field when explicitly specified', async () => {
      await dbManager.saveData(testDbPath, testData, 'testTable', 'XPath');
      const result = await dbManager.readData(testDbPath, 'testTable');
      
      expect(result.data).toHaveLength(2);
      expect(result.data[0].XPath).toBe('/products/electronics/widget');
    });
  });

  describe('Single field refId generation', () => {
    test('should use Name field when specified', async () => {
      await dbManager.saveData(testDbPath, testData, 'testTable', 'Name');
      const result = await dbManager.readData(testDbPath, 'testTable');
      
      expect(result.data).toHaveLength(2);
      expect(result.data[0].Name).toBe('ProductA');
      expect(result.data[1].Name).toBe('ProductB');
    });

    test('should handle non-existent field gracefully', async () => {
      await dbManager.saveData(testDbPath, testData, 'testTable', 'NonExistentField');
      const result = await dbManager.readData(testDbPath, 'testTable');
      
      // Should still save data (uses fallback)
      expect(result.data).toHaveLength(2);
    });
  });

  describe('Multiple field refId generation', () => {
    test('should concatenate multiple fields', async () => {
      await dbManager.saveData(testDbPath, testData, 'testTable', 'Name,Type,Category');
      const result = await dbManager.readData(testDbPath, 'testTable');
      
      expect(result.data).toHaveLength(2);
      expect(result.data[0].Name).toBe('ProductA');
      expect(result.data[0].Type).toBe('Electronics');
      expect(result.data[0].Category).toBe('Widget');
    });

    test('should handle spaces in field list', async () => {
      await dbManager.saveData(testDbPath, testData, 'testTable', 'Name, Type, Category');
      const result = await dbManager.readData(testDbPath, 'testTable');
      
      expect(result.data).toHaveLength(2);
    });

    test('should handle mix of existing and non-existing fields', async () => {
      await dbManager.saveData(testDbPath, testData, 'testTable', 'Name,NonExistent,Type');
      const result = await dbManager.readData(testDbPath, 'testTable');
      
      expect(result.data).toHaveLength(2);
    });
  });

  describe('allExcept functionality', () => {
    test('should use all fields except specified ones', async () => {
      await dbManager.saveData(testDbPath, testData, 'testTable', 'allExcept,SheetName');
      const result = await dbManager.readData(testDbPath, 'testTable');
      
      expect(result.data).toHaveLength(2);
      // Should have used Name, Type, Category, XPath (excluding SheetName)
      expect(result.data[0].Name).toBe('ProductA');
      expect(result.data[0].XPath).toBe('/products/electronics/widget');
    });

    test('should exclude multiple fields with allExcept', async () => {
      await dbManager.saveData(testDbPath, testData, 'testTable', 'allExcept,SheetName,XPath');
      const result = await dbManager.readData(testDbPath, 'testTable');
      
      expect(result.data).toHaveLength(2);
      // Should have used Name, Type, Category (excluding SheetName, XPath)
    });

    test('should handle allExcept with spaces', async () => {
      await dbManager.saveData(testDbPath, testData, 'testTable', 'allExcept, SheetName, XPath');
      const result = await dbManager.readData(testDbPath, 'testTable');
      
      expect(result.data).toHaveLength(2);
    });

    test('should handle allExcept excluding non-existent fields', async () => {
      await dbManager.saveData(testDbPath, testData, 'testTable', 'allExcept,NonExistentField');
      const result = await dbManager.readData(testDbPath, 'testTable');
      
      expect(result.data).toHaveLength(2);
      // Should include all existing fields
    });
  });

  describe('generateRefId function directly', () => {
    test('should generate different refIds for different field combinations', () => {
      const record = {
        Name: 'TestProduct',
        Type: 'TestType',
        XPath: '/test/path'
      };

      const refId1 = dbManager.generateRefId(record, 'XPath');
      const refId2 = dbManager.generateRefId(record, 'Name');
      const refId3 = dbManager.generateRefId(record, 'Name,Type');

      expect(refId1).not.toBe(refId2);
      expect(refId1).not.toBe(refId3);
      expect(refId2).not.toBe(refId3);
    });

    test('should generate consistent refIds for same field combination', () => {
      const record1 = { Name: 'Test', Type: 'A' };
      const record2 = { Name: 'Test', Type: 'A' };

      const refId1 = dbManager.generateRefId(record1, 'Name,Type');
      const refId2 = dbManager.generateRefId(record2, 'Name,Type');

      expect(refId1).toBe(refId2);
    });

    test('should handle allExcept correctly', () => {
      const record = {
        Name: 'Test',
        Type: 'A',
        Category: 'B',
        Exclude: 'X'
      };

      const refId = dbManager.generateRefId(record, 'allExcept,Exclude');
      
      // Should be based on Name, Type, Category (excluding Exclude)
      expect(refId).toMatch(/^\d+$/); // Should be numeric string
    });

    test('should return numeric string format', () => {
      const record = { Name: 'Test' };
      const refId = dbManager.generateRefId(record, 'Name');
      
      expect(typeof refId).toBe('string');
      expect(refId).toMatch(/^\d+$/);
    });

    test('should handle empty field values', () => {
      const record = { Name: '', Type: null, Category: undefined };
      const refId = dbManager.generateRefId(record, 'Name,Type,Category');
      
      expect(typeof refId).toBe('string');
      expect(refId).toMatch(/^\d+$/);
    });
  });

  describe('Edge cases', () => {
    test('should handle empty record', async () => {
      const emptyData = {
        metadata: { fileName: 'empty.xlsx', totalSheets: 1, totalRows: 1, columns: [] },
        data: [{}]
      };

      await dbManager.saveData(testDbPath, emptyData, 'testTable', 'Name');
      const result = await dbManager.readData(testDbPath, 'testTable');
      
      expect(result.data).toHaveLength(1);
    });

    test('should handle record with only excluded fields in allExcept', async () => {
      const limitedData = {
        metadata: { fileName: 'limited.xlsx', totalSheets: 1, totalRows: 1, columns: ['OnlyField'] },
        data: [{ OnlyField: 'value' }]
      };

      await dbManager.saveData(testDbPath, limitedData, 'testTable', 'allExcept,OnlyField');
      const result = await dbManager.readData(testDbPath, 'testTable');
      
      expect(result.data).toHaveLength(1);
    });
  });
});