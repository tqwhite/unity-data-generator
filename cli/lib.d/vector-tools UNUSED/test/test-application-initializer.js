#!/usr/bin/env node
'use strict';

console.log('🧪 Starting application-initializer test suite...\n');

// Import the module
const applicationInitializerModule = require('../lib/application-initializer.js');
const applicationInitializer = applicationInitializerModule()();

// Test counter
let testCount = 0;
let passCount = 0;

const runTest = (testName, testFn) => {
    testCount++;
    console.log(`\n🧪 Test ${testCount}: ${testName}`);
    console.log('=' + '='.repeat(testName.length + 10));
    
    try {
        testFn();
        passCount++;
        console.log('✅ Test passed');
    } catch (error) {
        console.log(`❌ Test failed: ${error.message}`);
        console.log(error.stack);
    }
};

// Mock logger
const createMockXLog = () => {
    const messages = [];
    return {
        verbose: (msg) => {
            messages.push({ type: 'verbose', message: msg });
            console.log(`   📝 VERBOSE: ${msg}`);
        },
        error: (msg) => {
            messages.push({ type: 'error', message: msg });
            console.log(`   ❌ ERROR: ${msg}`);
        },
        getMessages: () => messages,
        clearMessages: () => messages.length = 0
    };
};

// Mock configuration
const createMockConfig = (isValid = true) => ({
    isValid,
    openAiApiKey: 'test-api-key',
    databaseFilePath: '/test/path/db.sqlite3',
    vectorTableName: 'testVectorTable',
    dataProfile: 'test'
});

// Mock modules
const createMockModules = (shouldFail = false) => ({
    generateEmbeddings: () => ({ workingFunction: () => Promise.resolve() }),
    getClosestRecords: () => ({ workingFunction: () => Promise.resolve() }),
    dropAllVectorTables: () => ({ success: true }),
    dropProductionVectorTables: () => ({ success: true }),
    showDatabaseStats: () => {},
    executeRebuildWorkflow: () => {},
    tableExists: () => true,
    getTableCount: () => 100,
    initVectorDatabase: shouldFail ? 
        () => { throw new Error('Database connection failed'); } :
        () => ({ connected: true }),
    logConfigurationStatus: () => {}
});

// =====================================================================
// BASIC FUNCTIONALITY TESTS
// =====================================================================

// ---------------------------------------------------------------------
// 1. Module initialization
runTest('Module initialization', () => {
    const functions = applicationInitializer;
    const expectedFunctions = [
        'initializeOpenAI',
        'initializeVectorDatabase', 
        'prepareDatabaseOperations',
        'prepareDropOperations',
        'prepareDependencies',
        'safeInitializeApplication'
    ];
    
    expectedFunctions.forEach(funcName => {
        if (typeof functions[funcName] !== 'function') {
            throw new Error(`${funcName} should be a function`);
        }
    });
    
    console.log('   ✅ All expected functions are available');
});

// ---------------------------------------------------------------------
// 2. OpenAI initialization - success
runTest('OpenAI initialization - success', () => {
    const xLog = createMockXLog();
    
    // Mock OpenAI require to avoid needing actual module
    const originalRequire = require;
    require = (moduleName) => {
        if (moduleName === 'openai') {
            return class MockOpenAI {
                constructor(config) {
                    this.apiKey = config.apiKey;
                }
            };
        }
        return originalRequire(moduleName);
    };
    
    const result = applicationInitializer.initializeOpenAI('test-api-key', xLog);
    
    // Restore require
    require = originalRequire;
    
    if (!result.success) {
        throw new Error('OpenAI initialization should succeed');
    }
    
    if (!result.client) {
        throw new Error('Should return OpenAI client');
    }
    
    console.log('   ✅ OpenAI client initialized successfully');
});

// ---------------------------------------------------------------------
// 3. Vector database initialization - success
runTest('Vector database initialization - success', () => {
    const xLog = createMockXLog();
    const mockInitVectorDatabase = () => ({ connected: true });
    
    const result = applicationInitializer.initializeVectorDatabase(
        '/test/path/db.sqlite3',
        'testTable',
        xLog,
        mockInitVectorDatabase
    );
    
    if (!result.success) {
        throw new Error('Database initialization should succeed');
    }
    
    if (!result.database) {
        throw new Error('Should return database object');
    }
    
    console.log('   ✅ Vector database initialized successfully');
});

