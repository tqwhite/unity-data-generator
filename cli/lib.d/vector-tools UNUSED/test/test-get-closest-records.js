#!/usr/bin/env node
'use strict';

const path = require('path');
const os = require('os');

console.log('🧪 Starting get-closest-records test suite...\n');

// Import the module
const getClosestRecordsModule = require('../lib/get-closest-records.js');

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

// Mock logger that captures output for testing
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
        result: (msg) => {
            messages.push({ type: 'result', message: msg });
            console.log(`   📊 RESULT: ${msg}`);
        },
        getMessages: () => messages,
        clearMessages: () => messages.length = 0
    };
};

// Mock OpenAI API
const createMockOpenAI = () => {
    return {
        embeddings: {
            create: async (options) => {
                console.log(`   🤖 Mock OpenAI called with: ${options.input}`);
                // Return a mock embedding vector
                return {
                    data: [{
                        embedding: new Array(1536).fill(0).map(() => Math.random() - 0.5)
                    }]
                };
            }
        }
    };
};

// Mock vector database
const createMockVectorDb = () => {
    const mockRows = [
        { GlobalID: '000123', distance: 0.5 },
        { GlobalID: '000456', distance: 0.7 },
        { GlobalID: '000789', distance: 0.9 }
    ];
    
    const mockRecords = {
        '000123': {
            GlobalID: '000123',
            ElementName: 'Test Element 1',
            Definition: 'Test definition 1',
            Format: 'Text',
            HasOptionSet: 0
        },
        '000456': {
            GlobalID: '000456', 
            ElementName: 'Test Element 2',
            Definition: 'Test definition 2',
            Format: 'Numeric',
            HasOptionSet: 1
        },
        '000789': {
            GlobalID: '000789',
            ElementName: 'Test Element 3', 
            Definition: 'Test definition 3',
            Format: 'Option Set',
            HasOptionSet: 1
        }
    };

    return {
        prepare: (query) => {
            console.log(`   🗄️  Mock DB query: ${query}`);
            return {
                all: (vector) => {
                    console.log(`   🔍 Mock vector search with ${vector.length} dimensions`);
                    return mockRows;
                },
                get: (id) => {
                    console.log(`   📄 Mock record lookup for ID: ${id}`);
                    return mockRecords[id] || null;
                }
            };
        }
    };
};

// Setup global mocks
const setupMocks = (jsonMode = false) => {
    const mockXLog = createMockXLog();
    
    // Mock process.global with command line parameters
    global.process.global = {
        xLog: mockXLog,
        getConfig: () => ({}),
        commandLineParameters: {
            switches: {
                json: jsonMode
            },
            values: {
                resultCount: ['3']
            }
        }
    };
    
    return { mockXLog };
};

// =====================================================================
// TESTS
// =====================================================================

runTest('Module loads correctly', () => {
    const module = getClosestRecordsModule;
    
    if (typeof module !== 'function') {
        throw new Error('Module should export a function');
    }
    
    console.log('   ✓ Module exports a function');
});

runTest('Module initialization returns working function', () => {
    const { mockXLog } = setupMocks();
    const mockOpenAI = createMockOpenAI();
    const mockVectorDb = createMockVectorDb();
    
    const getClosestRecords = getClosestRecordsModule({ openai: mockOpenAI, vectorDb: mockVectorDb });
    const { workingFunction } = getClosestRecords;
    
    if (typeof workingFunction !== 'function') {
        throw new Error('workingFunction should be a function');
    }
    
    console.log('   ✓ workingFunction is available');
});

runTest('Standard text output format', async () => {
    const { mockXLog } = setupMocks(false); // json: false
    const mockOpenAI = createMockOpenAI();
    const mockVectorDb = createMockVectorDb();
    
    const embeddingSpecs = {
        sourceTableName: '_CEDSElements',
        vectorTableName: 'cedsElementVectors',
        sourcePrivateKeyName: 'GlobalID',
        sourceEmbeddableContentName: ['Definition']
    };
    
    const getClosestRecords = getClosestRecordsModule({ openai: mockOpenAI, vectorDb: mockVectorDb });
    const { workingFunction } = getClosestRecords;
    
    await workingFunction(embeddingSpecs, 'test query');
    
    const messages = mockXLog.getMessages();
    const resultMessages = messages.filter(m => m.type === 'result');
    
    if (resultMessages.length === 0) {
        throw new Error('Should have result output');
    }
    
    const resultText = resultMessages[0].message;
    
    // Check that output contains numbered list format
    if (!resultText.includes('1. [score:')) {
        throw new Error('Output should contain numbered list format');
    }
    
    // Check that it's NOT JSON
    if (resultText.trim().startsWith('[') || resultText.trim().startsWith('{')) {
        throw new Error('Standard output should not be JSON format');
    }
    
    console.log('   ✓ Standard text output format verified');
    console.log(`   ✓ Result preview: ${resultText.substring(0, 100)}...`);
});

