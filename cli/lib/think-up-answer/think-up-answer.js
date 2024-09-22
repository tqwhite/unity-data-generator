#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

// Module for calling Jina AI to generate XML segments based on field values.
// Provides function jinaResponder which processes segments and attributes.

const qt = require('qtools-functional-library'); // Utility library
const fs = require('fs');

// START OF moduleFunction() ============================================================

const moduleFunction = function ({
	jinaCore,
	thoughtProcessName,
	tempFilePath, // Temporary file path to write intermediate results
}) {
	const { xLog } = process.global; // Global logging utility

	const jinaConversation = jinaCore.conversationGenerator({
		thoughtProcessName,
	}); // provides .getResponse()

	// =========================================================================
	// MAIN FUNCTION CALL JINA

	// Main function to process a group and its children using Jina AI
	async function jinaResponder(promptReplacementObject) {
		const { groupXPath, children, elementSpecWorksheetJson } =
			promptReplacementObject;

		// Prepare promptGenerationData
		const promptGenerationData = {
			promptReplacementObject,
			elementSpecWorksheetJson,
			currentXml: '', // No incumbent XML for first round
			potentialFinalObject: '', // No previous XML for first pass
		};

		// Get AI-generated response from jinaConversation
		const { wisdom, rawAiResponseObject } = await jinaConversation.getResponse(
			promptGenerationData,
			{},
		);

		// Handle errors or invalid responses
		if (rawAiResponseObject.isError) {
			const message = rawAiResponseObject.err;
			xLog.error(`\n=== ERROR (${message}) === [${moduleName}]\n`);
			xLog.error(rawAiResponseObject);
			process.exit();
		}

		// Write intermediate results to temp file if specified
		if (tempFilePath && wisdom) {
			fs.writeFileSync(
				tempFilePath,
				`<!-- last xPath: ${groupXPath} -->\n${wisdom}`,
			);
		}

		xLog.verbose(wisdom, { label: 'WISDOM' });

		return wisdom;
	}

	return { jinaResponder };
};

// END OF moduleFunction() ============================================================

module.exports = moduleFunction;
