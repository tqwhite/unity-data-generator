'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = function (args = {}) {
	const { xLog, getConfig } = process.global;
	const localConfig = getConfig(moduleName);

	const queryTypes = {
		showAll: {
			description: 'Join source data with vector table metadata (full text)',
			handler: buildShowAllQuery
		},
		vectorsOnly: {
			description: 'Show just vector table records',
			handler: buildVectorsOnlyQuery
		},
		sourceOnly: {
			description: 'Show just source table records', 
			handler: buildSourceOnlyQuery
		},
		showQueryInfo: {
			description: 'Show all query types and their compiled SQL statements',
			handler: buildShowQueryInfoQuery
		}
	};

	function validateInputs({ queryType, whereClause }) {
		// showQueryInfo doesn't need a whereClause
		if (queryType === 'showQueryInfo') {
			if (!queryType) {
				xLog.error('--query parameter is required');
				process.exit(1);
				return false;
			}
		} else {
			if (!queryType || !whereClause) {
				xLog.error('Both --query and --whereClause parameters are required');
				process.exit(1);
				return false;
			}
		}

		// Ensure we have strings, not arrays or other types
		const cleanQueryType = typeof queryType === 'string' ? queryType : String(queryType || '');
		const cleanWhereClause = typeof whereClause === 'string' ? whereClause : String(whereClause || '');

		// For non-showQueryInfo queries, both parameters must have values
		if (queryType !== 'showQueryInfo' && (!cleanQueryType || !cleanWhereClause)) {
			xLog.error('Both --query and --whereClause parameters must have values');
			process.exit(1);
			return false;
		}

		if (!queryTypes[cleanQueryType]) {
			const validTypes = Object.keys(queryTypes).join(', ');
			xLog.error(`Invalid query type: ${cleanQueryType}. Valid types: ${validTypes}`);
			process.exit(1);
			return false;
		}

		// Validate WHERE clause for SQL injection prevention
		const dangerousPatterns = [';', '--', '/*', '*/', 'DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER'];
		
		const upperWhereClause = cleanWhereClause.toUpperCase();
		for (const pattern of dangerousPatterns) {
			if (upperWhereClause.includes(pattern)) {
				xLog.error(`Invalid WHERE clause: contains prohibited pattern '${pattern}'`);
				process.exit(1);
				return false;
			}
		}

		return true;
	}

	function sanitizeWhereClause(whereClause) {
		// Convert double quotes to single quotes for SQLite string literals
		// This handles cases like: createdAt>"2025-07-01" -> createdAt>'2025-07-01'
		// But preserves intentional double quotes around identifiers if needed
		
		// Simple heuristic: if we see >"..." or <"..." or ="..." convert to single quotes
		// This covers the most common user-friendly input patterns
		let sanitized = whereClause
			.replace(/([><=!]+)"([^"]+)"/g, "$1'$2'")  // Convert >"value" to >'value'
			.replace(/\s+"([^"]+)"/g, " '$1'")         // Convert standalone "value" to 'value'  
			.replace(/^"([^"]+)"/g, "'$1'");          // Convert leading "value" to 'value'
		
		xLog.debug(`Sanitized WHERE clause: ${whereClause} -> ${sanitized}`);
		return sanitized;
	}

	function buildShowAllQuery({ config, whereClause, resultLimit }) {
		const { commandLineParameters } = process.global;
		const { sourceTableName, vectorTableName, sourcePrivateKeyName } = config;
		
		// Sanitize WHERE clause for user-friendly input
		const sanitizedWhereClause = sanitizeWhereClause(whereClause);
		
		// Determine actual vector table name based on semantic analysis mode
		const semanticAnalysisMode = commandLineParameters.qtGetSurePath('values.semanticAnalysisMode[0]', 'simpleVector');
		const actualVectorTableName = semanticAnalysisMode === 'atomicVector' 
			? `${vectorTableName}_atomic` 
			: vectorTableName;
		
		// Select useful columns, exclude vector embeddings
		let query;
		if (config.dataProfile === 'ceds') {
			if (semanticAnalysisMode === 'atomicVector') {
				// Atomic vector table has rich metadata
				query = `
					SELECT 
						s.GlobalID,
						s.ElementName,
						s.Definition,
						s.Format,
						s.HasOptionSet,
						s.UsageNotes,
						v.refId as vectorRefId,
						v.factType,
						v.factText,
						v.semanticCategory,
						v.conceptualDimension,
						v.createdAt as vectorCreatedAt
					FROM ${sourceTableName} s
					LEFT JOIN ${actualVectorTableName} v ON s.${sourcePrivateKeyName} = v.sourceRefId
					WHERE ${sanitizedWhereClause}
				`;
			} else {
				// Simple vector table (vec0 virtual table) has minimal structure
				query = `
					SELECT 
						s.GlobalID,
						s.ElementName,
						s.Definition,
						s.Format,
						s.HasOptionSet,
						s.UsageNotes
					FROM ${sourceTableName} s
					WHERE ${sanitizedWhereClause}
				`;
			}
		} else if (config.dataProfile === 'sif') {
			query = `
				SELECT 
					s.refId,
					s.Name,
					s.Description,
					s.XPath,
					s.DataType,
					v.refId as vectorRefId,
					v.createdAt as vectorCreatedAt
				FROM ${sourceTableName} s
				LEFT JOIN ${actualVectorTableName} v ON s.${sourcePrivateKeyName} = v.sourceRefId
				WHERE ${sanitizedWhereClause}
			`;
		} else {
			xLog.error(`Unsupported data profile: ${config.dataProfile}`);
			process.exit(1);
		}
		
		if (resultLimit) {
			query += ` LIMIT ${parseInt(resultLimit)}`;
		}
		
		return query;
	}


	function buildVectorsOnlyQuery({ config, whereClause, resultLimit }) {
		const { commandLineParameters } = process.global;
		const { vectorTableName } = config;
		
		// Sanitize WHERE clause for user-friendly input
		const sanitizedWhereClause = sanitizeWhereClause(whereClause);
		
		// Determine actual vector table name based on semantic analysis mode
		const semanticAnalysisMode = commandLineParameters.qtGetSurePath('values.semanticAnalysisMode[0]', 'simpleVector');
		const actualVectorTableName = semanticAnalysisMode === 'atomicVector' 
			? `${vectorTableName}_atomic` 
			: vectorTableName;
		
		// Exclude the actual embedding blob, show metadata only
		let query = `
			SELECT 
				refId,
				sourceRefId,
				factType,
				factText,
				semanticCategory,
				conceptualDimension,
				factIndex,
				createdAt
			FROM ${actualVectorTableName}
			WHERE ${sanitizedWhereClause}
		`;
		
		if (resultLimit) {
			query += ` LIMIT ${parseInt(resultLimit)}`;
		}
		
		return query;
	}

	function buildSourceOnlyQuery({ config, whereClause, resultLimit }) {
		const { sourceTableName } = config;
		
		// Sanitize WHERE clause for user-friendly input
		const sanitizedWhereClause = sanitizeWhereClause(whereClause);
		
		let query;
		if (config.dataProfile === 'ceds') {
			query = `
				SELECT 
					GlobalID,
					ElementName,
					Definition,
					Format,
					HasOptionSet,
					UsageNotes,
					TermID,
					ChangedInThisVersionInd
				FROM ${sourceTableName}
				WHERE ${sanitizedWhereClause}
			`;
		} else if (config.dataProfile === 'sif') {
			query = `
				SELECT 
					refId,
					Name,
					Description,
					XPath,
					DataType,
					createdAt,
					updatedAt
				FROM ${sourceTableName}
				WHERE ${sanitizedWhereClause}
			`;
		} else {
			xLog.error(`Unsupported data profile: ${config.dataProfile}`);
			process.exit(1);
		}
		
		if (resultLimit) {
			query += ` LIMIT ${parseInt(resultLimit)}`;
		}
		
		return query;
	}

	function buildShowQueryInfoQuery({ config, whereClause, resultLimit }) {
		// This is a special query type that doesn't actually query the database
		// Instead, it shows what queries would be generated
		return null; // Will be handled specially in the main function
	}

	function formatResults(results, queryType) {
		if (!results || results.length === 0) {
			xLog.status('No results found for the given criteria');
			return;
		}

		const showVectorDetails = queryType === 'showAll';
		xLog.status(`\nFound ${results.length} records (query type: ${queryType})\n`);

		results.forEach((row, index) => {
			xLog.status(`${index + 1}. [${row.GlobalID || row.refId}] ${row.ElementName || row.Name || 'No Name'}`);
			
			if (row.Definition) {
				xLog.status(`   Definition: ${row.Definition}`);
			}
			if (row.Description) {
				xLog.status(`   Description: ${row.Description}`);
			}
			if (row.XPath) {
				xLog.status(`   XPath: ${row.XPath}`);
			}
			if (row.Format) {
				xLog.status(`   Format: ${row.Format}`);
			}
			if (row.DataType) {
				xLog.status(`   DataType: ${row.DataType}`);
			}
			if (row.factType) {
				xLog.status(`   FactType: ${row.factType}`);
			}
			if (row.factText && showVectorDetails) {
				xLog.status(`   FactText: ${row.factText}`);
			}
			if (row.semanticCategory) {
				xLog.status(`   Category: ${row.semanticCategory}`);
			}
			if (row.conceptualDimension && showVectorDetails) {
				xLog.status(`   ConceptualDimension: ${row.conceptualDimension}`);
			}
			
			xLog.status(''); // Empty line between records
		});
	}

	const directQueryTool = ({ config, vectorDb, queryOptions }) => {
		const { queryType, whereClause, resultLimit } = queryOptions;

		if (!validateInputs({ queryType, whereClause })) {
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
			formatResults(results, queryType);
		} catch (err) {
			xLog.error(`Database query failed: ${err.message}`);
			process.exit(1);
		}
	};

	function showQueryInfo({ config }) {
		const { commandLineParameters } = process.global;
		const semanticAnalysisMode = commandLineParameters.qtGetSurePath('values.semanticAnalysisMode[0]', 'simpleVector');
		
		xLog.status('\n=== DIRECT QUERY TOOL - QUERY INFORMATION ===\n');
		xLog.status(`Data Profile: ${config.dataProfile}`);
		xLog.status(`Semantic Analysis Mode: ${semanticAnalysisMode}`);
		xLog.status(`Source Table: ${config.sourceTableName}`);
		xLog.status(`Vector Table: ${config.vectorTableName}${semanticAnalysisMode === 'atomicVector' ? '_atomic' : ''}`);
		xLog.status(`Source Key Field: ${config.sourcePrivateKeyName}\n`);

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