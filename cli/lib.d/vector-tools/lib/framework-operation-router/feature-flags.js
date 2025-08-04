#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

//START OF moduleFunction() ============================================================

const moduleFunction = function (args = {}) {
	const { xLog, getConfig } = process.global;

	// ================================================================================
	// FEATURE FLAG CONFIGURATION

	const getFeatureFlagConfig = () => {
		// Get feature flags from featureFlags configuration section
		const featureFlags = getConfig('featureFlags') || {};

		// Default feature flag settings (safe defaults - prefer legacy)
		const defaultFlags = {
			// Framework integration flags
			enableFrameworkRouting: false,  // Master switch for framework routing
			enableFrameworkForQueries: false,  // Use framework for query operations
			enableFrameworkForVectorGeneration: false,  // Use framework for vector generation
			enableFrameworkForManagement: false,  // Use framework for database management
			
			// Safety flags
			enableFrameworkFallback: true,  // Fallback to legacy on framework failure
			enableFrameworkLogging: true,   // Enhanced logging for framework operations
			enableFrameworkValidation: true, // Validate framework results
			enableFrameworkMetrics: true,   // Collect framework performance metrics
		};

		// Merge configuration with defaults
		return { ...defaultFlags, ...featureFlags };
	};

	// ================================================================================
	// FEATURE FLAG EVALUATION

	const shouldUseFramework = (operation, commandLineParameters, operationContext = {}) => {
		const flags = getFeatureFlagConfig();
		const { switches, values } = commandLineParameters;

		// Priority 1: Explicit CLI override always wins
		if (switches.useFramework) {
			xLog.verbose(`${moduleName}: Framework forced via -useFramework flag`);
			return { useFramework: true, reason: 'explicit_cli_flag' };
		}

		if (switches.useLegacy) {
			xLog.verbose(`${moduleName}: Legacy forced via -useLegacy flag`);
			return { useFramework: false, reason: 'explicit_cli_flag' };
		}

		// Priority 2: Master framework switch must be enabled
		if (!flags.enableFrameworkRouting) {
			xLog.verbose(`${moduleName}: Framework routing disabled by master switch`);
			return { useFramework: false, reason: 'master_switch_disabled' };
		}

		// Priority 3: Operation-specific flags
		switch (operation) {
			case 'query':
				if (!flags.enableFrameworkForQueries) {
					return { useFramework: false, reason: 'query_operations_disabled' };
				}
				break;

			case 'generateVectors':
				if (!flags.enableFrameworkForVectorGeneration) {
					return { useFramework: false, reason: 'vector_generation_disabled' };
				}
				break;

			case 'showStats':
			case 'dropTable':
			case 'rebuildDatabase':
				if (!flags.enableFrameworkForManagement) {
					return { useFramework: false, reason: 'management_operations_disabled' };
				}
				break;

			default:
				return { useFramework: false, reason: 'unknown_operation' };
		}

		// All checks passed - use framework
		xLog.verbose(`${moduleName}: All feature flag checks passed - using framework`);
		return { useFramework: true, reason: 'feature_flags_enabled' };
	};

	// ================================================================================
	// FALLBACK HANDLER

	const handleFrameworkFailure = (error, operation, commandLineParameters, legacyOperations) => {
		const flags = getFeatureFlagConfig();

		if (!flags.enableFrameworkFallback) {
			xLog.error(`${moduleName}: Framework failed and fallback disabled - throwing error`);
			throw error;
		}

		xLog.status(`${moduleName}: Framework operation failed, falling back to legacy`);
		xLog.status(`Framework error: ${error.message}`);

		// Log framework failure for metrics
		if (flags.enableFrameworkMetrics) {
			xLog.saveProcessFile(
				'framework-failures.log',
				`${new Date().toISOString()} - Operation: ${operation} - Error: ${error.message}\n`,
				{ append: true }
			);
		}

		// Execute legacy fallback
		return executeLegacyFallback(operation, legacyOperations, commandLineParameters);
	};

	const executeLegacyFallback = async (operation, legacyOperations, commandLineParameters) => {
		xLog.status(`${moduleName}: Executing legacy fallback for ${operation}`);

		if (!legacyOperations) {
			throw new Error('Legacy operations not available for fallback');
		}

		// Use the same legacy operation logic from the router
		switch (operation) {
			case 'query':
				return await legacyOperations.queryVectorDatabase();
			case 'generateVectors':
				return await legacyOperations.createVectorDatabase();
			case 'showStats':
				return await legacyOperations.showDatabaseStats();
			case 'dropTable':
				return await legacyOperations.dropVectorTable();
			case 'rebuildDatabase':
				return await legacyOperations.rebuildVectorDatabase();
			case 'directQuery':
				return await legacyOperations.directQueryTool();
			default:
				if (legacyOperations.showHelp) {
					legacyOperations.showHelp();
				}
				return null;
		}
	};

	// ================================================================================
	// VALIDATION AND METRICS

	const validateFrameworkResult = (frameworkResult, operation) => {
		const flags = getFeatureFlagConfig();

		if (!flags.enableFrameworkValidation) {
			return { valid: true, reason: 'validation_disabled' };
		}

		// Basic result validation
		if (!frameworkResult) {
			return { valid: false, reason: 'null_result' };
		}

		// Operation-specific validation
		switch (operation) {
			case 'query':
				if (!frameworkResult.queryResults && !frameworkResult.results && !frameworkResult.query_results) {
					return { valid: false, reason: 'missing_query_results' };
				}
				break;

			case 'generateVectors':
				if (typeof frameworkResult.recordsProcessed === 'undefined') {
					return { valid: false, reason: 'missing_processing_stats' };
				}
				break;
		}

		return { valid: true, reason: 'validation_passed' };
	};

	const recordFrameworkMetrics = (operation, startTime, endTime, success, error = null) => {
		const flags = getFeatureFlagConfig();

		if (!flags.enableFrameworkMetrics) {
			return;
		}

		const metrics = {
			timestamp: new Date().toISOString(),
			operation,
			duration: endTime - startTime,
			success,
			error: error ? error.message : null
		};

		xLog.saveProcessFile(
			'framework-metrics.log',
			JSON.stringify(metrics) + '\n',
			{ append: true }
		);
	};

	// ================================================================================
	// PUBLIC API

	return {
		getFeatureFlagConfig,
		shouldUseFramework,
		handleFrameworkFailure,
		validateFrameworkResult,
		recordFrameworkMetrics
	};
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;