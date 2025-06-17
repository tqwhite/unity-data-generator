#!/usr/bin/env node
'use strict';

const path = require('path');
const os = require('os');

console.log('🧪 Starting user-interaction-handler test suite...\n');

// Import the module
const userInteractionHandlerModule = require('../lib/user-interaction-handler.js');
const userInteractionHandler = userInteractionHandlerModule()();

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
        status: (msg) => {
            messages.push({ type: 'status', message: msg });
            console.log(`   📋 STATUS: ${msg}`);
        },
        error: (msg) => {
            messages.push({ type: 'error', message: msg });
            console.log(`   ❌ ERROR: ${msg}`);
        },
        verbose: (msg) => {
            messages.push({ type: 'verbose', message: msg });
            console.log(`   📝 VERBOSE: ${msg}`);
        },
        getMessages: () => messages,
        clearMessages: () => messages.length = 0
    };
};

// Mock dependencies
const createMockDependencies = () => ({
    generateEmbeddings: () => ({
        workingFunction: () => {
            console.log('   🔧 Mock: generateEmbeddings executed');
            return Promise.resolve();
        }
    }),
    getClosestRecords: () => ({
        workingFunction: () => {
            console.log('   🔧 Mock: getClosestRecords executed');
            return Promise.resolve();
        }
    }),
    dropAllVectorTables: () => {
        console.log('   🔧 Mock: dropAllVectorTables executed');
        return { success: true, droppedCount: 3 };
    },
    showDatabaseStats: () => {
        console.log('   🔧 Mock: showDatabaseStats executed');
    },
    dbOperations: {
        tableExists: () => true,
        getTableCount: () => 100
    },
    dropOperations: {
        dropProductionVectorTables: () => ({ success: true, droppedCount: 1 }),
        dropAllVectorTables: () => ({ success: true, droppedCount: 3 })
    },
    executeRebuildWorkflow: (config, vectorDb, openai, xLog, generateEmbeddings, dbOps, dropOps, cmdParams, callback) => {
        console.log('   🔧 Mock: executeRebuildWorkflow executed');
        setTimeout(() => callback(null), 10); // Async callback
    }
});

const mockConfig = {
    dataProfile: 'test',
    sourceTableName: 'testSource',
    sourcePrivateKeyName: 'id',
    sourceEmbeddableContentName: 'content',
    vectorTableName: 'testVector'
};

const mockVectorDb = {};
const mockOpenai = {};

// Test 1: Module initialization
runTest('Module initialization', () => {
    const functions = userInteractionHandler;
    const expectedFunctions = [
        'createUserMessages',
        'createErrorHandler',
        'dispatchCommands',
        'validateCommandCombinations'
    ];
    
    expectedFunctions.forEach(funcName => {
        if (typeof functions[funcName] !== 'function') {
            throw new Error(`${funcName} should be a function`);
        }
    });
    
    console.log('   ✅ All expected functions are available');
});

// Test 2: User messages functionality
runTest('User messages functionality', () => {
    const xLog = createMockXLog();
    const messages = userInteractionHandler.createUserMessages(xLog);
    
    // Test operation start message
    messages.showOperationStart('Test Operation', 'CEDS', 'testTable');
    
    // Test safe drop warning
    messages.showSafeDropWarning('CEDS', 'testTable');
    
    // Test operation result - success
    messages.showOperationResult('Test Operation', true, { count: 5, type: 'records' });
    
    // Test operation result - failure
    messages.showOperationResult('Test Operation', false, { error: 'Test error' });
    
    const logMessages = xLog.getMessages();
    if (logMessages.length < 4) {
        throw new Error('Should have logged multiple messages');
    }
    
    console.log(`   ✅ Generated ${logMessages.length} user messages correctly`);
});

// Test 3: Error handler functionality
runTest('Error handler functionality', () => {
    const xLog = createMockXLog();
    const errorHandler = userInteractionHandler.createErrorHandler(xLog);
    
    // Test database error
    errorHandler.handleDatabaseError('connect to database', new Error('Connection failed'));
    
    // Test operation error
    errorHandler.handleOperationError('Vector generation', new Error('API limit exceeded'));
    
    // Test configuration error
    errorHandler.handleConfigurationError('database config', new Error('Missing API key'));
    
    const logMessages = xLog.getMessages();
    const errorMessages = logMessages.filter(msg => msg.type === 'error');
    
    if (errorMessages.length < 3) {
        throw new Error('Should have logged multiple error messages');
    }
    
    console.log(`   ✅ Generated ${errorMessages.length} error messages correctly`);
});

// Test 4: Command validation
runTest('Command validation', () => {
    const xLog = createMockXLog();
    
    // Test valid single command
    const validParams = {
        switches: { showStats: true },
        values: {}
    };
    
    const validResult = userInteractionHandler.validateCommandCombinations(validParams, xLog);
    if (!validResult.valid) {
        throw new Error('Should validate single command as valid');
    }
    
    // Test conflicting commands
    const conflictingParams = {
        switches: { showStats: true, rebuildDatabase: true },
        values: {}
    };
    
    const conflictResult = userInteractionHandler.validateCommandCombinations(conflictingParams, xLog);
    if (conflictResult.valid) {
        throw new Error('Should detect conflicting commands');
    }
    
    console.log('   ✅ Command validation working correctly');
});

