'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = function (args = {}) {
	const { xLog, getConfig } = process.global;
	
	// ===================================================================================
	// Configuration for queryString version selection
	
	const queryChoice = 'version1'; // Simple vector currently only has version1
	
	const systemPromptGen = require(`./queryStrings/${queryChoice}/${queryChoice}`)();
	
	xLog.status(`Using simple-vector queryString version: ${queryChoice}`);

	// ===================================================================================
	// Expose methods from the chosen queryString version
	
	const processQueryString = systemPromptGen.processQueryString;
	const scoringMethod = systemPromptGen.scoringMethod;

	// ===================================================================================

	return { processQueryString, scoringMethod };
};

module.exports = moduleFunction;