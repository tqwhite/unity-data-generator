#!/usr/bin/env node
'use strict';

// Test setup similar to existing tests
process.env.NODE_ENV = 'test';
process.noDeprecation = true;

const path = require('path');
const fs = require('fs');

// Mock process.global for testing
process.global = {
	xLog: {
		status: (msg) => console.log(`STATUS: ${msg}`),
		error: (msg) => console.log(`ERROR: ${msg}`),
		debug: (msg) => console.log(`DEBUG: ${msg}`)
	},
	getConfig: (moduleName) => {
		if (moduleName === 'direct-query-tool') {
			return {
				// Test config values
			};
		}
		return {};
	},
	commandLineParameters: {
		values: {
			semanticAnalysisMode: ['simpleVector']
		},
		qtGetSurePath: (path, defaultValue) => {
			if (path === 'values.semanticAnalysisMode[0]') {
				return 'simpleVector';
			}
			return defaultValue;
		}
	}
};

const { directQueryTool, queryTypes } = require('../lib/direct-query-tool/direct-query-tool')({});

// Test configurations
const testConfig = {
	dataProfile: 'ceds',
	sourceTableName: '_CEDSElements',
	vectorTableName: 'cedsElementVectors',
	sourcePrivateKeyName: 'GlobalID'  // Fixed: use the correct property name
};

const testDb = {
	prepare: (query) => {
		console.log(`MOCK DB QUERY: ${query}`);
		return {
			all: () => {
				return [
					{
						GlobalID: '000123',
						Name: 'Test Element',
						Definition: 'Test definition for validation',
						DataType: 'Text',
						vectorRefId: 'vec123',
						factType: 'primary_context',
						semanticCategory: 'Education'
					}
				];
			}
		};
	}
};

// Test suite
console.log('Starting direct-query-tool tests...\n');

let testCount = 0;
let passedTests = 0;

function test(name, testFn) {
	testCount++;
	console.log(`Test ${testCount}: ${name}`);
	
	try {
		testFn();
		passedTests++;
		console.log('✓ PASSED\n');
	} catch (error) {
		console.log(`✗ FAILED: ${error.message}\n`);
	}
}

// Test 1: Query types are properly defined
test('Query types are defined', () => {
	if (!Array.isArray(queryTypes) || queryTypes.length === 0) {
		throw new Error('Query types should be an array with values');
	}
	
	const expectedTypes = ['showAll', 'vectorsOnly', 'sourceOnly'];
	for (const type of expectedTypes) {
		if (!queryTypes.includes(type)) {
			throw new Error(`Missing query type: ${type}`);
		}
	}
});

// Test 2: Direct query tool function exists
test('DirectQueryTool function exists', () => {
	if (typeof directQueryTool !== 'function') {
		throw new Error('directQueryTool should be a function');
	}
});

// Test 3: Validation catches missing parameters
test('Validation catches missing query parameter', () => {
	const originalExit = process.exit;
	let exitCalled = false;
	
	process.exit = (code) => {
		exitCalled = true;
		if (code !== 1) throw new Error(`Expected exit code 1, got ${code}`);
	};
	
	try {
		directQueryTool({
			config: testConfig,
			vectorDb: testDb,
			queryOptions: {
				whereClause: 'createdAt > "2025-07-01"'
				// Missing queryType
			}
		});
		
		if (!exitCalled) {
			throw new Error('Should have called process.exit(1)');
		}
	} finally {
		process.exit = originalExit;
	}
});

// Test 4: Validation catches missing whereClause parameter
test('Validation catches missing whereClause parameter', () => {
	const originalExit = process.exit;
	let exitCalled = false;
	
	process.exit = (code) => {
		exitCalled = true;
		if (code !== 1) throw new Error(`Expected exit code 1, got ${code}`);
	};
	
	try {
		directQueryTool({
			config: testConfig,
			vectorDb: testDb,
			queryOptions: {
				queryType: 'showAll'
				// Missing whereClause
			}
		});
		
		if (!exitCalled) {
			throw new Error('Should have called process.exit(1)');
		}
	} finally {
		process.exit = originalExit;
	}
});

// Test 5: Validation catches invalid query type
test('Validation catches invalid query type', () => {
	const originalExit = process.exit;
	let exitCalled = false;
	
	process.exit = (code) => {
		exitCalled = true;
		if (code !== 1) throw new Error(`Expected exit code 1, got ${code}`);
	};
	
	try {
		directQueryTool({
			config: testConfig,
			vectorDb: testDb,
			queryOptions: {
				queryType: 'invalidType',
				whereClause: 'createdAt > "2025-07-01"'
			}
		});
		
		if (!exitCalled) {
			throw new Error('Should have called process.exit(1)');
		}
	} finally {
		process.exit = originalExit;
	}
});

