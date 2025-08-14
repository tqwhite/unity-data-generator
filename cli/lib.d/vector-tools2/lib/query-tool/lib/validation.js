'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = function (args = {}) {
	const { xLog } = process.global;

	// Validate query type against registry
	function validateQueryType(queryType, queryRegistry) {
		if (!queryType) {
			xLog.error('--query parameter is required');
			xLog.status('Available query types: ' + Object.keys(queryRegistry).join(', '));
			process.exit(1);
			return false;
		}

		const cleanQueryType = typeof queryType === 'string' ? queryType : String(queryType || '');

		if (!queryRegistry[cleanQueryType]) {
			const validTypes = Object.keys(queryRegistry).join(', ');
			xLog.error(`Invalid query type: ${cleanQueryType}. Valid types: ${validTypes}`);
			process.exit(1);
			return false;
		}

		return true;
	}

	// Validate WHERE clause for basic security and syntax
	function validateWhereClause(whereClause) {
		// Some queries don't require a WHERE clause
		if (!whereClause) {
			return true;
		}

		const cleanWhereClause = typeof whereClause === 'string' ? whereClause : String(whereClause || '');

		// Validate WHERE clause for SQL injection prevention
		const dangerousPatterns = [';', '--', '/*', '*/', 'DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE'];
		
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

	// Sanitize WHERE clause for proper SQL formatting
	function sanitizeWhereClause(whereClause) {
		if (!whereClause) {
			return null;
		}

		// Convert double quotes to single quotes for SQLite string literals
		// This handles cases like: createdAt>"2025-07-01" -> createdAt>'2025-07-01'
		let sanitized = whereClause
			.replace(/([><=!]+)"([^"]+)"/g, "$1'$2'")  // Convert >"value" to >'value'
			.replace(/\s+"([^"]+)"/g, " '$1'")         // Convert standalone "value" to 'value'  
			.replace(/^"([^"]+)"/g, "'$1'");          // Convert leading "value" to 'value'
		
		xLog.debug(`Sanitized WHERE clause: ${whereClause} -> ${sanitized}`);
		return sanitized;
	}

	// Advanced column validation (if schema information is available)
	function validateColumnNames(whereClause, availableColumns) {
		if (!whereClause || !availableColumns) {
			return true;
		}

		// Extract potential column names from WHERE clause
		const columnPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*[=<>!]/g;
		const likePattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s+like/gi;
		const potentialColumns = [];
		let match;
		
		// Find columns in comparison operators
		while ((match = columnPattern.exec(whereClause)) !== null) {
			potentialColumns.push(match[1]);
		}
		
		// Find columns in LIKE operators
		while ((match = likePattern.exec(whereClause)) !== null) {
			potentialColumns.push(match[1]);
		}
		
		// Check if any potential columns are invalid
		for (const columnName of potentialColumns) {
			if (!availableColumns.includes(columnName)) {
				// Provide helpful suggestions
				const suggestions = availableColumns
					.filter(col => {
						const lowerCol = col.toLowerCase();
						const lowerInput = columnName.toLowerCase();
						return lowerCol.includes(lowerInput) || 
							   lowerInput.includes(lowerCol) ||
							   lowerCol.startsWith(lowerInput.substring(0, 3));
					})
					.slice(0, 3);
				
				let errorMsg = `Invalid column name '${columnName}'.`;
				if (suggestions.length > 0) {
					errorMsg += ` Did you mean: ${suggestions.join(', ')}?`;
				}
				errorMsg += `\n   Available columns: ${availableColumns.join(', ')}`;
				
				xLog.error(errorMsg);
				return false;
			}
		}

		return true;
	}

	return {
		validateQueryType,
		validateWhereClause,
		sanitizeWhereClause,
		validateColumnNames
	};
};

module.exports = moduleFunction;