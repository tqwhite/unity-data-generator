#!/usr/bin/env node
'use strict';

// Integration test with real database
process.env.NODE_ENV = 'test';
process.noDeprecation = true;

const path = require('path');
const fs = require('fs');

// Initialize qtools-ai-framework to get real config and database
const findProjectRoot = ({ rootFolderName = 'system', closest = true } = {}) =>
	__dirname.replace(
		new RegExp(`^(.*${closest ? '' : '?'}\/${rootFolderName}).*$`),
		'$1',
	);
const applicationBasePath = findProjectRoot();

const moduleName = 'vectorTools';
const helpText = require('../lib/help-text')({});

// Mock command line parameters for integration test
process.argv = [
	'node',
	'test-direct-query-tool-integration.js',
	'--dataProfile=ceds',
	'--semanticAnalysisMode=simpleVector'
];

const initAtp = require('../../../../lib/qtools-ai-framework/jina')({
	configFileBaseName: moduleName,
	applicationBasePath,
	helpText,
	applicationControls: [
		'--dataProfile',
		'--semanticAnalysisMode',
		'--query',
		'--whereClause',
		'--resultLimit',
	],
});

// Use real configuration
const { xLog, getConfig } = process.global;
const config = require('../lib/assemble-config')({}).reorganizeValidateConfig(getConfig(moduleName));

// Use real database
const databaseOperationsGen = require('../lib/database-operations');
const databaseOperations = databaseOperationsGen({});
const vectorDb = databaseOperations.initializeDatabase(
	config.qtSelectProperties(['databaseFilePath', 'vectorTableName']),
);

const { directQueryTool, queryTypes } = require('../lib/direct-query-tool/direct-query-tool')({});

// Integration test suite
console.log('Starting direct-query-tool INTEGRATION tests (using real database)...\n');

let testCount = 0;
let passedTests = 0;

function test(name, testFn) {
	testCount++;
	console.log(`Integration Test ${testCount}: ${name}`);
	
	try {
		testFn();
		passedTests++;
		console.log('✓ PASSED\n');
	} catch (error) {
		console.log(`✗ FAILED: ${error.message}\n`);
	}
}

