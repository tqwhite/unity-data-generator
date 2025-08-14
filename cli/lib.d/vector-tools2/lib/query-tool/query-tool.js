#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');
const path = require('path');

const moduleFunction = function (args = {}) {
	const { xLog, getConfig, commandLineParameters } = process.global;
	const localConfig = getConfig(moduleName);

	// Import query modules
	const showAllQuery = require('./lib/queries/show-all-query')({});
	const sourceOnlyQuery = require('./lib/queries/source-only-query')({});
	const vectorsOnlyQuery = require('./lib/queries/vectors-only-query')({});
	const compareAnalysisQuery = require('./lib/queries/compare-analysis-query')({});
	const matchDiscrepanciesQuery = require('./lib/queries/match-discrepancies-query')({});
	const unityCedsComparisonQuery = require('./lib/queries/unity-ceds-comparison-query')({});

	// Import utilities
	const formatters = require('./lib/formatters')({});
	const validation = require('./lib/validation')({});

	// Query registry - maps query types to their handlers
	const queryRegistry = {
		showAll: {
			description: 'Join source data with vector metadata (full text)',
			handler: showAllQuery.buildQuery,
			formatter: formatters.formatTableResults
		},
		sourceOnly: {
			description: 'Show source table records only',
			handler: sourceOnlyQuery.buildQuery,
			formatter: formatters.formatTableResults
		},
		vectorsOnly: {
			description: 'Show vector table records only',
			handler: vectorsOnlyQuery.buildQuery,
			formatter: formatters.formatTableResults
		},
		compareAnalysis: {
			description: 'Compare original definitions with atomic analysis',
			handler: compareAnalysisQuery.buildQuery,
			formatter: formatters.formatComparisonResults
		},
		matchDiscrepancies: {
			description: 'Find elements where simple/atomic vectors disagree',
			handler: matchDiscrepanciesQuery.buildQuery,
			formatter: formatters.formatDiscrepancyResults
		},
		unityCedsComparison: {
			description: 'Show elements with unityCedsMatch AI recommendations',
			handler: unityCedsComparisonQuery.buildQuery,
			formatter: formatters.formatUnityComparisonResults
		},
		help: {
			description: 'Show available query types and field information',
			handler: null,
			formatter: null
		}
	};

	// Get current semantic analysis mode from command line
	function getCurrentSemanticMode() {
		return commandLineParameters.qtGetSurePath('values.semanticAnalysisMode[0]', 'simpleVector');
	}

	// Main query tool function
	const queryTool = ({ dbUtility, dataProfile }) => {
		const queryType = commandLineParameters.values.query?.qtLast();
		const whereClause = commandLineParameters.values.whereClause?.[0] || null;
		const resultLimit = commandLineParameters.values.resultLimit?.[0] || null;
		const outputFormat = commandLineParameters.values.outputFormat?.[0] || 'table';

		// Validate inputs
		if (!validation.validateQueryType(queryType, queryRegistry)) {
			return;
		}

		// Handle help request
		if (queryType === 'help' || whereClause === 'help') {
			showHelp({ dbUtility, dataProfile });
			return;
		}

		// Validate WHERE clause
		if (!validation.validateWhereClause(whereClause)) {
			return;
		}

		// Get query handler
		const queryInfo = queryRegistry[queryType];
		const queryHandler = queryInfo.handler;
		const formatter = queryInfo.formatter;

		// Build query parameters
		const queryParams = {
			dataProfile,
			whereClause: validation.sanitizeWhereClause(whereClause),
			resultLimit: resultLimit ? parseInt(resultLimit) : null,
			semanticMode: getCurrentSemanticMode()
		};

		// Build SQL query
		let sqlQuery;
		try {
			sqlQuery = queryHandler(queryParams);
		} catch (err) {
			xLog.error(`Query building failed: ${err.message}`);
			process.exit(1);
		}

		xLog.debug(`Executing query: ${sqlQuery}`);

		// Execute query using dbUtility
		dbUtility.query(sqlQuery, [], (err, results) => {
			if (err) {
				xLog.error(`Database query failed: ${err.message}`);
				if (err.traceId) {
					xLog.error(`Trace ID: ${err.traceId}`);
				}
				process.exit(1);
			}

			// Format and display results
			if (outputFormat === 'json') {
				console.log(JSON.stringify(results, null, 2));
			} else {
				formatter(results, queryType);
			}
		});
	};

	// Show help information
	function showHelp({ dbUtility, dataProfile }) {
		xLog.status('\n=== VECTOR TOOLS 2 - QUERY TOOL HELP ===\n');
		
		// Show available query types
		xLog.status('Available Query Types:');
		Object.entries(queryRegistry).forEach(([type, info]) => {
			if (type !== 'help') {
				xLog.status(`  ${type}: ${info.description}`);
			}
		});

		xLog.status(`\nCurrent Data Profile: ${dataProfile}`);
		xLog.status(`Current Semantic Mode: ${getCurrentSemanticMode()}`);

		// Show available tables and fields
		showAvailableFields({ dbUtility, dataProfile });

		xLog.status('\nUsage Examples:');
		xLog.status('  vectorTools2 --operation=query --query=showAll --whereClause="name LIKE \'%student%\'"');
		xLog.status('  vectorTools2 --operation=query --query=sourceOnly --resultLimit=10');
		xLog.status('  vectorTools2 --operation=query --query=vectorsOnly --outputFormat=json');
		xLog.status('  vectorTools2 --operation=query --query=help');
		xLog.status('');
	}

	// Show available database fields
	function showAvailableFields({ dbUtility, dataProfile }) {
		const tables = getRelevantTables(dataProfile);
		
		xLog.status('\nAvailable Fields for WHERE clauses:');
		
		tables.forEach(tableName => {
			dbUtility.getTableSchema(tableName, (err, schema) => {
				if (err) {
					xLog.warning(`Could not get schema for table: ${tableName}`);
					return;
				}
				
				if (schema && schema.length > 0) {
					xLog.status(`\n  ${tableName}:`);
					schema.forEach(col => {
						const nullInfo = col.notnull ? 'NOT NULL' : 'nullable';
						const typeInfo = col.type || 'unknown';
						xLog.status(`    ${col.name} (${typeInfo}, ${nullInfo})`);
					});
				}
			});
		});
	}

	// Get relevant table names based on data profile
	function getRelevantTables(dataProfile) {
		const semanticMode = getCurrentSemanticMode();
		
		if (dataProfile === 'ceds') {
			const tables = ['_CEDSElements'];
			if (semanticMode === 'simpleVector') {
				tables.push('cedsElementVectors_simple');
			} else if (semanticMode === 'atomicVector') {
				tables.push('cedsElementVectors_atomic');
			}
			return tables;
		} else if (dataProfile === 'sif') {
			const tables = ['naDataModel'];
			if (semanticMode === 'simpleVector') {
				tables.push('naDataModelVectors_simple');
			} else if (semanticMode === 'atomicVector') {
				tables.push('naDataModelVectors_atomic');
			}
			tables.push('unityCedsMatches'); // AI recommendations
			return tables;
		}
		
		return [];
	}

	return {
		queryTool,
		queryRegistry,
		getCurrentSemanticMode
	};
};

module.exports = moduleFunction;