// Test 6: SQL injection prevention
test('SQL injection prevention works', () => {
	const originalExit = process.exit;
	let exitCalled = false;
	
	process.exit = (code) => {
		exitCalled = true;
		if (code !== 1) throw new Error(`Expected exit code 1, got ${code}`);
	};
	
	try {
		directQueryTool({
			config: testConfig,
			vectorDb: testDb,
			queryOptions: {
				queryType: 'showAll',
				whereClause: 'id = 1; DROP TABLE users; --'
			}
		});
		
		if (!exitCalled) {
			throw new Error('Should have caught SQL injection attempt');
		}
	} finally {
		process.exit = originalExit;
	}
});

// Test 7: Valid query executes successfully  
test('Valid query executes successfully', () => {
	let queryExecuted = false;
	
	const mockDb = {
		prepare: (query) => {
			queryExecuted = true;
			
			// Verify query contains expected elements
			if (!query.includes('SELECT')) {
				throw new Error('Query should contain SELECT');
			}
			if (!query.includes('_CEDSElements')) {
				throw new Error('Query should reference source table');
			}
			if (!query.includes("createdAt > '2025-07-01'")) {
				throw new Error('Query should include sanitized WHERE clause with single quotes');
			}
			
			return {
				all: () => []
			};
		}
	};
	
	directQueryTool({
		config: testConfig,
		vectorDb: mockDb,
		queryOptions: {
			queryType: 'showAll',
			whereClause: 'createdAt > "2025-07-01"',
			resultLimit: 10
		}
	});
	
	if (!queryExecuted) {
		throw new Error('Query should have been executed');
	}
});

// Test 8: Result limit is applied
test('Result limit is applied to query', () => {
	let queryExecuted = false;
	
	const mockDb = {
		prepare: (query) => {
			queryExecuted = true;
			
			if (!query.includes('LIMIT 5')) {
				throw new Error('Query should include LIMIT clause');
			}
			
			return {
				all: () => []
			};
		}
	};
	
	directQueryTool({
		config: testConfig,
		vectorDb: mockDb,
		queryOptions: {
			queryType: 'sourceOnly',
			whereClause: 'DataType = "Text"',
			resultLimit: 5
		}
	});
	
	if (!queryExecuted) {
		throw new Error('Query should have been executed');
	}
});

// Test 9: VectorsOnly query excludes embedding column
test('VectorsOnly query excludes embedding column', () => {
	let queryExecuted = false;
	
	const mockDb = {
		prepare: (query) => {
			queryExecuted = true;
			
			if (query.includes('embedding')) {
				throw new Error('VectorsOnly query should not include embedding column');
			}
			if (!query.includes('factType')) {
				throw new Error('VectorsOnly query should include factType column');
			}
			
			return {
				all: () => []
			};
		}
	};
	
	directQueryTool({
		config: testConfig,
		vectorDb: mockDb,
		queryOptions: {
			queryType: 'vectorsOnly',
			whereClause: 'factType = "primary_context"'
		}
	});
	
	if (!queryExecuted) {
		throw new Error('Query should have been executed');
	}
});

// Test 10: Database error handling
test('Database error handling works', () => {
	const originalExit = process.exit;
	let exitCalled = false;
	
	process.exit = (code) => {
		exitCalled = true;
		if (code !== 1) throw new Error(`Expected exit code 1, got ${code}`);
	};
	
	const mockDb = {
		prepare: (query) => {
			return {
				all: () => {
					throw new Error('Database connection failed');
				}
			};
		}
	};
	
	try {
		directQueryTool({
			config: testConfig,
			vectorDb: mockDb,
			queryOptions: {
				queryType: 'showAll',
				whereClause: 'createdAt > "2025-07-01"'
			}
		});
		
		if (!exitCalled) {
			throw new Error('Should have called process.exit(1) on database error');
		}
	} finally {
		process.exit = originalExit;
	}
});

// Test 11: Quote conversion function
test('Quote conversion sanitizes double quotes', () => {
	// This is a unit test of the sanitization function
	// We need to access it, so let's test it through the query building
	
	let queryExecuted = false;
	
	const mockDb = {
		prepare: (query) => {
			queryExecuted = true;
			
			// Verify that double quotes were converted to single quotes
			if (query.includes('createdAt>"2025-07-01"')) {
				throw new Error('Double quotes should have been converted to single quotes');
			}
			if (!query.includes("createdAt>'2025-07-01'")) {
				throw new Error('Query should contain single-quoted date value');
			}
			
			return {
				all: () => []
			};
		}
	};
	
	directQueryTool({
		config: testConfig,
		vectorDb: mockDb,
		queryOptions: {
			queryType: 'sourceOnly',
			whereClause: 'createdAt>"2025-07-01"',  // Double quotes that should be converted
			resultLimit: 5
		}
	});
	
	if (!queryExecuted) {
		throw new Error('Query should have been executed');
	}
});

// Test summary
console.log('='.repeat(50));
console.log(`Test Results: ${passedTests}/${testCount} passed`);

if (passedTests === testCount) {
	console.log('✓ All tests passed!');
	process.exit(0);
} else {
	console.log('✗ Some tests failed');
	process.exit(1);
}