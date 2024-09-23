#!/usr/bin/env node
'use strict';
const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

const path = require('path');
const fs = require('fs');

// START OF moduleFunction() ============================================================
const moduleFunction =
	() =>
	({ xmlRefiner, xmlGenerator }) => {
		const { xLog, commandLineParameters } = process.global;

		// Callback function to handle the parsed XML
		const runTask =
			({ outputFilePath, elementSpecWorksheetJson }) =>
			async (err, xmlCollection) => {
				// Generate initial XML using xmlGenerator
				const xmlString = await xmlGenerator({
					latestWisdom:'first pass. no XML yet. replace with top-level object.',
					elementSpecWorksheetJson,
				});

				// Refine the XML using an external function
				const refinedXml = await xmlRefiner({
					latestWisdom:xmlString,
					elementSpecWorksheetJson,
				}).catch((err) => {
					xLog.error(
						`Error: ${err}. Error Exit Quitting Now.`,
					);
					console.trace();
					process.exit(1);
				});

				// Optionally display the refined XML
				if (commandLineParameters.switches.echoAlso) {
					xLog.result(refinedXml);
				}

				xLog.saveProcessFile(
					`${moduleName}_{path.basename(outputFilePath)}.xml`,
					refinedXml,
				);

				fs.writeFileSync(outputFilePath, refinedXml, { encoding: 'utf-8' });
				xLog.status(`Output file path: ${outputFilePath}`);
			};

		return { runTask };
	};

// END OF moduleFunction() ============================================================

module.exports = moduleFunction();
