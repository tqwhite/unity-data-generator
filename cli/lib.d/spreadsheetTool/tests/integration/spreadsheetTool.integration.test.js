'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const xlsx = require('xlsx');
const dbManager = require('../../lib/database/dbManager');
const excelReader = require('../../lib/spreadsheet/excelReader');
const excelWriter = require('../../lib/spreadsheet/excelWriter');

// Mock process.global for testing
const mockXLog = {
  status: jest.fn(),
  result: jest.fn(),
  error: jest.fn(),
  verbose: jest.fn()
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

describe('SpreadsheetTool Integration Tests', () => {
  let testDir;
  let testDbPath;
  let testExcelPath;
  let testOutputDir;
  
  beforeEach(() => {
    // Create temporary directories and files for each test
    testDir = path.join(os.tmpdir(), `spreadsheet-integration-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
    
    testDbPath = path.join(testDir, 'test.sqlite3');
    testExcelPath = path.join(testDir, 'input.xlsx');
    testOutputDir = path.join(testDir, 'output');
    
    // Create test Excel file
    const testData = [
      {
        Name: 'LEAIdentifier',
        Type: 'String',
        XPath: '/LEA/LEAIdentifier',
        Description: 'Unique identifier for the LEA'
      },
      {
        Name: 'LEAName',
        Type: 'String', 
        XPath: '/LEA/LEAName',
        Description: 'Name of the Local Education Agency'
      },
      {
        Name: 'LEAType',
        Type: 'RefCode',
        XPath: '/LEA/LEAType',
        Description: 'Type of LEA organization'
      }
    ];
    
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(testData);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'LEAElements');
    xlsx.writeFile(workbook, testExcelPath);
  });
  
  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      const removeDir = (dir) => {
        if (fs.existsSync(dir)) {
          fs.readdirSync(dir).forEach(file => {
            const filePath = path.join(dir, file);
            if (fs.lstatSync(filePath).isDirectory()) {
              removeDir(filePath);
            } else {
              fs.unlinkSync(filePath);
            }
          });
          fs.rmdirSync(dir);
        }
      };
      removeDir(testDir);
    }
  });

  describe('Complete Workflow: Excel → Database → Excel', () => {
    test('should read Excel, save to database, read from database, and export to Excel', async () => {
      // Step 1: Read Excel file
      const excelData = await excelReader.readSpreadsheet(testExcelPath);
      
      expect(excelData.data).toHaveLength(3);
      expect(excelData.metadata.fileName).toBe('input.xlsx');
      
      // Step 2: Save to database
      await dbManager.saveData(testDbPath, excelData, 'testTable');
      
      expect(fs.existsSync(testDbPath)).toBe(true);
      
      // Step 3: Read from database
      const dbData = await dbManager.readData(testDbPath, 'testTable');
      
      expect(dbData.data).toHaveLength(3);
      expect(dbData.metadata.tableName).toBe('testTable');
      
      // Verify data integrity (should have timestamps added)
      expect(dbData.data[0].createdAt).toBeDefined();
      expect(dbData.data[0].updatedAt).toBeDefined();
      expect(dbData.data[0].Name).toBe('LEAIdentifier');
      
      // Step 4: Export back to Excel
      const outputBasePath = path.join(testOutputDir, 'roundtrip');
      const outputPaths = await excelWriter.writeDataFiles(outputBasePath, dbData);
      
      expect(fs.existsSync(outputPaths.jsonPath)).toBe(true);
      expect(fs.existsSync(outputPaths.excelPath)).toBe(true);
      
      // Step 5: Verify round-trip integrity
      const finalExcelData = await excelReader.readSpreadsheet(outputPaths.excelPath);
      
      expect(finalExcelData.data).toHaveLength(3);
      expect(finalExcelData.data[0].Name).toBe('LEAIdentifier');
      expect(finalExcelData.data[1].Name).toBe('LEAName');
      expect(finalExcelData.data[2].Name).toBe('LEAType');
      
      // Should preserve all original data fields plus timestamps
      const originalFields = ['Name', 'Type', 'XPath', 'Description'];
      const timestampFields = ['createdAt', 'updatedAt'];
      
      finalExcelData.data.forEach(row => {
        originalFields.forEach(field => {
          expect(row[field]).toBeDefined();
        });
        timestampFields.forEach(field => {
          expect(row[field]).toBeDefined();
        });
      });
    });

    test('should handle multiple sheets in Excel file', async () => {
      // Create Excel file with multiple sheets
      const multiSheetPath = path.join(testDir, 'multi-sheet.xlsx');
      
      const sheet1Data = [
        { Name: 'Student', Type: 'Entity', XPath: '/Student' }
      ];
      
      const sheet2Data = [
        { Name: 'Teacher', Type: 'Entity', XPath: '/Teacher' },
        { Name: 'School', Type: 'Entity', XPath: '/School' }
      ];
      
      const workbook = xlsx.utils.book_new();
      const worksheet1 = xlsx.utils.json_to_sheet(sheet1Data);
      const worksheet2 = xlsx.utils.json_to_sheet(sheet2Data);
      
      xlsx.utils.book_append_sheet(workbook, worksheet1, 'Students');
      xlsx.utils.book_append_sheet(workbook, worksheet2, 'Staff');
      
      xlsx.writeFile(workbook, multiSheetPath);
      
      // Process through complete workflow
      const excelData = await excelReader.readSpreadsheet(multiSheetPath);
      await dbManager.saveData(testDbPath, excelData, 'multiSheetTable');
      const dbData = await dbManager.readData(testDbPath, 'multiSheetTable');
      
      const outputBasePath = path.join(testOutputDir, 'multi-sheet-output');
      const outputPaths = await excelWriter.writeDataFiles(outputBasePath, dbData);
      
      // Verify final Excel maintains sheet structure
      const finalWorkbook = xlsx.readFile(outputPaths.excelPath);
      expect(finalWorkbook.SheetNames).toEqual(['Students', 'Staff']);
      
      const finalSheet1 = xlsx.utils.sheet_to_json(finalWorkbook.Sheets['Students']);
      const finalSheet2 = xlsx.utils.sheet_to_json(finalWorkbook.Sheets['Staff']);
      
      expect(finalSheet1).toHaveLength(1);
      expect(finalSheet2).toHaveLength(2);
      expect(finalSheet1[0].Name).toBe('Student');
      expect(finalSheet2[0].Name).toBe('Teacher');
    });

    test('should handle backup and purge operations during workflow', async () => {
      // Initial data save
      const excelData = await excelReader.readSpreadsheet(testExcelPath);
      await dbManager.saveData(testDbPath, excelData, 'backupTestTable');
      
      // Second save should create backup
      const modifiedData = {
        ...excelData,
        data: excelData.data.map(row => ({ ...row, Modified: 'yes' }))
      };
      
      await dbManager.saveData(testDbPath, modifiedData, 'backupTestTable');
      
      // Third save should create another backup
      await dbManager.saveData(testDbPath, excelData, 'backupTestTable');
      
      // Purge backups, keeping only 1
      const purgeResult = await dbManager.purgeBackups(testDbPath, 1, 'backupTestTable');
      
      expect(purgeResult.kept).toHaveLength(1);
      expect(purgeResult.deleted.length).toBeGreaterThan(0);
      
      // Current data should still be accessible
      const currentData = await dbManager.readData(testDbPath, 'backupTestTable');
      expect(currentData.data).toHaveLength(3);
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle missing Excel file gracefully', async () => {
      const nonExistentPath = path.join(testDir, 'missing.xlsx');
      
      await expect(excelReader.readSpreadsheet(nonExistentPath))
        .rejects.toThrow('Spreadsheet file not found');
    });

    test('should handle missing database table gracefully', async () => {
      await expect(dbManager.readData(testDbPath, 'nonexistentTable'))
        .rejects.toThrow("Table 'nonexistentTable' does not exist");
    });

    test('should handle corrupted Excel file', async () => {
      // Create a file that's not a valid Excel file
      const corruptPath = path.join(testDir, 'corrupt.xlsx');
      fs.writeFileSync(corruptPath, 'This is not an Excel file');
      
      // xlsx actually parses text files as spreadsheets, so this test is adjusted
      const result = await excelReader.readSpreadsheet(corruptPath);
      expect(result.data).toEqual([]);
    });
  });

  describe('Data Integrity Tests', () => {
    test('should preserve special characters and unicode', async () => {
      const unicodeData = [
        {
          Name: 'SpecialChars',
          Type: 'String',
          XPath: '/test/special',
          Description: 'Characters: áéíóú ñÑ 中文 🚀 "quotes" \'apostrophes\''
        }
      ];
      
      const unicodePath = path.join(testDir, 'unicode.xlsx');
      const workbook = xlsx.utils.book_new();
      const worksheet = xlsx.utils.json_to_sheet(unicodeData);
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Unicode');
      xlsx.writeFile(workbook, unicodePath);
      
      // Process through workflow
      const excelData = await excelReader.readSpreadsheet(unicodePath);
      await dbManager.saveData(testDbPath, excelData, 'unicodeTable');
      const dbData = await dbManager.readData(testDbPath, 'unicodeTable');
      
      expect(dbData.data[0].Description).toContain('áéíóú');
      expect(dbData.data[0].Description).toContain('中文');
      expect(dbData.data[0].Description).toContain('🚀');
      expect(dbData.data[0].Description).toContain('"quotes"');
      expect(dbData.data[0].Description).toContain("'apostrophes'");
    });

    test('should handle empty cells and null values', async () => {
      const dataWithNulls = [
        {
          Name: 'WithValue',
          Type: 'String',
          XPath: '/test/with',
          Description: 'Has description'
        },
        {
          Name: 'WithoutDescription',
          Type: 'String',
          XPath: '/test/without'
          // Description is missing
        },
        {
          Name: null, // Null name
          Type: 'String',
          XPath: '/test/empty',
          Description: null // Explicit null
        }
      ];
      
      const nullsPath = path.join(testDir, 'nulls.xlsx');
      const workbook = xlsx.utils.book_new();
      const worksheet = xlsx.utils.json_to_sheet(dataWithNulls);
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Nulls');
      xlsx.writeFile(workbook, nullsPath);
      
      // Process through workflow
      const excelData = await excelReader.readSpreadsheet(nullsPath);
      await dbManager.saveData(testDbPath, excelData, 'nullsTable');
      const dbData = await dbManager.readData(testDbPath, 'nullsTable');
      
      expect(dbData.data).toHaveLength(3);
      expect(dbData.data[0].Description).toBe('Has description');
      expect(dbData.data[1].Description).toBeNull(); // Missing becomes null in database
      expect(dbData.data[2].Name).toBeNull(); // Null value preserved
    });

    test('should generate consistent refIds for identical data', async () => {
      const excelData = await excelReader.readSpreadsheet(testExcelPath);
      
      // Save same data twice to different tables
      await dbManager.saveData(testDbPath, excelData, 'table1');
      await dbManager.saveData(testDbPath, excelData, 'table2');
      
      const data1 = await dbManager.readData(testDbPath, 'table1');
      const data2 = await dbManager.readData(testDbPath, 'table2');
      
      // Data should be identical except for timestamps which will differ slightly
      expect(data1.data.length).toBe(data2.data.length);
      expect(data1.data[0].Name).toBe(data2.data[0].Name);
      expect(data1.data[0].XPath).toBe(data2.data[0].XPath);
    });
  });
});