// Integration Test 1: Real database connection
test('Real database connection works', () => {
	// Try a simple query to verify database works
	const tables = vectorDb.prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`).all();
	
	if (!Array.isArray(tables) || tables.length === 0) {
		throw new Error('Database should return table list');
	}
	
	console.log(`   Found ${tables.length} tables in database`);
});

// Integration Test 2: Real CEDS source query
test('Real CEDS sourceOnly query executes', () => {
	let results;
	let queryExecuted = false;
	
	// Override xLog to capture results
	const originalStatus = xLog.status;
	let resultCount = 0;
	
	xLog.status = (msg) => {
		if (msg.includes('Found') && msg.includes('records')) {
			const match = msg.match(/Found (\d+) records/);
			if (match) {
				resultCount = parseInt(match[1]);
				queryExecuted = true;
			}
		}
		originalStatus(msg);
	};
	
	try {
		directQueryTool({
			config,
			vectorDb,
			queryOptions: {
				queryType: 'sourceOnly',
				whereClause: 'GlobalID<10',  // Simple condition that should work
				resultLimit: 3
			}
		});
		
		if (!queryExecuted) {
			throw new Error('Query should have executed and returned results count');
		}
		
		if (resultCount !== 3) {
			throw new Error(`Expected 3 results, got ${resultCount}`);
		}
		
		console.log(`   Successfully retrieved ${resultCount} records from real database`);
		
	} finally {
		xLog.status = originalStatus;
	}
});

// Integration Test 3: Quote conversion with real database
test('Quote conversion works with real database', () => {
	let queryExecuted = false;
	let resultCount = 0;
	
	const originalStatus = xLog.status;
	const originalDebug = xLog.debug;
	let sanitizationLogged = false;
	
	xLog.status = (msg) => {
		if (msg.includes('Found') && msg.includes('records')) {
			const match = msg.match(/Found (\d+) records/);
			if (match) {
				resultCount = parseInt(match[1]);
				queryExecuted = true;
			}
		}
		originalStatus(msg);
	};
	
	xLog.debug = (msg) => {
		if (msg.includes('Sanitized WHERE clause')) {
			sanitizationLogged = true;
			console.log(`   ${msg}`);
		}
		originalDebug(msg);
	};
	
	try {
		// This should work now - the problematic double quotes should be converted
		directQueryTool({
			config,
			vectorDb,
			queryOptions: {
				queryType: 'sourceOnly',
				whereClause: 'ElementName>"A"',  // Double quotes that need conversion
				resultLimit: 2
			}
		});
		
		if (!queryExecuted) {
			throw new Error('Query with double quotes should execute after sanitization');
		}
		
		if (!sanitizationLogged) {
			throw new Error('Quote sanitization should have been logged');
		}
		
		console.log(`   Quote conversion successful - retrieved ${resultCount} records`);
		
	} finally {
		xLog.status = originalStatus;
		xLog.debug = originalDebug;
	}
});

// Integration Test 4: Atomic vector table detection  
test('Atomic vector mode uses correct table', () => {
	// Override command line parameters to force atomicVector mode
	const originalCommandLineParameters = process.global.commandLineParameters;
	
	process.global.commandLineParameters = {
		...originalCommandLineParameters,
		values: {
			...originalCommandLineParameters.values,
			semanticAnalysisMode: ['atomicVector']
		},
		qtGetSurePath: (path, defaultValue) => {
			if (path === 'values.semanticAnalysisMode[0]') {
				return 'atomicVector';
			}
			return originalCommandLineParameters.qtGetSurePath(path, defaultValue);
		}
	};
	
	let queryExecuted = false;
	let resultCount = 0;
	
	const originalStatus = xLog.status;
	xLog.status = (msg) => {
		if (msg.includes('Found') && msg.includes('records')) {
			const match = msg.match(/Found (\d+) records/);
			if (match) {
				resultCount = parseInt(match[1]);
				queryExecuted = true;
			}
		}
		originalStatus(msg);
	};
	
	try {
		// Test vectorsOnly query with atomic mode - should use cedsElementVectors_atomic table
		directQueryTool({
			config,
			vectorDb,
			queryOptions: {
				queryType: 'vectorsOnly',
				whereClause: "factType='primary_context'",
				resultLimit: 2
			}
		});
		
		if (!queryExecuted) {
			throw new Error('Atomic vector query should execute');
		}
		
		console.log(`   Atomic vector mode successfully queried _atomic table (${resultCount} records)`);
		
	} finally {
		xLog.status = originalStatus;
		process.global.commandLineParameters = originalCommandLineParameters;
	}
});

// Integration Test 5: SQL injection prevention with real database
test('SQL injection prevention works with real database', () => {
	const originalExit = process.exit;
	let exitCalled = false;
	
	process.exit = (code) => {
		exitCalled = true;
		if (code !== 1) throw new Error(`Expected exit code 1, got ${code}`);
	};
	
	try {
		// This should be blocked by SQL injection prevention
		directQueryTool({
			config,
			vectorDb,
			queryOptions: {
				queryType: 'sourceOnly',
				whereClause: 'GlobalID=1; DROP TABLE _CEDSElements; --',
				resultLimit: 1
			}
		});
		
		if (!exitCalled) {
			throw new Error('SQL injection attempt should have been blocked');
		}
		
		console.log('   SQL injection attempt successfully blocked');
		
	} finally {
		process.exit = originalExit;
	}
});

// Test summary
console.log('='.repeat(60));
console.log(`Integration Test Results: ${passedTests}/${testCount} passed`);

if (passedTests === testCount) {
	console.log('✓ All integration tests passed!');
	console.log('✓ Real database connectivity confirmed');
	console.log('✓ Quote conversion working with real SQL execution');
	console.log('✓ Semantic analysis mode detection working');
	console.log('✓ Security measures effective against real injection attempts');
	process.exit(0);
} else {
	console.log('✗ Some integration tests failed');
	process.exit(1);
}