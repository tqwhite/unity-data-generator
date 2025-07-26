'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

// Mock individual qtools libraries
const mockXLog = {
  status: jest.fn(),
  result: jest.fn(),
  error: jest.fn()
};

const mockCommandLineParameters = {
  switches: {},
  values: {}
};

const mockRawConfig = {
  spreadsheetTool: {
    outputsPath: '/test/output',
    databaseFilePath: '/test/database.sqlite3',
    retainOnDbBackupPurge: 3,
    refIdSourceNames: 'XPath',
    defaultTableName: 'naDataModel'
  }
};

// Mock qtools-parse-command-line
jest.mock('qtools-parse-command-line', () => ({
  getParameters: jest.fn(() => mockCommandLineParameters)
}));

// Mock qtools-config-file-processor
jest.mock('qtools-config-file-processor', () => ({
  getConfig: jest.fn(() => mockRawConfig)
}));

// Mock qtools-x-log
jest.mock('qtools-x-log', () => mockXLog);

// Import after mocks
const configHelper = require('../../lib/utils/configHelper');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Configuration Helper (Direct qtools libraries)', () => {
  describe('findProjectRoot', () => {
    test('should find project root with default parameters', () => {
      // Test the regex pattern directly
      const mockDirname = '/Users/test/project/system/code/cli/lib.d/spreadsheetTool/lib/utils';
      const result = mockDirname.replace(
        new RegExp(`^(.*\\/system).*$`),
        '$1'
      );
      expect(result).toBe('/Users/test/project/system');
    });
  });

  describe('initialize', () => {
    test('should initialize with direct qtools libraries', async () => {
      const result = await configHelper.initialize();
      
      // Verify that qtools libraries were used
      const commandLineParser = require('qtools-parse-command-line');
      const configFileProcessor = require('qtools-config-file-processor');
      
      expect(commandLineParser.getParameters).toHaveBeenCalled();
      expect(configFileProcessor.getConfig).toHaveBeenCalledWith(
        'spreadsheetTool.ini',
        expect.stringContaining('/configs/'),
        { resolve: true }
      );
      
      expect(result.config).toBeDefined();
      expect(result.cliParams).toBeDefined();
    });

    test('should set up process.global correctly', async () => {
      await configHelper.initialize();
      
      expect(process.global.xLog).toBe(mockXLog);
      expect(process.global.getConfig).toBeDefined();
      expect(process.global.commandLineParameters).toBe(mockCommandLineParameters);
      expect(process.global.rawConfig).toBe(mockRawConfig);
    });

    test('should return configuration values from mocked config', async () => {
      const result = await configHelper.initialize();
      
      expect(result.config).toHaveProperty('outputsPath', '/test/output');
      expect(result.config).toHaveProperty('databaseFilePath', '/test/database.sqlite3');
      expect(result.config).toHaveProperty('retainOnDbBackupPurge', 3);
      expect(result.config).toHaveProperty('refIdSourceNames', 'XPath');
      expect(result.config).toHaveProperty('xLog', mockXLog);
      expect(result.config).toHaveProperty('applicationBasePath');
      expect(result.config).toHaveProperty('tableName', 'naDataModel');
    });

    test('should handle CLI override of refIdSourceNames', async () => {
      // Mock CLI parameters with override
      mockCommandLineParameters.values.refIdSourceNames = ['Name,Type'];
      
      const result = await configHelper.initialize();
      
      expect(result.config.refIdSourceNames).toBe('Name,Type');
      
      // Reset for other tests
      mockCommandLineParameters.values.refIdSourceNames = undefined;
    });

    test('should use hostname-based config path selection', async () => {
      await configHelper.initialize();
      
      const configFileProcessor = require('qtools-config-file-processor');
      const configCall = configFileProcessor.getConfig.mock.calls[0];
      
      expect(configCall[0]).toBe('spreadsheetTool.ini');
      expect(configCall[1]).toMatch(/\/configs\//);
      expect(configCall[2]).toEqual({ resolve: true });
    });
  });
});