#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const qt = require('qtools-functional-library');

// =====================================================================
// APPLICATION INITIALIZER - Framework setup and service initialization
// =====================================================================

const moduleFunction = ({ unused } = {}) => {
	const { xLog, getConfig, commandLineParameters } = process.global;
	const moduleConfig = getConfig(moduleName);

	// ---------------------------------------------------------------------
	// validateConfiguration - Ensure required config is present
	
	const validateConfiguration = (config) => {
		const required = ['databaseFilePath', 'dataProfiles'];
		const missing = [];
		
		required.forEach(field => {
			if (!config[field] && !config.qtGetSurePath(field)) {
				missing.push(field);
			}
		});
		
		if (missing.length > 0) {
			const traceId = Math.floor(Math.random() * 1e9);
			xLog.error(`[${traceId}] Missing required configuration: ${missing.join(', ')}`);
			throw new Error(`Configuration validation failed [trace:${traceId}]`);
		}
		
		// Validate data profile if specified
		const dataProfile = commandLineParameters.qtGetSurePath('values.dataProfile[0]');
		if (dataProfile) {
			const profileConfig = config.qtGetSurePath(`dataProfiles.${dataProfile}`);
			if (!profileConfig) {
				const traceId = Math.floor(Math.random() * 1e9);
				xLog.error(`[${traceId}] Unknown data profile: ${dataProfile}`);
				throw new Error(`Invalid data profile [trace:${traceId}]`);
			}
		}
		
		return true;
	};

	// ---------------------------------------------------------------------
	// assembleConfiguration - Merge and process configuration
	
	const assembleConfiguration = (baseConfig) => {
		const dataProfile = commandLineParameters.qtGetSurePath('values.dataProfile[0]');
		
		if (!dataProfile) {
			return baseConfig;
		}
		
		// Get profile-specific configuration
		const profileConfig = baseConfig.qtGetSurePath(`dataProfiles.${dataProfile}`, {});
		
		// Merge with base configuration
		const assembled = {
			...baseConfig,
			dataProfile,
			sourceTableName: profileConfig.sourceTableName,
			sourcePrivateKeyName: profileConfig.sourcePrivateKeyName,
			// Handle comma-separated field names
			sourceEmbeddableContentName: profileConfig.sourceEmbeddableContentName && profileConfig.sourceEmbeddableContentName.includes(',')
				? profileConfig.sourceEmbeddableContentName.split(',').map(field => field.trim())
				: profileConfig.sourceEmbeddableContentName,
			vectorTableName: profileConfig.defaultTargetTableName,
			atomicVectorTableName: profileConfig.atomicTargetTableName
		};
		
		// Add semantic analysis mode
		assembled.semanticAnalysisMode = commandLineParameters.qtGetSurePath('values.semanticAnalysisMode[0]')
			|| baseConfig.defaultSemanticAnalysisMode
			|| 'simpleVector';
			
		// Add semantic analyzer version
		assembled.semanticAnalyzerVersion = commandLineParameters.qtGetSurePath('values.semanticAnalyzerVersion[0]')
			|| 'atomic_version2';
		
		return assembled;
	};

	// ---------------------------------------------------------------------
	// initializeServices - Set up core services
	
	const initializeServices = async (config) => {
		const services = {};
		
		try {
			// Database service is initialized in main module
			// Progress tracker is initialized in main module
			// Semantic analyzer registry is initialized in main module
			
			// Add any additional service initialization here
			
			xLog.verbose('Application services initialized successfully');
			return services;
			
		} catch (error) {
			const traceId = error.traceId || Math.floor(Math.random() * 1e9);
			xLog.error(`[${traceId}] Service initialization failed: ${error.message}`);
			throw new Error(`Failed to initialize services [trace:${traceId}]`);
		}
	};

	// ---------------------------------------------------------------------
	// checkDatabaseConnection - Verify database is accessible
	
	const checkDatabaseConnection = (dbUtility, callback) => {
		dbUtility.query('SELECT 1 as test', [], (err, result) => {
			if (err) {
				const traceId = Math.floor(Math.random() * 1e9);
				xLog.error(`[${traceId}] Database connection test failed: ${err.message}`);
				callback(new Error(`Database not accessible [trace:${traceId}]`));
				return;
			}
			
			xLog.verbose('Database connection verified');
			callback(null, true);
		});
	};

	// ---------------------------------------------------------------------
	// checkVectorExtension - Verify sqlite-vec is available
	
	const checkVectorExtension = (dbUtility, callback) => {
		dbUtility.query('SELECT vec_version() as version', [], (err, result) => {
			if (err) {
				xLog.status('sqlite-vec extension not available - vector operations limited');
				callback(null, false);
				return;
			}
			
			const version = result[0]?.version;
			xLog.verbose(`sqlite-vec extension loaded: ${version}`);
			callback(null, true);
		});
	};

	// =====================================================================
	// PUBLIC INTERFACE
	// =====================================================================
	
	return {
		validateConfiguration,
		assembleConfiguration,
		initializeServices,
		checkDatabaseConnection,
		checkVectorExtension
	};
};

module.exports = moduleFunction;