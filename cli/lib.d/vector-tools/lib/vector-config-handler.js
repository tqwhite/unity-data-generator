#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const os = require('os');
const path = require('path');
const fs = require('fs');

// --------------------------------------------------------------------------------
// FIND PROJECT ROOT
const findProjectRoot = ({ rootFolderName = 'system', closest = true } = {}) =>
	__dirname.replace(
		new RegExp(`^(.*${closest ? '' : '?'}\/${rootFolderName}).*$`),
		'$1',
	);
const applicationBasePath = findProjectRoot();

//START OF moduleFunction() ============================================================
const moduleFunction =
	({ moduleName } = {}) =>
	({ unused }) => {
		
		/**
		 * Validates and extracts data profile configuration
		 * @param {string} configModuleName - The module name for config lookup
		 * @returns {Object} Configuration object with all profile settings
		 */
		const getProfileConfiguration = (configModuleName) => {
			const { xLog, getConfig, rawConfig, commandLineParameters } = process.global;
			const config = getConfig(configModuleName);
			const { databaseFilePath, openAiApiKey, defaultTargetTableName } = config;
			
			// Get and normalize data profile parameter
			const dataProfileRaw = commandLineParameters.values.dataProfile;
			const dataProfile = Array.isArray(dataProfileRaw) ? dataProfileRaw[0] : dataProfileRaw;
			
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
			
			// Validate required profile configuration
			if (!sourceTableName || !sourcePrivateKeyName || !sourceEmbeddableContentName.length) {
				xLog.error(`Invalid or missing configuration for data profile '${dataProfile}'`);
				xLog.error('Required settings: sourceTableName, sourcePrivateKeyName, sourceEmbeddableContentName');
				xLog.error(`Found: sourceTableName='${sourceTableName}', sourcePrivateKeyName='${sourcePrivateKeyName}', sourceEmbeddableContentName='${sourceEmbeddableContentNameStr}'`);
				return { isValid: false };
			}
			
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

		/**
		 * Logs configuration status messages in preferred order
		 * @param {Object} config - Configuration object from getProfileConfiguration
		 */
		const logConfigurationStatus = (config) => {
			const { xLog } = process.global;
			if (!config.isValid) return;
			
			xLog.status(`Database file path: ${config.databaseFilePath}`);
			xLog.status(`Data profile: ${config.dataProfile}`);
			
			if (config.isCustomTargetTable) {
				xLog.status(`Target table: ${config.vectorTableName} (custom)`);
			} else {
				xLog.status(`Target table: ${config.vectorTableName}`);
			}
			
			xLog.verbose(`Source table: ${config.sourceTableName}`);
			xLog.verbose(`Source key: ${config.sourcePrivateKeyName}`);
			xLog.verbose(`Embeddable content: ${config.sourceEmbeddableContentName.join(', ')}`);
		};

		return { 
			getProfileConfiguration,
			logConfigurationStatus
		};
	};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction({ moduleName })({});