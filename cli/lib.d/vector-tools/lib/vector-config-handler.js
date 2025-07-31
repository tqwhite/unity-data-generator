#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const os = require('os');
const path = require('path');
const fs = require('fs');

// =====================================================================
// PROJECT ROOT CONFIGURATION
// =====================================================================

// ---------------------------------------------------------------------
// findProjectRoot - locates the project root directory by searching for rootFolderName

const findProjectRoot = ({ rootFolderName = 'system', closest = true } = {}) =>
	__dirname.replace(
		new RegExp(`^(.*${closest ? '' : '?'}\/${rootFolderName}).*$`),
		'$1',
	);
const applicationBasePath = findProjectRoot();

// ---------------------------------------------------------------------
// moduleFunction - provides configuration handling and validation functionality

const moduleFunction =
	({ moduleName } = {}) =>
	({ unused }) => {
		
		// ---------------------------------------------------------------------
		// getProfileConfiguration - validates and extracts data profile configuration
		
		const getProfileConfiguration = (configModuleName) => {
			// Access directly instead of destructuring
			const xLog = process.global.xLog;
			const getConfig = process.global.getConfig;
			const rawConfig = process.global.rawConfig;
			const commandLineParameters = process.global.commandLineParameters;
			
			// Check if initialization is complete
			if (!getConfig) {
				console.error('Error: qtools-ai-framework not properly initialized. getConfig is not available.');
				return { isValid: false };
			}
			
			const config = getConfig(moduleName);

			const { databaseFilePath, openAiApiKey, defaultTargetTableName } = config;
			
			// Get and normalize data profile parameter
			const dataProfileRaw = commandLineParameters.values.dataProfile;
			const dataProfile = commandLineParameters.values.dataProfile[0];
			
			// Validate data profile is provided
			if (!dataProfile) {
				xLog.error('--dataProfile parameter is required');
				xLog.error('Available profiles: sif, ceds');
				xLog.error('Example: vectorTools --dataProfile=sif --showStats');
				return { isValid: false };
			}
			
			// Extract profile-specific settings from nested config object
			const profileSettings = config.dataProfiles?.[dataProfile];
			if (!profileSettings) {
				xLog.error(`Unknown data profile: '${dataProfile}'`);
				xLog.error('Available profiles: sif, ceds');
				return { isValid: false };
			}
			
			const sourceTableName = profileSettings.sourceTableName;
			const sourcePrivateKeyName = profileSettings.sourcePrivateKeyName;
			const sourceEmbeddableContentNameStr = profileSettings.sourceEmbeddableContentName;
			const profileDefaultTargetTableName = profileSettings.defaultTargetTableName;
			
			// Parse comma-separated embeddable content names
			const sourceEmbeddableContentName = sourceEmbeddableContentNameStr ? 
				sourceEmbeddableContentNameStr.split(',').map(s => s.trim()) : [];
			
			// Determine target table name (custom > profile default > global default)
			const vectorTableName =
				commandLineParameters.values.targetTableName || 
				profileDefaultTargetTableName || 
				defaultTargetTableName;
			
			// Return complete configuration
			return {
				isValid: true,
				dataProfile,
				databaseFilePath,
				openAiApiKey,
				sourceTableName,
				sourcePrivateKeyName,
				sourceEmbeddableContentName,
				vectorTableName,
				defaultTargetTableName,
				isCustomTargetTable: !!commandLineParameters.values.targetTableName
			};
		};

		// ---------------------------------------------------------------------
		// logConfigurationStatus - displays configuration status messages
		
		const logConfigurationStatus = (config) => {
			const { xLog } = process.global;
			xLog.status(`No longer wanted`);
		};

		return { 
			getProfileConfiguration,
			logConfigurationStatus
		};
	};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction({ moduleName });