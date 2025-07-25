'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const xlsx = require('xlsx');
const excelReader = require('../../lib/spreadsheet/excelReader');

// Mock process.global for testing
const mockXLog = {
  status: jest.fn(),
  result: jest.fn(),
  error: jest.fn(),
  verbose: jest.fn()
};

beforeAll(() => {
  process.global = {
    xLog: mockXLog
  };
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('Excel Reader', () => {
  let testExcelPath;
  
  beforeEach(() => {
    // Create a test Excel file
    testExcelPath = path.join(os.tmpdir(), `test-${Date.now()}.xlsx`);
    
    // Create test data
    const testData = [
      { Name: 'Element1', Type: 'String', XPath: '/test/element1' },
      { Name: 'Element2', Type: 'Number', XPath: '/test/element2' }
    ];
    
    const testData2 = [
      { Name: 'Element3', Type: 'Boolean', XPath: '/test/element3' }
    ];
    
    // Create workbook with multiple sheets
    const workbook = xlsx.utils.book_new();
    const sheet1 = xlsx.utils.json_to_sheet(testData);
    const sheet2 = xlsx.utils.json_to_sheet(testData2);
    
    xlsx.utils.book_append_sheet(workbook, sheet1, 'Sheet1');
    xlsx.utils.book_append_sheet(workbook, sheet2, 'Sheet2');
    
    xlsx.writeFile(workbook, testExcelPath);
  });
  
  afterEach(() => {
    // Clean up test file
    if (fs.existsSync(testExcelPath)) {
      fs.unlinkSync(testExcelPath);
    }
  });

  describe('listSheets', () => {
    test('should list all sheets in a spreadsheet', async () => {
      const sheets = await excelReader.listSheets(testExcelPath);
      
      expect(sheets).toEqual(['Sheet1', 'Sheet2']);
      expect(mockXLog.result).toHaveBeenCalledWith('Available sheets:');
      expect(mockXLog.result).toHaveBeenCalledWith('  - Sheet1');
      expect(mockXLog.result).toHaveBeenCalledWith('  - Sheet2');
    });

    test('should throw error if file does not exist', async () => {
      const nonExistentPath = '/path/to/nonexistent/file.xlsx';
      
      await expect(excelReader.listSheets(nonExistentPath))
        .rejects.toThrow(`Spreadsheet file not found: ${nonExistentPath}`);
    });
  });

  describe('readSpreadsheet', () => {
    test('should read all sheets from spreadsheet', async () => {
      const result = await excelReader.readSpreadsheet(testExcelPath);
      
      expect(result.metadata.fileName).toBe(path.basename(testExcelPath));
      expect(result.metadata.totalSheets).toBe(2);
      expect(result.metadata.totalRows).toBe(3); // 2 + 1 from each sheet
      expect(result.metadata.columns).toEqual(expect.arrayContaining(['Name', 'Type', 'XPath']));
      
      expect(result.data).toHaveLength(3);
      expect(result.data[0].SheetName).toBe('Sheet1');
      expect(result.data[1].SheetName).toBe('Sheet1');
      expect(result.data[2].SheetName).toBe('Sheet2');
    });

    test('should add SheetName to each row', async () => {
      const result = await excelReader.readSpreadsheet(testExcelPath);
      
      result.data.forEach(row => {
        expect(row.SheetName).toBeDefined();
        expect(['Sheet1', 'Sheet2']).toContain(row.SheetName);
      });
    });

    test('should collect all unique columns across sheets', async () => {
      // Create a more complex test file with different columns
      const complexTestPath = path.join(os.tmpdir(), `complex-test-${Date.now()}.xlsx`);
      
      const sheet1Data = [
        { Name: 'Element1', Type: 'String', Description: 'First element' }
      ];
      
      const sheet2Data = [
        { Name: 'Element2', Category: 'Test', XPath: '/test/element2' }
      ];
      
      const workbook = xlsx.utils.book_new();
      const sheet1 = xlsx.utils.json_to_sheet(sheet1Data);
      const sheet2 = xlsx.utils.json_to_sheet(sheet2Data);
      
      xlsx.utils.book_append_sheet(workbook, sheet1, 'Sheet1');
      xlsx.utils.book_append_sheet(workbook, sheet2, 'Sheet2');
      
      xlsx.writeFile(workbook, complexTestPath);
      
      try {
        const result = await excelReader.readSpreadsheet(complexTestPath);
        
        expect(result.metadata.columns).toEqual(
          expect.arrayContaining(['Name', 'Type', 'Description', 'Category', 'XPath'])
        );
      } finally {
        if (fs.existsSync(complexTestPath)) {
          fs.unlinkSync(complexTestPath);
        }
      }
    });

    test('should skip empty sheets', async () => {
      // Create a test file with an empty sheet
      const emptySheetPath = path.join(os.tmpdir(), `empty-sheet-test-${Date.now()}.xlsx`);
      
      const workbook = xlsx.utils.book_new();
      const sheet1 = xlsx.utils.json_to_sheet([{ Name: 'Element1' }]);
      const emptySheet = xlsx.utils.json_to_sheet([]);
      
      xlsx.utils.book_append_sheet(workbook, sheet1, 'Sheet1');
      xlsx.utils.book_append_sheet(workbook, emptySheet, 'EmptySheet');
      
      xlsx.writeFile(workbook, emptySheetPath);
      
      try {
        const result = await excelReader.readSpreadsheet(emptySheetPath);
        
        expect(result.data).toHaveLength(1);
        expect(result.data[0].SheetName).toBe('Sheet1');
        expect(mockXLog.verbose).toHaveBeenCalledWith('Processed sheet: Sheet1 (1 rows)');
        expect(mockXLog.status).not.toHaveBeenCalledWith(expect.stringContaining('EmptySheet'));
      } finally {
        if (fs.existsSync(emptySheetPath)) {
          fs.unlinkSync(emptySheetPath);
        }
      }
    });

    test('should throw error if file does not exist', async () => {
      const nonExistentPath = '/path/to/nonexistent/file.xlsx';
      
      await expect(excelReader.readSpreadsheet(nonExistentPath))
        .rejects.toThrow(`Spreadsheet file not found: ${nonExistentPath}`);
    });

    test('should log processing status for each sheet', async () => {
      await excelReader.readSpreadsheet(testExcelPath);
      
      expect(mockXLog.status).toHaveBeenCalledWith(expect.stringContaining('Processing spreadsheet:'));
      expect(mockXLog.verbose).toHaveBeenCalledWith('Processed sheet: Sheet1 (2 rows)');
      expect(mockXLog.verbose).toHaveBeenCalledWith('Processed sheet: Sheet2 (1 rows)');
    });
  });
});