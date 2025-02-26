#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

// Module for calling Jina AI to generate XML segments based on field values.
// Provides function facilitator which processes segments and attributes.

const qt = require('qtools-functional-library'); // Utility library
const fs = require('fs');

// START OF moduleFunction() ============================================================

const moduleFunction = function ({
	jinaCore,
	thoughtProcessName,
	tempFilePath, // Temporary file path to write intermediate results
}) {
	const { xLog } = process.global; // Global logging utility
	xLog.status(`using thoughtProcess '${thoughtProcessName}' in [${moduleName}]`);

	const jinaConversation = jinaCore.conversationGenerator({
		thoughtProcessName,
	}); // provides .getResponse()

	// =========================================================================
	// MAIN FUNCTION CALL JINA

	// Main function to process a group and its children using Jina AI
	async function facilitator(passThroughObject) {
		const options={}
		// Get AI-generated response from jinaConversation
		// passThroughObject comes from task-runner, contains initialThinkerData
		const { latestWisdom, args } = await jinaConversation.getResponse(
			passThroughObject,
			options,
		);
		
// 		const {rawAiResponseObject}={NOTE: "get this from the args object if I still want this out here"};
// 		
// 		// Handle errors or invalid responses
// 		if (rawAiResponseObject.isError) {
// 			const message = rawAiResponseObject.err;
// 			xLog.error(`\n=== ERROR (${message}) === [${moduleName}]\n`);
// 			xLog.error(rawAiResponseObject);
// 			process.exit();
// 		}

		xLog.verbose(latestWisdom, { label: moduleName });

		return {latestWisdom, args};
	}

	return { facilitator };
};

// END OF moduleFunction() ============================================================

module.exports = moduleFunction;