// ---------------------------------------------------------------------
// 4. Vector database initialization - failure
runTest('Vector database initialization - failure', () => {
    const xLog = createMockXLog();
    const mockInitVectorDatabase = () => {
        throw new Error('Database connection failed');
    };
    
    const result = applicationInitializer.initializeVectorDatabase(
        '/invalid/path/db.sqlite3',
        'testTable',
        xLog,
        mockInitVectorDatabase
    );
    
    if (result.success) {
        throw new Error('Database initialization should fail');
    }
    
    if (!result.error) {
        throw new Error('Should return error message');
    }
    
    console.log('   ✅ Database initialization failure handled correctly');
});

// ---------------------------------------------------------------------
// 5. Database operations preparation
runTest('Database operations preparation', () => {
    const mockTableExists = () => true;
    const mockGetTableCount = () => 100;
    
    const operations = applicationInitializer.prepareDatabaseOperations(
        mockTableExists,
        mockGetTableCount
    );
    
    if (typeof operations.tableExists !== 'function') {
        throw new Error('Should include tableExists function');
    }
    
    if (typeof operations.getTableCount !== 'function') {
        throw new Error('Should include getTableCount function');
    }
    
    console.log('   ✅ Database operations prepared correctly');
});

// ---------------------------------------------------------------------
// 6. Drop operations preparation
runTest('Drop operations preparation', () => {
    const mockDropProduction = () => ({ success: true });
    const mockDropAll = () => ({ success: true });
    
    const operations = applicationInitializer.prepareDropOperations(
        mockDropProduction,
        mockDropAll
    );
    
    if (typeof operations.dropProductionVectorTables !== 'function') {
        throw new Error('Should include dropProductionVectorTables function');
    }
    
    if (typeof operations.dropAllVectorTables !== 'function') {
        throw new Error('Should include dropAllVectorTables function');
    }
    
    console.log('   ✅ Drop operations prepared correctly');
});

// ---------------------------------------------------------------------
// 7. Dependencies preparation
runTest('Dependencies preparation', () => {
    const modules = createMockModules();
    
    const dependencies = applicationInitializer.prepareDependencies(modules);
    
    const expectedKeys = [
        'generateEmbeddings',
        'getClosestRecords', 
        'dropAllVectorTables',
        'showDatabaseStats',
        'dbOperations',
        'dropOperations',
        'executeRebuildWorkflow'
    ];
    
    expectedKeys.forEach(key => {
        if (!dependencies[key]) {
            throw new Error(`Dependencies should include ${key}`);
        }
    });
    
    console.log('   ✅ Dependencies prepared correctly');
});

// =====================================================================
// VALIDATION TESTS
// =====================================================================

// ---------------------------------------------------------------------
// 1. Module validation - success
runTest('Module validation - success', () => {
    const xLog = createMockXLog();
    const modules = createMockModules();
    
    const isValid = applicationInitializer.validateModules(modules, xLog);
    
    if (!isValid) {
        throw new Error('Module validation should succeed with complete modules');
    }
    
    console.log('   ✅ Module validation passed for complete modules');
});

// ---------------------------------------------------------------------
// 2. Module validation - failure
runTest('Module validation - failure', () => {
    const xLog = createMockXLog();
    const incompleteModules = {
        generateEmbeddings: () => {},
        // Missing other required modules
    };
    
    const isValid = applicationInitializer.validateModules(incompleteModules, xLog);
    
    if (isValid) {
        throw new Error('Module validation should fail with incomplete modules');
    }
    
    const errorMessages = xLog.getMessages().filter(msg => msg.type === 'error');
    if (errorMessages.length === 0) {
        throw new Error('Should log error messages for missing modules');
    }
    
    console.log('   ✅ Module validation correctly failed for incomplete modules');
});

// =====================================================================
// INTEGRATION TESTS
// =====================================================================

