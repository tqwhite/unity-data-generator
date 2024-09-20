#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');

// START OF moduleFunction() ============================================================
const moduleFunction = () => ({
  callRefiner,
  batchSpecificDebugLogDirPath,
  callJina,
}) => {
  const { xLog, commandLineParameters } = process.global;

  // Callback function to handle the parsed XML
  const cleanAndOutputXml =
    ({
      outputFilePath,
      elementSpecWorksheet,
    }) =>
    async (err, xmlCollection) => {

      // Generate initial XML using callJina
      const xmlString = await callJina({
        groupXPath: '/LEAAccountability',
        children: ['/LEAAccountability/@RefId'],
        fields: elementSpecWorksheet,
        elementSpecWorksheet,
      });

      // Refine the XML using an external function
      const refinedXml = await callRefiner({
        xmlString,
        targetXpathFieldList:elementSpecWorksheet,
      }).catch((err) => {
        xLog.status(`Process detail info dir: ${batchSpecificDebugLogDirPath}`);
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

// END OF moduleFunction() ============================================================

module.exports = moduleFunction();