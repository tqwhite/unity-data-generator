#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

// Module for calling Jina AI to generate XML segments based on field values.
// Provides function callJina which processes segments and attributes.

const qt = require('qtools-functional-library'); // Utility library
const fs = require('fs');

// START OF moduleFunction() ============================================================

const moduleFunction = function ({
	jinaCore,    // Jina AI core object for generating AI responses
	tempFilePath, // Temporary file path to write intermediate results
}) {
	const { xLog } = process.global; // Global logging utility

	// =========================================================================
	// MAIN FUNCTION CALL JINA

	// Main function to process a group and its children using Jina AI
	async function callJina({
		groupXPath,
		children,
		elementSpecWorksheet,
	}) {
		xLog.status(`\nProcessing segment: ${groupXPath} [${moduleName}]`);

		if (children && children.length > 0) {
			xLog.debug(children.join('; '), { label: 'children' });
		}

		// Prepare promptGenerationData
		const promptGenerationData = {
			elementSpecWorksheet,
			currentXml: '',           // No incumbent XML for first round
			potentialFinalObject: '', // No previous XML for first pass
		};

		// Get AI-generated response from jinaCore
		const { wisdom, rawAiResponseObject } = await jinaCore.getResponse(promptGenerationData, {});

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

		xLog.debug(wisdom, { label: 'WISDOM' });
		xLog.debug(`End callJina ${groupXPath} === [${moduleName}]\n`);

		return wisdom;
	}

	return { callJina };
};

// END OF moduleFunction() ============================================================

module.exports = moduleFunction;