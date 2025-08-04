#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

//START OF moduleFunction() ============================================================

const moduleFunction = function (args = {}) {
	const { xLog } = process.global;
	
	// Import result formatter
	const resultFormatterGen = require('./result-formatter');
	const resultFormatter = resultFormatterGen({});

	// ================================================================================
	// CLI TO FRAMEWORK PARAMETER MAPPING

	const mapCliParametersToFramework = (commandLineParameters, operation) => {
		const { switches, values } = commandLineParameters;

		// Base parameters common to all operations
		const baseParams = {
			dataProfile: values.dataProfile?.[0] || 'ceds',
			verbose: switches.verbose || false,
			debug: switches.debug || false,
		};

		// Operation-specific parameter mapping
		switch (operation) {
			case 'query':
				return {
					...baseParams,
					queryString: values.queryString?.[0],
					semanticAnalysisMode: values.semanticAnalysisMode?.[0] || 'atomicVector',
					resultCount: parseInt(values.resultCount?.[0] || '5'),
					// Ensure parameters are accessible to thinkers
					latestWisdom: {
						queryString: values.queryString?.[0],
						semanticAnalysisMode: values.semanticAnalysisMode?.[0] || 'atomicVector',
						resultCount: parseInt(values.resultCount?.[0] || '5'),
						dataProfile: values.dataProfile?.[0] || 'ceds',
					}
				};

			case 'generateVectors':
				return {
					...baseParams,
					semanticAnalysisMode: values.semanticAnalysisMode?.[0] || 'simpleVector',
					offset: parseInt(values.offset?.[0] || '0'),
					limit: parseInt(values.limit?.[0] || '1000'),
					targetTableName: values.targetTableName?.[0],
					batchId: values.batchId?.[0],
					// Ensure parameters are accessible to thinkers
					latestWisdom: {
						dataProfile: values.dataProfile?.[0] || 'ceds',
						semanticAnalysisMode: values.semanticAnalysisMode?.[0] || 'simpleVector',
						offset: parseInt(values.offset?.[0] || '0'),
						limit: parseInt(values.limit?.[0] || '1000'),
						targetTableName: values.targetTableName?.[0],
						batchId: values.batchId?.[0],
					}
				};

			default:
				return {
					...baseParams,
					latestWisdom: baseParams
				};
		}
	};

	// ================================================================================
	// FRAMEWORK TO CLI RESULT MAPPING

	const mapFrameworkResultToCli = (wisdom, operation, originalParams = {}) => {
		if (!wisdom) {
			return null;
		}

		// Use result formatter to convert framework results to legacy format
		const legacyFormattedOutput = resultFormatter.formatFrameworkResultAsLegacy(
			wisdom, 
			operation, 
			originalParams
		);

		// Return structured result that includes both legacy format and raw data
		const mappedResult = {
			// Legacy format output for console display
			_legacyFormatOutput: legacyFormattedOutput,
			// Structured data for programmatic access
			results: wisdom.queryResults || [],
			queryString: wisdom.queryString || originalParams.queryString,
			totalResults: wisdom.totalResults || (wisdom.queryResults ? wisdom.queryResults.length : 0),
			searchType: wisdom.searchType || 'framework',
			embeddingModel: wisdom.embeddingModel || 'framework-model',
			// Framework metadata
			_frameworkMetadata: {
				thoughtProcess: wisdom._thoughtProcess,
				processingTime: wisdom._processingTime,
				debugInfo: wisdom._debugInfo,
				operation: operation,
				integrationStatus: 'successful'
			}
		};

		// Operation-specific data enhancement
		if (operation === 'generateVectors') {
			Object.assign(mappedResult, {
				recordsProcessed: wisdom.recordsProcessed || 0,
				vectorsGenerated: wisdom.vectorsGenerated || 0,
				vectorTableName: wisdom.vectorTableName
			});
		}

		return mappedResult;
	};

	// ================================================================================
	// VALIDATION

	const validateRequiredParameters = (operation, parameters) => {
		switch (operation) {
			case 'query':
				if (!parameters.queryString) {
					throw new Error('queryString is required for query operations');
				}
				break;

			case 'generateVectors':
				if (!parameters.dataProfile) {
					throw new Error('dataProfile is required for vector generation operations');
				}
				break;
		}

		return true;
	};

	// ================================================================================
	// ENHANCED PARAMETER INJECTION

	const injectParametersIntoFacilitators = (facilitators, mappedParameters) => {
		// The framework expects parameters to be passed via findTheAnswer() call
		// rather than injected into facilitators. The parameter injection should 
		// happen at the framework params level, not the facilitator level.
		// This function serves as a placeholder for future facilitator-specific needs.
		
		xLog.verbose('Parameter injection: Framework will receive parameters via findTheAnswer call');
		
		return facilitators;
	};

	// ================================================================================
	// PARAMETER EXTRACTION HELPER

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
		mapCliParametersToFramework,
		mapFrameworkResultToCli,
		validateRequiredParameters,
		injectParametersIntoFacilitators,
		extractParametersFromOriginalCall
	};
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;