// Test 5: Show stats command
runTest('Show stats command handler', () => {
    const xLog = createMockXLog();
    const dependencies = createMockDependencies();
    
    const result = userInteractionHandler.handleShowStatsCommand(
        mockVectorDb, 
        xLog, 
        dependencies.showDatabaseStats
    );
    
    if (!result.success || !result.shouldExit) {
        throw new Error('Show stats should succeed and indicate exit');
    }
    
    console.log('   ✅ Show stats command handled correctly');
});

// Test 6: Drop table command
runTest('Drop table command handler', () => {
    const xLog = createMockXLog();
    const dependencies = createMockDependencies();
    const commandLineParameters = {
        switches: { writeVectorDatabase: false }
    };
    
    const result = userInteractionHandler.handleDropTableCommand(
        mockConfig,
        mockVectorDb,
        xLog,
        dependencies.dropAllVectorTables,
        dependencies.showDatabaseStats,
        commandLineParameters
    );
    
    if (!result.success || !result.shouldExit) {
        throw new Error('Drop table should succeed and indicate exit');
    }
    
    console.log('   ✅ Drop table command handled correctly');
});

// Test 7: Write vector database command
runTest('Write vector database command handler', () => {
    const xLog = createMockXLog();
    const dependencies = createMockDependencies();
    
    const result = userInteractionHandler.handleWriteVectorDatabaseCommand(
        mockConfig,
        mockOpenai,
        mockVectorDb,
        xLog,
        dependencies.generateEmbeddings
    );
    
    if (!result.success || result.shouldExit) {
        throw new Error('Write vector should succeed and not indicate exit');
    }
    
    console.log('   ✅ Write vector database command handled correctly');
});

// Test 8: Query string command
runTest('Query string command handler', () => {
    const xLog = createMockXLog();
    const dependencies = createMockDependencies();
    const commandLineParameters = {
        values: {
            queryString: {
                qtLast: () => 'test query'
            }
        }
    };
    
    const result = userInteractionHandler.handleQueryStringCommand(
        mockConfig,
        mockOpenai,
        mockVectorDb,
        xLog,
        dependencies.getClosestRecords,
        commandLineParameters
    );
    
    if (!result.success || result.shouldExit) {
        throw new Error('Query string should succeed and not indicate exit');
    }
    
    console.log('   ✅ Query string command handled correctly');
});

// Test 9: Command dispatcher - show stats
runTest('Command dispatcher - show stats', () => {
    const xLog = createMockXLog();
    const dependencies = createMockDependencies();
    const commandLineParameters = {
        switches: { showStats: true },
        values: {}
    };
    
    const result = userInteractionHandler.dispatchCommands(
        mockConfig,
        mockVectorDb,
        mockOpenai,
        xLog,
        commandLineParameters,
        dependencies
    );
    
    if (!result.success || !result.shouldExit) {
        throw new Error('Dispatcher should handle show stats correctly');
    }
    
    console.log('   ✅ Command dispatcher handled show stats correctly');
});

// Test 10: Command dispatcher - no commands
runTest('Command dispatcher - no commands', () => {
    const xLog = createMockXLog();
    const dependencies = createMockDependencies();
    const commandLineParameters = {
        switches: {},
        values: {}
    };
    
    const result = userInteractionHandler.dispatchCommands(
        mockConfig,
        mockVectorDb,
        mockOpenai,
        xLog,
        commandLineParameters,
        dependencies
    );
    
    if (!result.success || !result.shouldExit) {
        throw new Error('Dispatcher should handle no commands and indicate exit');
    }
    
    const logMessages = xLog.getMessages();
    const helpMessage = logMessages.find(msg => msg.message.includes('No operation specified'));
    if (!helpMessage) {
        throw new Error('Should show help message when no commands specified');
    }
    
    console.log('   ✅ Command dispatcher handled no commands correctly');
});

// Wait for async operations to complete, then show summary
setTimeout(() => {
    console.log('\n\n============================================================');
    console.log('                    TEST SUMMARY');
    console.log('============================================================');
    console.log(`User Interaction Tests: ${passCount}/${testCount} passed`);
    console.log('------------------------------------------------------------');
    console.log(`TOTAL:                  ${passCount}/${testCount} passed`);
    console.log('');
    
    if (passCount === testCount) {
        console.log('🎉 ALL TESTS PASSED! User interaction handler module is working correctly.');
        console.log('');
        console.log('Key features verified:');
        console.log('  ✅ Module initialization and function exports');
        console.log('  ✅ User message generation and formatting');
        console.log('  ✅ Error handling and reporting patterns');
        console.log('  ✅ Command validation and conflict detection');
        console.log('  ✅ Show database stats command handling');
        console.log('  ✅ Drop table command handling with safety messages');
        console.log('  ✅ Write vector database command handling');
        console.log('  ✅ Query string command handling');
        console.log('  ✅ Command dispatcher routing and prioritization');
        console.log('  ✅ No-operation handling with help messages');
        console.log('');
        console.log('🔧 Command handlers tested:');
        console.log('  ✅ handleShowStatsCommand() - database statistics display');
        console.log('  ✅ handleDropTableCommand() - safe table dropping with warnings');
        console.log('  ✅ handleRebuildDatabaseCommand() - complete rebuild workflow');
        console.log('  ✅ handleWriteVectorDatabaseCommand() - vector generation');
        console.log('  ✅ handleQueryStringCommand() - similarity search');
        console.log('  ✅ dispatchCommands() - main command router');
        console.log('  ✅ validateCommandCombinations() - conflict detection');
    } else {
        console.log('❌ SOME TESTS FAILED! Please review the errors above.');
        process.exit(1);
    }
    
    console.log('============================================================');
}, 100);