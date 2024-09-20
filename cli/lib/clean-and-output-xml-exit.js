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
			({ sheet, structurePath, outputFilePath, targetXpathFieldList, elementSpecWorksheet }) =>
			async (err, xmlCollection) => {

				// Ensure the output directory exists
				fs.mkdirSync(path.dirname(structurePath), { recursive: true });
				xLog.status(`Writing to output directory: ${structurePath}`);


          let workingResultString = await callJina({
            groupXPath:'/LEAAccountability',
            children: ['/LEAAccountability/@RefId'],
            fields:targetXpathFieldList,
            elementSpecWorksheet,
          });
				// Extract the root element name from the XML
// 				const rootName = Object.keys(xmlCollection)[0];
// 				const xmlnsDeclaration = xmlCollection[rootName].$?.xmlns; // Namespace (if any)
// 
// 				// Use XPath to find the root element
// 				const xpathResult = xpath.find(xmlCollection, '/' + rootName);
// 				const objectName = rootName.slice(0, -1); // Remove last character to get object name
// 				let template = xpathResult[0][objectName][0];
// 
// 				// Add namespace declaration if present
// 				if (xmlnsDeclaration != null) {
// 					template.$.xmlns = xmlnsDeclaration;
// 				}
// 				template = { [objectName]: template };
// 
// 				// Convert the template object back to an XML string
// 				let xmlInput = createXmlString(template);
// 				xmlInput = removeFirstLine(xmlInput); // Remove XML declaration line

				// Initialize an XML object for data generation
//		const xmlObject = createXmlElement(rootName);
          
          
// 				// Traverse the XML and populate data fields
// 				await traverseXMLGen({ callJina })({
// 					sheet,
// 					xmlObject,
// 					fields:targetXpathFieldList,
// 					elementSpecWorksheet
// 				}); // This function internally calls callJina()

				// Generate the output XML string
// 				let xmlOutput = createXmlString(xmlObject);
// 				xmlOutput = removeFirstLine(xmlOutput); // Remove XML declaration line
// 
// 				// Decode any HTML entities in the XML string
// 				const { decode } = await import('html-entities');
// 				const decodedXmlString = decode(xmlOutput, { level: 'xml' });



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
					xLog.result(refinedXml);
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
