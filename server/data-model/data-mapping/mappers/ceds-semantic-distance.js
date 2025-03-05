'use strict';

module.exports = (args = {}) => {
	let { result } = args;
	
	// Ensure result is not null/undefined
	if (!result) {
		return {
			data: [],
			error: 'No results returned from command'
		};
	}
	
	// If result is already an array of objects with distance and text properties, use it directly
	if (Array.isArray(result) && result.length > 0 && typeof result[0] === 'object') {
		return {
			data: result,
			error: null
		};
	}
	
	// If result is a string, try to parse it as JSON
	if (typeof result === 'string') {
		try {
			const parsedResult = JSON.parse(result);
			
			// Check if parsed result is an array
			if (Array.isArray(parsedResult)) {
				return {
					data: parsedResult,
					error: null
				};
			} else {
				// If it's not an array, wrap it in an array
				return {
					data: [parsedResult],
					error: null
				};
			}
		} catch (e) {
			// If parsing fails, return the string as a message
			return {
				data: [],
				error: `Failed to parse result as JSON: ${e.message}. Raw result: ${result}`
			};
		}
	}
	
	// If result is neither an array nor a string, wrap it in an array
	return {
		data: Array.isArray(result) ? result : [result],
		error: null
	};
};