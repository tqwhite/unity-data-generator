'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = ({ moduleName } = {}) => ({ unused } = {}) => {
	const { xLog, getConfig, rawConfig, commandLineParameters, projectRoot } = process.global;
	const moduleConfig = getConfig(moduleName);

	const reorganizeValidateConfig = (vectorToolsConfig) => {
		
		// Check if initialization is complete
		if (!getConfig) {
			console.error('Error: qtools-ai-framework not properly initialized. getConfig is not available.');
			process.exit(1)
		}
		
		const { databaseFilePath, openAiApiKey, defaultTargetTableName } = vectorToolsConfig;
		
		// Get and normalize data profile parameter
		const dataProfileRaw = commandLineParameters.values.dataProfile;
		const dataProfile = Array.isArray(dataProfileRaw) ? dataProfileRaw[0] : dataProfileRaw;
		
		// Validate data profile is provided
		if (!dataProfile) {
			xLog.error('--dataProfile parameter is required');
			process.exit(1);
		}
		
		// Extract profile-specific settings from nested config object
		const profileSettings = vectorToolsConfig.dataProfiles?.[dataProfile];
		if (!profileSettings) {
			xLog.error(`Unknown data profile: '${dataProfile}'`);
			xLog.error('Available profiles: sif, ceds');
			process.exit(1)
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
			process.exit(1)
		}
		
		// Determine target table name (custom > profile default > global default)
		const vectorTableName =
			commandLineParameters.values.targetTableName || 
			profileDefaultTargetTableName || 
			defaultTargetTableName;
		
		// Return complete configuration
		return {
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

	return { reorganizeValidateConfig };
};

module.exports = moduleFunction({ moduleName }); //returns initialized moduleFunction