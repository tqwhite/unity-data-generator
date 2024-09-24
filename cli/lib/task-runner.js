#!/usr/bin/env node
'use strict';
const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

const path = require('path');
const fs = require('fs');

// START OF moduleFunction() ============================================================
const moduleFunction =
	() =>
	({ xmlRefiningFacilitator, xmlGeneratingingFacilitator }) => {
		const { xLog, commandLineParameters } = process.global;

		// Callback function to handle the parsed XML
		const runTask =
			({ outputFilePath, elementSpecWorksheetJson }) =>
			async (err, xmlCollection) => {
				// =========================================================
				// EXECUTE THE CONVERSATIONS

				// Generate initial XML using xmlGeneratingingFacilitator
				const { latestWisdom, args } = await xmlGeneratingingFacilitator({
					latestWisdom:
						{xml:'first pass. no XML yet. replace with top-level object.'},
					args:{elementSpecWorksheetJson},
				});


				// Refine the XML using an external function
				const tmp = await xmlRefiningFacilitator({ latestWisdom:{xml:latestWisdom.xml, validationMsg:'No errors detected'}, args });
				const { latestWisdom:refinedWisdom, args:unused }=tmp;
				const refinedXml=refinedWisdom.xml;
				
				// =========================================================
				// SEND THE RESULTS

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