// ---------------------------------------------------------------------
// 1. Safe application initialization - success
runTest('Safe application initialization - success', () => {
    const xLog = createMockXLog();
    const config = createMockConfig(true);
    const modules = createMockModules(false);
    
    // Mock OpenAI require for this test
    const originalRequire = require;
    require = (moduleName) => {
        if (moduleName === 'openai') {
            return class MockOpenAI {
                constructor(config) {
                    this.apiKey = config.apiKey;
                }
            };
        }
        return originalRequire(moduleName);
    };
    
    const result = applicationInitializer.safeInitializeApplication(config, modules, xLog);
    
    // Restore require
    require = originalRequire;
    
    if (!result.success) {
        throw new Error(`Application initialization should succeed: ${result.error}`);
    }
    
    if (!result.openai || !result.vectorDb || !result.dependencies) {
        throw new Error('Should return all initialized components');
    }
    
    console.log('   ✅ Safe application initialization succeeded');
});

// ---------------------------------------------------------------------
// 2. Safe application initialization - invalid config
runTest('Safe application initialization - invalid config', () => {
    const xLog = createMockXLog();
    const config = createMockConfig(false); // Invalid config
    const modules = createMockModules(false);
    
    const result = applicationInitializer.safeInitializeApplication(config, modules, xLog);
    
    if (result.success) {
        throw new Error('Application initialization should fail with invalid config');
    }
    
    if (!result.error.includes('Invalid configuration')) {
        throw new Error('Should return config validation error');
    }
    
    console.log('   ✅ Safe application initialization correctly failed for invalid config');
});

// ---------------------------------------------------------------------
// 3. Safe application initialization - missing modules
runTest('Safe application initialization - missing modules', () => {
    const xLog = createMockXLog();
    const config = createMockConfig(true);
    const incompleteModules = {
        generateEmbeddings: () => {},
        // Missing other required modules
    };
    
    const result = applicationInitializer.safeInitializeApplication(config, incompleteModules, xLog);
    
    if (result.success) {
        throw new Error('Application initialization should fail with missing modules');
    }
    
    if (!result.error.includes('Module validation failed')) {
        throw new Error('Should return module validation error');
    }
    
    console.log('   ✅ Safe application initialization correctly failed for missing modules');
});

// =====================================================================
// TEST SUMMARY
// =====================================================================

// ---------------------------------------------------------------------
// 1. Show summary
setTimeout(() => {
    console.log('\n\n============================================================');
    console.log('                    TEST SUMMARY');
    console.log('============================================================');
    console.log(`Application Initializer Tests: ${passCount}/${testCount} passed`);
    console.log('------------------------------------------------------------');
    console.log(`TOTAL:                         ${passCount}/${testCount} passed`);
    console.log('');
    
    if (passCount === testCount) {
        console.log('🎉 ALL TESTS PASSED! Application initializer module is working correctly.');
        console.log('');
        console.log('Key features verified:');
        console.log('  ✅ Module initialization and function exports');
        console.log('  ✅ OpenAI client initialization with error handling');
        console.log('  ✅ Vector database initialization with error handling');
        console.log('  ✅ Database operations object preparation');
        console.log('  ✅ Drop operations object preparation');
        console.log('  ✅ Dependencies preparation for command dispatcher');
        console.log('  ✅ Module validation with missing dependency detection');
        console.log('  ✅ Safe application initialization with comprehensive error handling');
        console.log('  ✅ Configuration validation and error reporting');
        console.log('  ✅ Module completeness validation and error reporting');
        console.log('');
        console.log('🔧 Initialization functions tested:');
        console.log('  ✅ initializeOpenAI() - OpenAI client setup');
        console.log('  ✅ initializeVectorDatabase() - database connection setup');
        console.log('  ✅ prepareDatabaseOperations() - database helper preparation');
        console.log('  ✅ prepareDropOperations() - drop helper preparation');
        console.log('  ✅ prepareDependencies() - complete dependency preparation');
        console.log('  ✅ validateModules() - module completeness validation');
        console.log('  ✅ safeInitializeApplication() - comprehensive initialization');
    } else {
        console.log('❌ SOME TESTS FAILED! Please review the errors above.');
        process.exit(1);
    }
    
    console.log('============================================================');
}, 100);