runTest('JSON output format with -json flag', async () => {
    const { mockXLog } = setupMocks(true); // json: true
    const mockOpenAI = createMockOpenAI();
    const mockVectorDb = createMockVectorDb();
    
    const embeddingSpecs = {
        sourceTableName: '_CEDSElements',
        vectorTableName: 'cedsElementVectors', 
        sourcePrivateKeyName: 'GlobalID',
        sourceEmbeddableContentName: ['Definition']
    };
    
    const getClosestRecords = getClosestRecordsModule({ openai: mockOpenAI, vectorDb: mockVectorDb });
    const { workingFunction } = getClosestRecords;
    
    await workingFunction(embeddingSpecs, 'test query');
    
    const messages = mockXLog.getMessages();
    const resultMessages = messages.filter(m => m.type === 'result');
    
    if (resultMessages.length === 0) {
        throw new Error('Should have result output');
    }
    
    const resultText = resultMessages[0].message;
    
    // Check that output is valid JSON
    let parsedResult;
    try {
        parsedResult = JSON.parse(resultText);
    } catch (e) {
        throw new Error(`Output should be valid JSON, got: ${resultText.substring(0, 200)}`);
    }
    
    // Check JSON structure
    if (!Array.isArray(parsedResult)) {
        throw new Error('JSON output should be an array');
    }
    
    if (parsedResult.length === 0) {
        throw new Error('JSON output should contain results');
    }
    
    // Check first result structure
    const firstResult = parsedResult[0];
    if (!firstResult.hasOwnProperty('distance')) {
        throw new Error('JSON results should have distance property');
    }
    
    if (!firstResult.hasOwnProperty('record')) {
        throw new Error('JSON results should have record property');
    }
    
    if (!firstResult.record.hasOwnProperty('GlobalID')) {
        throw new Error('JSON record should have GlobalID property');
    }
    
    console.log('   ✓ JSON output format verified');
    console.log(`   ✓ JSON contains ${parsedResult.length} results`);
    console.log(`   ✓ First result GlobalID: ${firstResult.record.GlobalID}`);
});

runTest('JSON output contains all expected fields', async () => {
    const { mockXLog } = setupMocks(true); // json: true
    const mockOpenAI = createMockOpenAI();
    const mockVectorDb = createMockVectorDb();
    
    const embeddingSpecs = {
        sourceTableName: '_CEDSElements',
        vectorTableName: 'cedsElementVectors',
        sourcePrivateKeyName: 'GlobalID', 
        sourceEmbeddableContentName: ['Definition']
    };
    
    const getClosestRecords = getClosestRecordsModule({ openai: mockOpenAI, vectorDb: mockVectorDb });
    const { workingFunction } = getClosestRecords;
    
    await workingFunction(embeddingSpecs, 'test query');
    
    const messages = mockXLog.getMessages();
    const resultText = messages.filter(m => m.type === 'result')[0].message;
    const parsedResult = JSON.parse(resultText);
    
    const firstResult = parsedResult[0];
    const expectedFields = ['distance', 'record'];
    const expectedRecordFields = ['GlobalID', 'ElementName', 'Definition', 'Format', 'HasOptionSet'];
    
    // Check top-level fields
    for (const field of expectedFields) {
        if (!firstResult.hasOwnProperty(field)) {
            throw new Error(`JSON result should have ${field} field`);
        }
    }
    
    // Check record fields
    for (const field of expectedRecordFields) {
        if (!firstResult.record.hasOwnProperty(field)) {
            throw new Error(`JSON record should have ${field} field`);
        }
    }
    
    // Check data types
    if (typeof firstResult.distance !== 'number') {
        throw new Error('Distance should be a number');
    }
    
    if (typeof firstResult.record !== 'object') {
        throw new Error('Record should be an object');
    }
    
    console.log('   ✓ All expected JSON fields present');
    console.log(`   ✓ Distance type: ${typeof firstResult.distance}`);
    console.log(`   ✓ Record type: ${typeof firstResult.record}`);
});

runTest('Multiple embeddable content fields handling', async () => {
    const { mockXLog } = setupMocks(false);
    const mockOpenAI = createMockOpenAI();
    const mockVectorDb = createMockVectorDb();
    
    const embeddingSpecs = {
        sourceTableName: '_CEDSElements',
        vectorTableName: 'cedsElementVectors',
        sourcePrivateKeyName: 'GlobalID',
        sourceEmbeddableContentName: ['ElementName', 'Definition'] // Multiple fields
    };
    
    const getClosestRecords = getClosestRecordsModule({ openai: mockOpenAI, vectorDb: mockVectorDb });
    const { workingFunction } = getClosestRecords;
    
    await workingFunction(embeddingSpecs, 'test query');
    
    const messages = mockXLog.getMessages();
    const resultText = messages.filter(m => m.type === 'result')[0].message;
    
    // Should contain data from both ElementName and Definition
    if (!resultText.includes('Test Element') || !resultText.includes('Test definition')) {
        throw new Error('Output should include data from multiple embeddable content fields');
    }
    
    console.log('   ✓ Multiple embeddable content fields handled correctly');
});

// =====================================================================
// SUMMARY
// =====================================================================

console.log('\n' + '='.repeat(50));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(50));
console.log(`Total tests: ${testCount}`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${testCount - passCount}`);

if (passCount === testCount) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
} else {
    console.log(`\n❌ ${testCount - passCount} test(s) failed`);
    process.exit(1);
}