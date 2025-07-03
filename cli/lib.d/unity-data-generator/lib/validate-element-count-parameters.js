#!/usr/bin/env node
'use strict';
// Suppress punycode deprecation warning
process.noDeprecation = true;

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

// const qt = require('qtools-functional-library'); //also exposes qtLog(); qt.help({printOutput:true, queryString:'.*', sendJson:false});

const os = require('os');
const path = require('path');
const fs = require('fs');


//START OF moduleFunction() ============================================================
const moduleFunction =
	({ moduleName } = {}) =>
	({ thoughtProcessName }) => {
		const { xLog, getConfig, rawConfig, commandLineParameters } =
			process.global;
		const localConfig = getConfig(moduleName); //moduleName is closure
		
		if (!commandLineParameters.values.elementCounts) {
			return;
		}

		try {
			// Get the same spreadsheet path that get-all-elements uses
			const { thinkerParameters } = getConfig(thoughtProcessName);
			const elementSpecWorksheetPath =
				thinkerParameters.qtGetSurePath(
					'get-specification-data.spreadsheetPath',
				) ||
				thinkerParameters.qtGetSurePath('elementSpecWorksheetPath') ||
				thinkerParameters.qtGetSurePath('spreadsheetPath');

			if (!elementSpecWorksheetPath) {
				xLog.error(
					'ERROR: Cannot validate elementCounts - spreadsheet path not found in configuration',
				);
				process.exit(1);
			}

			// Read spreadsheet to get available elements
			const xlsx = require('xlsx');
			const workbook = xlsx.readFile(elementSpecWorksheetPath);
			const availableElements = workbook.SheetNames;

			// Parse and validate elementCounts
			const elementCounts = commandLineParameters.values.elementCounts;
			const invalidElements = [];

			elementCounts.forEach((countSpec) => {
				const [elementName, count] = countSpec.split(':');
				if (!availableElements.includes(elementName)) {
					invalidElements.push(elementName);
				}
			});

			// Show error and exit if any invalid elements found
			if (invalidElements.length > 0) {
				const errorMessage =
					invalidElements.length === 1
						? `Element '${invalidElements[0]}' specified in --elementCounts does not exist in spreadsheet.`
						: `Elements ${invalidElements.map((name) => `'${name}'`).join(', ')} specified in --elementCounts do not exist in spreadsheet.`;
				xLog.error(
					`ERROR: ${errorMessage} Available elements: ${availableElements.join(', ')}`,
				);
				process.exit(1);
			}

			xLog.status(
				`Validated elementCounts: all specified elements exist in spreadsheet`,
			);
		} catch (error) {
			xLog.error(`ERROR: Failed to validate elementCounts: ${error.message}`);
			process.exit(1);
		}
		
	};

//END OF moduleFunction() ============================================================


module.exports = moduleFunction({ moduleName }); //returns initialized moduleFunction
