#!/usr/bin/env node
'use strict';

// Module to generate Unity Data using Jina AI

const fs = require('fs');
const xlsx = require('xlsx');
const path = require('path');
const xLog = require('./lib/x-log');
const { performance } = require('perf_hooks');

// START OF moduleFunction() ============================================================

const moduleFunction = async function (
  error,
  { getConfig, commandLineParameters },
) {
  // Handle initial error
  if (error) {
    xLog.error(error);
    process.exit(1);
  }

  // Set global configurations
  process.global.getConfig = getConfig;
  process.global.commandLineParameters = commandLineParameters;

  const localConfig = getConfig('SYSTEM');
  const { spreadsheetPath } = localConfig;
  let { outputsPath } = localConfig;

  // Get target object name from command line parameters
  const targetObjectName = commandLineParameters.qtGetSurePath('fileList.0');

  if (!targetObjectName && !commandLineParameters.switches.listElements) {
    xLog.error(`Target element name is required. Try -help or -listElements`);
    process.exit(1);
  }

  // ===========================================================================
  // SET UP DIRECTORIES AND FILE PATHS

  // Set up batch-specific debug log directory
  const batchSpecificDebugLogDirPath = path.join(
    '/',
    'tmp',
    'unityDataGeneratorTemp',
    `${targetObjectName}_${Math.floor(Date.now() / 1000)
      .toString()
      .slice(-4)}`,
  );
  process.global.batchSpecificDebugLogDirPath = batchSpecificDebugLogDirPath;
  fs.mkdirSync(batchSpecificDebugLogDirPath, { recursive: true });

  // Determine thought process and refiner names
  const thoughtProcess = commandLineParameters
    .qtGetSurePath('values.thoughtProcess', [])
    .qtLast('unityGenerator');
  const refinerName = commandLineParameters
    .qtGetSurePath('values.refinerName', [])
    .qtLast('refiner');

  // Determine output file path and temporary file path
  const outFile = commandLineParameters.qtGetSurePath('values.outFile[0]', '');
  if (outFile) {
    outputsPath = path.dirname(outFile);
    fs.mkdirSync(outputsPath, { recursive: true });
  }
  const outputFilePath = outFile
    ? outFile
    : path.join(outputsPath, `${targetObjectName}.xml`);

  const baseName = path.basename(outputFilePath);
  const outputDir = path.dirname(outputFilePath);
  fs.mkdirSync(outputDir, { recursive: true });
  const extension = path.extname(baseName);

  const tempName = `${baseName.replace(extension, '')}_temp${extension}`;
  const tempFilePath = path.join(batchSpecificDebugLogDirPath, tempName);
  xLog.status(`Writing working XML to ${tempFilePath}`);

  // ===========================================================================
  // BUILD SMARTYPANTS AND THEIR EXECUTORS

  // Initialize Jina AI core and xmlGenerator function
  const xmlGeneratingSmartyPants = require('./lib/jina-core').conversationGenerator({
    thoughtProcess,
  }); // provides .getResponse()
  const { xmlGenerator } = require('./lib/think-up-answer')({
    xmlGeneratingSmartyPants,
    tempFilePath,
  }); // munges data and orchestrates this specific smartyPants process

  // Initialize Jina AI refiner and xmlRefiner function
  const xmlRefiningSmartyPants = require('./lib/jina-core').conversationGenerator({
    thoughtProcess: refinerName,
  }); // provides .getResponse()
  const { xmlRefiner } = require('./lib/think-keep-trying')({
    xmlRefiningSmartyPants,
  }); // munges data and orchestrates this specific smartyPants process

  // ===========================================================================
  // COMBINE SMARTYPANTS EXECUTORS INTO THE MAIN EXECUTION OBJECT

  // Initialize cleanAndOutputXml function
  const { cleanAndOutputXml } = require('./lib/clean-and-output-xml-exit')({
    xmlRefiner,
    xmlGenerator,
    batchSpecificDebugLogDirPath,
  });

  // ===========================================================================
  // CHECK INPUT FILES AND PREPARE FOR PROCESSING

  // Check if spreadsheet exists
  if (!fs.existsSync(spreadsheetPath)) {
    xLog.error(`No specifications found. ${spreadsheetPath} does not exist`);
    process.exit(1);
  }

  // ===========================================================================
  // EXECUTE THE PROCESS FOR SOME OR ALL OF THE POSSIBLE ELEMENTS

  try {
    const startTime = performance.now();
    const workbook = xlsx.readFile(spreadsheetPath);
    const worksheetNames = workbook.SheetNames;
    xLog.status(`Using data model spec file: ${spreadsheetPath}`);

    for (let index = 0; index < worksheetNames.length; index++) {
      const name = worksheetNames[index];

      if (targetObjectName != null && name !== targetObjectName) {
        continue;
      }

      const sheet = workbook.Sheets[name];
      const elementSpecWorksheet = xlsx.utils.sheet_to_json(sheet);

      await cleanAndOutputXml({
        outputFilePath,
        elementSpecWorksheet,
      })();
    }

    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    xLog.debug(`Processing time: ${duration} seconds`);
  } catch (error) {
    xLog.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// END OF moduleFunction() ============================================================

process.global = {};
process.global.applicationBasePath = path.join(
  path.dirname(__filename),
  '..',
  '..',
);
process.global.xLog = xLog;

require('./lib/assemble-configuration-show-help-maybe-exit')({
  configSegmentName: 'SYSTEM',
  terminationFunction: process.exit,
  callback: moduleFunction,
});