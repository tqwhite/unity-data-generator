#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

//START OF moduleFunction() ============================================================

const moduleFunction = function (args = {}) {
	const { xLog } = process.global;

	// ================================================================================
	// LEGACY FORMAT SIMULATION

	const formatQueryResultsAsLegacy = (frameworkResult, originalQuery) => {
		// Handle multiple possible result formats
		const queryResults = frameworkResult?.queryResults || frameworkResult?.query_results || frameworkResult?.results;
		
		if (!frameworkResult || !queryResults || !Array.isArray(queryResults) || queryResults.length === 0) {
			return null;
		}

		const { totalResults, searchType, embeddingModel, search_metadata } = frameworkResult;

		// Generate the final summary first (like legacy)
		const summary = `Found ${queryResults.length} valid matches for "${originalQuery}"`;

		// Generate the numbered results (like legacy format)
		const numberedResults = queryResults.map((result, index) => {
			const score = result.distance || result.score || result.similarity || 0.0;
			const refId = result.refId || result.record?.GlobalID || result.record?.refId || `result${index + 1}`;
			
			// Build description from record fields (same logic as legacy)
			let definition = '';
			if (result.record) {
				const record = result.record;
				if (record.Definition) {
					// CEDS format
					definition = record.Definition;
				} else if (record.Description && record.XPath) {
					// SIF format: Description | XPath
					definition = `${record.Description} | ${record.XPath}`;
				} else if (record.Description) {
					// SIF format: Description only
					definition = record.Description;
				} else if (record.description) {
					definition = record.description;
				} else if (record.Element) {
					definition = record.Element;
				} else {
					// Fallback to any string field
					definition = Object.values(record).find(val => typeof val === 'string' && val.length > 10) || 'No description available';
				}
			} else {
				definition = result.Definition || result.definition || 'Framework result';
			}
			
			return `${index + 1}. [score: ${score.toFixed(6)}] ${refId} ${definition}`;
		}).join('\n');

		// Return clean legacy format (summary + results, no expansion analysis)
		return `${summary}\n${numberedResults}\n`;
	};

	const generateMockExpansionAnalysis = (query, results) => {
		return `

╔═══════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                                      QUERY EXPANSION ANALYSIS                                         ║
╚═══════════════════════════════════════════════════════════════════════════════════════════════════════╝
├─ Original Query: "${query}"
│
├─ Enriched String 1 [primary_context]: "${query} serves as Framework-generated query in AI Processing, qtools-ai-framework domain"
│   ${results.slice(0, 3).map((result, index) => {
		const score = result.similarity || (0.8 + Math.random() * 0.2);
		const refId = result.refId || `mock${String(index + 1).padStart(3, '0')}`;
		const definition = result.Definition || result.definition || 'Framework result';
		return `├─ [${score.toFixed(4)}] RefID: ${refId} (primary_context: "${definition.substring(0, 80)}...")`;
	}).join('\n│   ')}
│
├─ Enriched String 2 [framework_analysis]: "Query processed via qtools-ai-framework thought process"
│   ├─ [0.9500] Framework: Successfully routed to Vector_Query_Thought_Process
│   ├─ [0.9300] Integration: Parameter mapping working correctly  
│   ├─ [0.9100] Results: Framework thinker returned structured data
│   └─ [0.9000] Format: Converting framework wisdom to legacy display format
│
└─ Framework Metadata:
    ├─ Thought Process: Vector_Query_Thought_Process
    ├─ Processing Mode: ${results[0]?.factType || 'framework_mock'}
    ├─ Results Format: Framework → Legacy Conversion
    └─ Integration Status: ✓ Parameter mapping and result formatting successful`;
	};

	// ================================================================================
	// VECTOR GENERATION RESULT FORMATTING

	const formatVectorGenerationResultsAsLegacy = (frameworkResult) => {
		if (!frameworkResult) {
			return 'No results from framework vector generation';
		}

		const {
			recordsProcessed = 0,
			vectorsGenerated = 0,
			vectorTableName = 'unknown',
			embeddingModel = 'framework-model'
		} = frameworkResult;

		return `
Vector Generation Complete:
- Records Processed: ${recordsProcessed}
- Vectors Generated: ${vectorsGenerated}
- Target Table: ${vectorTableName}
- Embedding Model: ${embeddingModel}
- Processing Route: qtools-ai-framework

✓ Framework integration successful`;
	};

	// ================================================================================
	// MAIN FORMAT DISPATCHER

	const formatFrameworkResultAsLegacy = (frameworkResult, operation, originalParams = {}) => {
		xLog.verbose(`${moduleName}: Formatting ${operation} result as legacy output`);

		if (!frameworkResult) {
			return 'No results returned from framework processing';
		}

		switch (operation) {
			case 'query':
				return formatQueryResultsAsLegacy(frameworkResult, originalParams.queryString || 'framework query');

			case 'generateVectors':
				return formatVectorGenerationResultsAsLegacy(frameworkResult);

			default:
				// Generic framework result display
				return `Framework Processing Complete:
Operation: ${operation}
Result Type: ${typeof frameworkResult}
${frameworkResult._frameworkSuccess ? '✓ Framework integration successful' : '⚠ Framework processing completed with warnings'}

Raw Framework Output:
${JSON.stringify(frameworkResult, null, 2)}`;
		}
	};

	// ================================================================================
	// CONSOLE OUTPUT HELPERS

	const printFormattedResult = (formattedResult) => {
		if (formattedResult) {
			console.log(formattedResult);
		} else {
			console.log('No formatted output available');
		}
	};

	const extractParametersFromOriginalCall = (commandLineParameters) => {
		const { values } = commandLineParameters;
		return {
			queryString: values.queryString?.[0],
			dataProfile: values.dataProfile?.[0],
			semanticAnalysisMode: values.semanticAnalysisMode?.[0],
			resultCount: values.resultCount?.[0]
		};
	};

	// ================================================================================
	// PUBLIC API

	return {
		formatFrameworkResultAsLegacy,
		formatQueryResultsAsLegacy,
		formatVectorGenerationResultsAsLegacy,
		printFormattedResult,
		extractParametersFromOriginalCall
	};
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;