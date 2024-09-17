#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

// const qt = require('qtools-functional-library'); //also exposes qtLog(); qt.help({printOutput:true, queryString:'.*', sendJson:false});

const os = require('os');
const path = require('path');
const fs = require('fs');

console.log(`HELLO FROM ${__dirname}/${moduleName}`);


//START OF moduleFunction() ============================================================
const moduleFunction =
	({ moduleName } = {}) =>
	({
		createWorksheetFields,
		createXmlString,
		removeFirstLine,
		createXmlElement,
		traverseXMLGen,
		callRefiner,
		xpath,
		xml2js,
		batchSpecificDebugLogDirPath,
		callJina,
	} = {}) => {
		const { xLog, getConfig, rawConfig, commandLineParameters } =
			process.global;
		// Callback function to handle the parsed XML
		const cleanAndOutputXml =
			({ sheet, structurePath, outputFilePath, targetXpathFieldList }) =>
			async (err, xmlCollection) => {
				if (err) {
					xLog.error(`Error parsing the XML: ${err.message}`);
					process.exit(1);
				}

				// Ensure the output directory exists
				fs.mkdirSync(path.dirname(structurePath), { recursive: true });
				xLog.status(`Writing to output directory: ${structurePath}`);

				// Extract the root element name from the XML
				const rootName = Object.keys(xmlCollection)[0];
				const xmlnsDeclaration = xmlCollection[rootName].$?.xmlns; // Namespace (if any)

				// Use XPath to find the root element
				const xpathResult = xpath.find(xmlCollection, '/' + rootName);
				const objectName = rootName.slice(0, -1); // Remove last character to get object name
				let template = xpathResult[0][objectName][0];

				// Add namespace declaration if present
				if (xmlnsDeclaration != null) {
					template.$.xmlns = xmlnsDeclaration;
				}
				template = { [objectName]: template };

				// Convert the template object back to an XML string
				let xmlInput = createXmlString(template);
				xmlInput = removeFirstLine(xmlInput); // Remove XML declaration line

				// Initialize an XML object for data generation
				const xmlObject = createXmlElement(rootName);

				// Traverse the XML and populate data fields
				await traverseXMLGen({ callJina })(
					sheet,
					xmlObject,
					targetXpathFieldList,
				); // This function internally calls callJina()

				// Generate the output XML string
				let xmlOutput = createXmlString(xmlObject);
				xmlOutput = removeFirstLine(xmlOutput); // Remove XML declaration line

				// Decode any HTML entities in the XML string
				const { decode } = await import('html-entities');
				const decodedXmlString = decode(xmlOutput, { level: 'xml' });

				let workingResultString = decodedXmlString;

				// Optionally manipulate the XML for debugging purposes
				// Change the switch value to 'a' or 'b' to introduce errors for testing
				switch ('no forced error for debug') {
					case 'a':
						// Introduce a deliberate error by inserting invalid XML content
						workingResultString = decodedXmlString.replace(
							'</LEAAccountability>',
							'<x>HELLO</x>\n</LEAAccountability>',
						);

						// Log the working result string for debugging
						console.log(`\n=== Working Result String ===\n`);
						console.log(`workingResultString=${workingResultString}`);
						console.log(`\n=============================\n`);
						break;
					case 'b':
						// Replace the entire XML with a sample XML containing errors
						workingResultString = `<LEAAccountabilitys xmlns="http://www.sifassociation.org/datamodel/na/4.x">
  <!-- Sample XML data for debugging -->
</LEAAccountabilitys>`;

						// Log the working result string for debugging
						console.log(`\n=== Working Result String ===\n`);
						console.log(`workingResultString=${workingResultString}`);
						console.log(`\n=============================\n`);
						break;
				}

				// Refine the XML using an external function
				const refinedXml = await callRefiner({
					xmlString: workingResultString,
					targetXpathFieldList,
				}).catch((err) => {
					xLog.status(
						`Process detail info dir: ${batchSpecificDebugLogDirPath}`,
					);
					xLog.error(
						`Error: ${err}. Error Exit Quitting Now. See refinement.log for more info and last XML.`,
					);
					console.trace();
					process.exit(1);
				});

				// Optionally display the refined XML
				if (commandLineParameters.switches.echoAlso) {
					xLog.status(refinedXml);
				}

				xLog.status(`Process detail info dir: ${batchSpecificDebugLogDirPath}`);

				// Write the refined XML to the output file
				try {
					fs.writeFileSync(outputFilePath, refinedXml, { encoding: 'utf-8' });
					fs.symlinkSync(
						outputFilePath,
						path.join(batchSpecificDebugLogDirPath, 'outputFileAlias'),
					);
					xLog.status(`Output file path: ${outputFilePath}`);
				} catch (error) {
					xLog.error(`Error writing to: ${outputFilePath}`);
					xLog.error(error.toString());
					process.exit(1);
				}
			};

		return { cleanAndOutputXml };
	};

//END OF moduleFunction() ============================================================


module.exports = moduleFunction({ moduleName });
