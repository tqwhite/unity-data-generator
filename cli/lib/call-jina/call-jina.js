#!/usr/bin/env node
'use strict';

// Module for calling Jina AI to generate XML segments based on field values.
// Provides function callJina which processes segments and attributes.

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');
// moduleName is the name of the current module, without path and extension.

const qt = require('qtools-functional-library'); // Utility library
const fs = require('fs');

// START OF moduleFunction() ============================================================

const moduleFunction = function ({
	addXmlElement, // Function to add a child XML element to a parent element
	getFieldValue, // Function to retrieve a field value based on XPath and field name
	createXmlElement, // Function to create a new XML element with optional attributes and value
	knownIds, // Array of known IDs to avoid duplicates
	createUUID, // Function to generate a unique UUID
	jinaCore, // Jina AI core object for generating AI responses
	xmlVersionStack, // Stack to keep track of XML versions for comparison
	commandLineParameters, // Command line parameters passed to the script
	tempFilePath, // Temporary file path to write intermediate results
}) {
	const { xLog } = process.global; // Global logging utility
	const localConfig = {}; // Placeholder for module-specific configuration

	// Function to check if an object is a duplicate
	const isDuplicate = (() => {
		let existingObjects = new Set();
		return (inputObject) => {
			const objectString = JSON.stringify(inputObject);
			if (existingObjects.has(objectString)) {
				return true;
			} else {
				existingObjects.add(objectString);
				return false;
			}
		};
	})();

	// =========================================================================
	// GENERATE PROMPT
	// Function to create an operateJina function with access to jinaCore
	const operateJinaActual = ({ jinaCore }) => {
		// Helper function of callJina to generate XML segments using Jina AI
		return async function operateJina({
			leafXPath,
			fields,
			segmentStack,
			elementSpecWorksheet,
		}) {
			const specObj = {};

			// Collect relevant field values for the current leafXPath
			specObj.Name = getFieldValue(leafXPath, 'Name', fields);
			specObj.Description = getFieldValue(leafXPath, 'Description', fields);
			specObj.XPath = getFieldValue(leafXPath, 'XPath', fields);
			specObj.Format = getFieldValue(leafXPath, 'Format', fields);

			// Reduce the Format field to first 20 codes to avoid exceeding token count
			function reduceToFirstN(inputString, n) {
				const values = inputString.split(', ');
				const reducedValues = values.slice(0, n);
				return reducedValues.join(', ');
			}
			specObj.Format = reduceToFirstN(specObj.Format, 20);

			// Check for duplicates to avoid redundant processing
			if (isDuplicate(specObj)) {
				return null;
			}

			const currentXml = segmentStack.qtLast();
			const potentialFinalObject = xmlVersionStack.qtLast();
			const promptGenerationData = {
			elementSpecWorksheet,
				specObj,
				currentXml,
				potentialFinalObject,
			};

			xLog.debug(specObj.XPath, {label:"specObj.XPath"});
			xLog.debug(specObj.Description, {label:"specObj.Description"});

			// Get AI-generated response from jinaCore
			const { wisdom, rawAiResponseObject, thinkerResponses, lastThinkerName } =
				await jinaCore.getResponse(promptGenerationData, {});

			xLog.debug(wisdom, {label:"WISDOM"});
			// Handle errors or invalid responses
			if (rawAiResponseObject.isError) {
				const message = rawAiResponseObject.err;
				xLog.error(
					`\n=-=============   ERROR (${message})  ========================= [call-jina.js.operateJina]\n`,
				);
				xLog.error(rawAiResponseObject);
				process.exit();
			}

			// Update the stacks with the new wisdom
			segmentStack.push(wisdom);
			xmlVersionStack.push(thinkerResponses[lastThinkerName].wisdom);

			return wisdom;
		};
	};

	// =========================================================================
	// MAIN FUNCTION CALL JINA

	// Main function to process a group and its children using Jina AI
	async function callJina({ groupXPath, children, fields, elementSpecWorksheet }) {
		const groupParts = groupXPath.split('/');
		const groupKey = groupParts[groupParts.length - 1];
		const group = createXmlElement(groupKey); // Create the group element
		const backlog = []; // Backlog for attributes
		let wisdom;

		xLog.status(`\nProcessing segment: ${groupXPath} [call-jina.js.callJina]`);
		children.join('; ') && xLog.debug(children.join('; '), {label:'children'});

		const operateJina = operateJinaActual({ jinaCore });

		// Process child elements first
		for (const childXPath of children) {
			const segmentStack = ['First pass. Make new XML.'];
			const childParts = childXPath.split('/');
			const childKey = childParts[childParts.length - 1];

			if ('@' !== childKey[0]) {
				// Process element
				const operateJinaResult = await operateJina({
					leafXPath: childXPath,
					fields,
					segmentStack,
					elementSpecWorksheet,
				});
				wisdom = operateJinaResult ? operateJinaResult : wisdom;
				const child = createXmlElement(childKey, {}, operateJinaResult);
				addXmlElement(child, group);
			} else {
				// Queue attributes for later processing
				backlog.push(childXPath);
			}
		}

		// Process attributes after their parent elements have been created
		for (const childXPath of backlog) {
			const segmentStack = ['First round. No incumbent XML.'];
			const childParts = childXPath.split('/');
			const childKey = childParts[childParts.length - 1];
			const key = childKey.slice(1); // Remove '@' from attribute name

			if (childXPath.startsWith(groupXPath + '/@')) {
				// Group attribute
				const operateJinaResult = await operateJina({
					leafXPath: childXPath,
					fields,
					segmentStack,
					elementSpecWorksheet,
				});
				wisdom = operateJinaResult ? operateJinaResult : wisdom;
				group[groupKey].$[key] = operateJinaResult;
			} else {
				// Child attributes
				const elementKey = childParts[childParts.length - 2];
				for (const sequence of group[groupKey][elementKey]) {
					const operateJinaResult = await operateJina({
						leafXPath: childXPath,
						fields,
						segmentStack,
						elementSpecWorksheet,
					});
					wisdom = operateJinaResult ? operateJinaResult : wisdom;
					sequence.$[key] = operateJinaResult;
				}
			}
		}

		// Write intermediate results to temp file if specified
		if (tempFilePath) {
			wisdom &&
				fs.writeFileSync(
					tempFilePath,
					`<!-- last xPath: ${groupXPath} -->\n${wisdom}`,
				);
		}

		xLog.debug(
			`End callJina ${groupXPath} ========================= [call-jina.js.callJina]\n`,
		);

		return wisdom;
	}

	return { callJina };
};

// END OF moduleFunction() ============================================================

module.exports = moduleFunction;
