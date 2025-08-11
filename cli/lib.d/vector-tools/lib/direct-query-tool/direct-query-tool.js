'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = function (args = {}) {
	const { xLog, getConfig } = process.global;
	const localConfig = getConfig(moduleName);

	// Import schema registry and subordinate modules
	const schemaRegistry = require('./schemas')({});
	const validation = require('./lib/validation')({});
	const formatters = require('./lib/formatters')({});
	const queryBuilders = require('./lib/query-builders')({});

	function getCurrentSemanticMode() {
		const { commandLineParameters } = process.global;
		return commandLineParameters.qtGetSurePath('values.semanticAnalysisMode[0]', 'simpleVector');
	}

	const queryTypes = {
		showAll: {
			description: 'Join source data with vector table metadata (full text)',
			handler: (args) => queryBuilders.buildShowAllQuery({...args, validation, getCurrentSemanticMode, schemaRegistry})
		},
		vectorsOnly: {
			description: 'Show just vector table records',
			handler: (args) => queryBuilders.buildVectorsOnlyQuery({...args, validation, getCurrentSemanticMode, schemaRegistry})
		},
		sourceOnly: {
			description: 'Show just source table records', 
			handler: (args) => queryBuilders.buildSourceOnlyQuery({...args, validation, getCurrentSemanticMode, schemaRegistry})
		},
		compareAnalysis: {
			description: 'Compare original definitions with atomic and simple vector analysis',
			handler: (args) => queryBuilders.buildCompareAnalysisQuery({...args, validation})
		},
		matchDiscrepancies: {
			description: 'Find SIF elements where simple and atomic vector matching produced different CEDS matches',
			handler: queryBuilders.buildMatchDiscrepanciesQuery
		},
		unityCedsComparison: {
			description: 'Show SIF descriptions with unityCedsMatch AI recommendations',
			handler: queryBuilders.buildUnityCedsComparisonQuery
		},
		showQueryInfo: {
			description: 'Show all query types and their compiled SQL statements',
			handler: queryBuilders.buildShowQueryInfoQuery
		}
	};



	const directQueryTool = ({ vectorDb }) => {
		const { commandLineParameters } = process.global;
		
		// Get parameters directly from command line
		const queryType = commandLineParameters.values.query.qtLast();
		const whereClause = commandLineParameters.values.whereClause?.[0] || null;
		const resultLimit = commandLineParameters.values.resultLimit?.[0] || null;
		const dataProfile = commandLineParameters.values.dataProfile[0];
		
		// Create config object with just dataProfile for compatibility
		const config = { dataProfile };

		if (!validation.validateInputs({ queryType, whereClause, config, queryTypes, getCurrentSemanticMode, schemaRegistry })) {
			return;
		}

		// Special handling for showQueryInfo
		if (queryType === 'showQueryInfo') {
			return showQueryInfo({ config });
		}

		const queryHandler = queryTypes[queryType].handler;
		const sqlQuery = queryHandler({ config, whereClause, resultLimit });

		xLog.debug(`Executing query: ${sqlQuery}`);

		try {
			const results = vectorDb.prepare(sqlQuery).all();
			formatters.formatResults(results, queryType);
		} catch (err) {
			xLog.error(`Database query failed: ${err.message}`);
			process.exit(1);
		}
	};

	function showQueryInfo({ config }) {
		const semanticMode = getCurrentSemanticMode();
		const schema = schemaRegistry.getSchema(config.dataProfile, semanticMode);
		
		xLog.status('\n=== DIRECT QUERY TOOL - QUERY INFORMATION ===\n');
		xLog.status(`Data Profile: ${config.dataProfile}`);
		xLog.status(`Semantic Analysis Mode: ${semanticMode}`);
		xLog.status(`Source Table: ${schema.sourceTable}`);
		xLog.status(`Vector Table: ${schema.vectorTable}`);
		xLog.status(`Source Key Field: ${schema.keyFields.source}\n`);

		// Show each query type and its compiled SQL
		Object.keys(queryTypes).forEach(queryTypeName => {
			if (queryTypeName === 'showQueryInfo') return; // Skip self
			
			const queryType = queryTypes[queryTypeName];
			
			try {
				// Generate sample SQL with placeholder WHERE clause
				const sampleWhereClause = 'YOUR_WHERE_CLAUSE_HERE';
				const sampleQuery = queryType.handler({ 
					config, 
					whereClause: sampleWhereClause, 
					resultLimit: 10 
				});
				
				// Convert multi-line SQL to single line and clean up whitespace
				const singleLineQuery = sampleQuery
					.replace(/\s+/g, ' ')  // Replace multiple whitespace with single space
					.trim();               // Remove leading/trailing whitespace
				
				xLog.status(`${queryTypeName}: ${singleLineQuery}`);
				xLog.status(''); // Extra newline for readability when wrapping
			} catch (err) {
				xLog.status(`${queryTypeName}: Error generating SQL: ${err.message}`);
				xLog.status(''); // Extra newline for readability when wrapping
			}
		});

		xLog.status('=== END QUERY INFORMATION ===\n');
	}

	return {
		directQueryTool,
		queryTypes: Object.keys(queryTypes)
	};
};

module.exports = moduleFunction;