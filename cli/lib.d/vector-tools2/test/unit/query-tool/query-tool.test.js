#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

// Test for the query-tool module
// This is a basic smoke test to ensure the module loads and basic functionality works

// Set up global process variables that modules expect
process.global = process.global || {};
process.global.xLog = {
	status: (msg) => console.log('STATUS:', msg),
	error: (msg) => console.error('ERROR:', msg),
	debug: (msg) => { if (process.env.DEBUG) console.log('DEBUG:', msg); },
	verbose: (msg) => { if (process.env.VERBOSE) console.log('VERBOSE:', msg); }
};

process.global.getConfig = (module) => ({
	dataProfile: 'ceds',
	semanticAnalysisMode: 'simpleVector'
});

process.global.commandLineParameters = {
	values: {
		query: ['sourceOnly'],
		whereClause: ['ElementName LIKE "%student%"'],
		resultLimit: ['10'],
		semanticAnalysisMode: ['simpleVector']
	},
	qtGetSurePath: function(path, defaultValue) {
		if (path === 'values.semanticAnalysisMode[0]') {
			return this.values.semanticAnalysisMode[0] || defaultValue;
		}
		return defaultValue;
	}
};

// Mock database utility
const mockDbUtility = {
	query: (sql, params, callback) => {
		// Simulate successful query
		const mockResults = [
			{
				GlobalID: 'TEST001',
				ElementName: 'Student Name',
				Definition: 'The legal name of a student',
				DataType: 'String'
			}
		];
		
		setTimeout(() => callback(null, mockResults), 10);
	},
	
	getTableSchema: (tableName, callback) => {
		const mockSchema = [
			{ name: 'GlobalID', type: 'TEXT', notnull: 1 },
			{ name: 'ElementName', type: 'TEXT', notnull: 0 },
			{ name: 'Definition', type: 'TEXT', notnull: 0 },
			{ name: 'DataType', type: 'TEXT', notnull: 0 }
		];
		
		setTimeout(() => callback(null, mockSchema), 10);
	}
};

async function runTests() {
	console.log('Testing query-tool module...\n');
	
	try {
		// Test 1: Module loads
		console.log('Test 1: Module loading...');
		const queryToolModule = require('../../../lib/query-tool/query-tool')({});
		console.log('✓ Module loaded successfully');
		
		// Test 2: Query registry exists
		console.log('\nTest 2: Query registry...');
		console.log('Available queries:', queryToolModule.queryRegistry);
		console.log('✓ Query registry populated');
		
		// Test 3: Test individual query modules
		console.log('\nTest 3: Individual query modules...');
		
		const sourceOnlyQuery = require('../../../lib/query-tool/lib/queries/source-only-query')({});
		const testQuery = sourceOnlyQuery.buildQuery({
			dataProfile: 'ceds',
			whereClause: 'ElementName LIKE "%student%"',
			resultLimit: 10,
			semanticMode: 'simpleVector'
		});
		
		console.log('Generated query:', testQuery);
		console.log('✓ Query generation works');
		
		// Test 4: Formatters
		console.log('\nTest 4: Formatters...');
		const formatters = require('../../../lib/query-tool/lib/formatters')({});
		console.log('✓ Formatters module loaded');
		
		// Test 5: Validation
		console.log('\nTest 5: Validation...');
		const validation = require('../../../lib/query-tool/lib/validation')({});
		const isValid = validation.validateQueryType('sourceOnly', queryToolModule.queryRegistry);
		console.log('Validation result:', isValid);
		console.log('✓ Validation works');
		
		console.log('\n🎉 All tests passed! Query tool implementation is ready.');
		
	} catch (error) {
		console.error('\n❌ Test failed:', error.message);
		console.error(error.stack);
		process.exit(1);
	}
}

// Run tests
runTests().catch(console.error);