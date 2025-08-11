'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = function (args = {}) {
	const { xLog } = process.global;

	function displayFieldHelp({ config, getCurrentSemanticMode, schemaRegistry, queryType }) {
		const semanticMode = getCurrentSemanticMode();
		const schema = schemaRegistry.getSchema(config.dataProfile, semanticMode);
		
		xLog.status('\n=== AVAILABLE FIELD NAMES FOR WHERE CLAUSE ===\n');
		xLog.status(`Data Profile: ${config.dataProfile}`);
		xLog.status(`Semantic Analysis Mode: ${semanticMode}`);
		xLog.status(`Query Type: ${queryType}`);
		xLog.status(`Source Table: ${schema.sourceTable}`);
		if (schema.joinable) {
			xLog.status(`Vector Table: ${schema.vectorTable}`);
		}
		xLog.status('');
		
		xLog.status('📋 SOURCE TABLE FIELDS:');
		schema.sourceColumns.forEach(column => {
			xLog.status(`   ${column}`);
		});
		
		if (schema.joinable && schema.vectorColumns.length > 0) {
			xLog.status('\n🔍 VECTOR TABLE FIELDS:');
			schema.vectorColumns.forEach(column => {
				xLog.status(`   ${column}`);
			});
		}
		
		xLog.status('\n💡 EXAMPLE WHERE CLAUSES:');
		if (config.dataProfile === 'ceds') {
			xLog.status(`   ElementName like '%student%'`);
			xLog.status(`   Definition like '%assessment%'`);
			xLog.status(`   GlobalID = '000123'`);
			if (schema.joinable) {
				xLog.status(`   factType = 'entity'`);
				xLog.status(`   semanticCategory like '%academic%'`);
			}
		} else if (config.dataProfile === 'sif') {
			xLog.status(`   Name like '%Student%'`);
			xLog.status(`   Description like '%enrollment%'`);
			xLog.status(`   XPath like '%/StudentPersonal%'`);
			xLog.status(`   Type = 'element'`);
			if (schema.joinable) {
				xLog.status(`   factType = 'attribute'`);
				xLog.status(`   semanticCategory like '%demographic%'`);
			}
		}
		xLog.status('\n📚 USAGE: vectorTools --dataProfile=' + config.dataProfile + ' --query=' + queryType + ' --whereClause="FieldName like \'%searchterm%\'"\n');
	}

	function validateInputs({ queryType, whereClause, config, queryTypes, getCurrentSemanticMode, schemaRegistry }) {
		// Check for special 'help' keyword in whereClause
		if (whereClause === 'help') {
			displayFieldHelp({ config, getCurrentSemanticMode, schemaRegistry, queryType });
			process.exit(0);
		}
		
		// Special query types that don't need a whereClause
		if (queryType === 'showQueryInfo' || queryType === 'matchDiscrepancies' || queryType === 'unityCedsComparison') {
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

		// For queries that require whereClause, both parameters must have values
		if (queryType !== 'showQueryInfo' && queryType !== 'matchDiscrepancies' && queryType !== 'unityCedsComparison' && (!cleanQueryType || !cleanWhereClause)) {
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

		// Validate column names in WHERE clause using schema registry
		if (queryType !== 'showQueryInfo' && queryType !== 'matchDiscrepancies' && queryType !== 'unityCedsComparison' && config) {
			const semanticMode = getCurrentSemanticMode();
			const schema = schemaRegistry.getSchema(config.dataProfile, semanticMode);
			
			// Extract potential column names from WHERE clause
			// Simple regex to find word patterns that could be column names
			const columnPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*[=<>!]/g;
			const potentialColumns = [];
			let match;
			
			while ((match = columnPattern.exec(cleanWhereClause)) !== null) {
				potentialColumns.push(match[1]);
			}
			
			// Also check for LIKE patterns
			const likePattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s+like/gi;
			while ((match = likePattern.exec(cleanWhereClause)) !== null) {
				potentialColumns.push(match[1]);
			}
			
			// Check if any potential columns are invalid
			const allValidColumns = [...schema.sourceColumns];
			if (schema.joinable) {
				allValidColumns.push(...schema.vectorColumns);
			}
			
			for (const columnName of potentialColumns) {
				if (!allValidColumns.includes(columnName)) {
					// Enhanced suggestion logic with fuzzy matching
					const suggestions = allValidColumns
						.map(col => {
							const lowerCol = col.toLowerCase();
							const lowerInput = columnName.toLowerCase();
							
							// Exact match (shouldn't happen, but just in case)
							if (lowerCol === lowerInput) return { col, score: 1000 };
							
							// Substring match
							if (lowerCol.includes(lowerInput) || lowerInput.includes(lowerCol)) {
								return { col, score: 100 };
							}
							
							// Similar words (Definition vs Description)
							if ((lowerInput === 'definition' && lowerCol === 'description') ||
							    (lowerInput === 'description' && lowerCol === 'definition')) {
								return { col, score: 90 };
							}
							
							// Starts with same letters
							if (lowerCol.startsWith(lowerInput.substring(0, 3)) ||
							    lowerInput.startsWith(lowerCol.substring(0, 3))) {
								return { col, score: 50 };
							}
							
							return { col, score: 0 };
						})
						.filter(item => item.score > 0)
						.sort((a, b) => b.score - a.score)
						.map(item => item.col)
						.slice(0, 3);
					
					let errorMsg = `Invalid column name '${columnName}' for ${config.dataProfile} dataProfile.`;
					if (suggestions.length > 0) {
						errorMsg += ` Did you mean: ${suggestions.join(', ')}?`;
					}
					errorMsg += `\n   Available columns: ${allValidColumns.join(', ')}`;
					
					xLog.error(errorMsg);
					process.exit(1);
					return false;
				}
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

	return {
		validateInputs,
		sanitizeWhereClause,
		displayFieldHelp
	};
};

module.exports = moduleFunction;