'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const xlsx = require('xlsx');
const excelWriter = require('../../lib/spreadsheet/excelWriter');

// Mock process.global for testing
const mockXLog = {
  status: jest.fn(),
  result: jest.fn(),
  error: jest.fn()
};

beforeAll(() => {
  process.global = {
    xLog: mockXLog,
    commandLineParameters: {
      switches: {}
    }
  };
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('Excel Writer', () => {
  let testOutputDir;
  let testData;
  
  beforeEach(() => {
    testOutputDir = path.join(os.tmpdir(), `test-output-${Date.now()}`);
    
    testData = {
      metadata: {
        source: 'Database',
        tableName: 'testTable',
        totalRows: 3,
        columns: ['Name', 'Type', 'XPath']
      },
      data: [
        {
          Name: 'Element1',
          Type: 'String',
          XPath: '/test/element1',
          SheetName: 'Sheet1',
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z'
        },
        {
          Name: 'Element2',
          Type: 'Number',
          XPath: '/test/element2',
          SheetName: 'Sheet1',
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z'
        },
        {
          Name: 'Element3',
          Type: 'Boolean',
          XPath: '/test/element3',
          SheetName: 'Sheet2',
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z'
        }
      ]
    };
  });
  
  afterEach(() => {
    // Clean up test directory recursively
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
    
    if (fs.existsSync(testOutputDir)) {
      removeDir(testOutputDir);
    }
  });

  describe('writeJsonFile', () => {
    test('should write data to JSON file', async () => {
      const jsonPath = path.join(testOutputDir, 'test.json');
      
      await excelWriter.writeJsonFile(jsonPath, testData);
      
      expect(fs.existsSync(jsonPath)).toBe(true);
      expect(mockXLog.status).toHaveBeenCalledWith(`JSON output written to: ${jsonPath}`);
      
      // Verify content
      const savedData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      expect(savedData).toEqual(testData);
    });

    test('should create output directory if it does not exist', async () => {
      const deepPath = path.join(testOutputDir, 'deep', 'nested', 'path', 'test.json');
      
      await excelWriter.writeJsonFile(deepPath, testData);
      
      expect(fs.existsSync(deepPath)).toBe(true);
    });

    test('should echo to console if echoAlso switch is set', async () => {
      process.global.commandLineParameters.switches.echoAlso = true;
      const jsonPath = path.join(testOutputDir, 'test.json');
      
      await excelWriter.writeJsonFile(jsonPath, testData);
      
      expect(mockXLog.result).toHaveBeenCalledWith(expect.stringContaining(JSON.stringify(testData, null, 2)));
      
      // Clean up
      process.global.commandLineParameters.switches.echoAlso = false;
    });

    test('should format JSON with proper indentation', async () => {
      const jsonPath = path.join(testOutputDir, 'test.json');
      
      await excelWriter.writeJsonFile(jsonPath, testData);
      
      const fileContent = fs.readFileSync(jsonPath, 'utf-8');
      expect(fileContent).toContain('  "metadata"');
      expect(fileContent).toContain('    "source"');
    });
  });

  describe('writeExcelFile', () => {
    test('should write data to Excel file', async () => {
      const excelPath = path.join(testOutputDir, 'test.xlsx');
      
      await excelWriter.writeExcelFile(excelPath, testData);
      
      expect(fs.existsSync(excelPath)).toBe(true);
      expect(mockXLog.status).toHaveBeenCalledWith(`Excel file generated at: ${excelPath}`);
    });

    test('should create separate sheets based on SheetName', async () => {
      const excelPath = path.join(testOutputDir, 'test.xlsx');
      
      await excelWriter.writeExcelFile(excelPath, testData);
      
      // Read the created file and verify structure
      const workbook = xlsx.readFile(excelPath);
      expect(workbook.SheetNames).toEqual(['Sheet1', 'Sheet2']);
      
      const sheet1Data = xlsx.utils.sheet_to_json(workbook.Sheets['Sheet1']);
      const sheet2Data = xlsx.utils.sheet_to_json(workbook.Sheets['Sheet2']);
      
      expect(sheet1Data).toHaveLength(2);
      expect(sheet2Data).toHaveLength(1);
      
      // Verify SheetName property is removed from data
      expect(sheet1Data[0].SheetName).toBeUndefined();
      expect(sheet2Data[0].SheetName).toBeUndefined();
    });

    test('should handle data without SheetName (use Default)', async () => {
      const dataWithoutSheetName = {
        ...testData,
        data: testData.data.map(row => {
          const { SheetName, ...rest } = row;
          return rest;
        })
      };
      
      const excelPath = path.join(testOutputDir, 'test.xlsx');
      
      await excelWriter.writeExcelFile(excelPath, dataWithoutSheetName);
      
      const workbook = xlsx.readFile(excelPath);
      expect(workbook.SheetNames).toEqual(['Default']);
      
      const defaultSheetData = xlsx.utils.sheet_to_json(workbook.Sheets['Default']);
      expect(defaultSheetData).toHaveLength(3);
    });

    test('should sanitize invalid Excel sheet names', async () => {
      const dataWithInvalidSheetName = {
        ...testData,
        data: [{
          Name: 'Element1',
          Type: 'String',
          SheetName: 'Invalid[Sheet*Name]/With?Special:Chars\\And>31CharacterNameThatIsTooLong'
        }]
      };
      
      const excelPath = path.join(testOutputDir, 'test.xlsx');
      
      await excelWriter.writeExcelFile(excelPath, dataWithInvalidSheetName);
      
      const workbook = xlsx.readFile(excelPath);
      expect(workbook.SheetNames[0]).toBe('Invalid_Sheet_Name__With_Specia');
      expect(workbook.SheetNames[0].length).toBeLessThanOrEqual(31);
    });

    test('should log sheet creation status', async () => {
      const excelPath = path.join(testOutputDir, 'test.xlsx');
      
      await excelWriter.writeExcelFile(excelPath, testData);
      
      expect(mockXLog.status).toHaveBeenCalledWith('Added sheet: Sheet1 with 2 rows');
      expect(mockXLog.status).toHaveBeenCalledWith('Added sheet: Sheet2 with 1 rows');
    });
  });

  describe('writeDataFiles', () => {
    test('should write both JSON and Excel files', async () => {
      const basePath = path.join(testOutputDir, 'output');
      
      const result = await excelWriter.writeDataFiles(basePath, testData);
      
      expect(result.jsonPath).toBe(`${basePath}.json`);
      expect(result.excelPath).toBe(`${basePath}_generated.xlsx`);
      
      expect(fs.existsSync(result.jsonPath)).toBe(true);
      expect(fs.existsSync(result.excelPath)).toBe(true);
    });

    test('should return paths to created files', async () => {
      const basePath = path.join(testOutputDir, 'output');
      
      const result = await excelWriter.writeDataFiles(basePath, testData);
      
      expect(result).toHaveProperty('jsonPath');
      expect(result).toHaveProperty('excelPath');
      expect(typeof result.jsonPath).toBe('string');
      expect(typeof result.excelPath).toBe('string');
    });

    test('should create directory for output files', async () => {
      const basePath = path.join(testOutputDir, 'nested', 'path', 'output');
      
      await excelWriter.writeDataFiles(basePath, testData);
      
      expect(fs.existsSync(`${basePath}.json`)).toBe(true);
      expect(fs.existsSync(`${basePath}_generated.xlsx`)).toBe(true);
    });
  });
});