#!/usr/bin/env node
'use strict';

// Module to generate Unity Data using Jina AI

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');
// moduleName is the name of the current module, without path and extension.

const qt = require('qtools-functional-library'); // Utility library

const fs = require('fs');
const xlsx = require('xlsx');
const xml2js = require('xml2js');
const xpath = require('xml2js-xpath');
const { XMLParser } = require('fast-xml-parser');
const Ajv = require('ajv');
const { v1, v4 } = require('uuid');

// START OF moduleFunction() ============================================================

const moduleFunction = async function (
  error,
  { getConfig, commandLineParameters },
) {
  // Initialize configurations and global variables
  const { xLog } = process.global;

  if (error) {
    xLog.error(error);
    process.exit(1);
  }

  // Set global configurations
  process.global.getConfig = getConfig;
  process.global.commandLineParameters = commandLineParameters;

  const localConfig = getConfig('SYSTEM');
  const { spreadsheetPath, structuresPath, strictXSD, ignoreTags, knownIds } =
    localConfig;
  let { outputsPath } = localConfig;

  // Get target object name from command line parameters
  const targetObjectName = commandLineParameters.qtGetSurePath('fileList.0');

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

  // Initialize Jina AI core and refiner
  const jinaCore = require('./lib/jina-core').conversationGenerator({
    thoughtProcess,
  });
  const jinaRefiner = require('./lib/jina-core').conversationGenerator({
    thoughtProcess: refinerName,
  });

  // Initialize callJina and refineXml modules
  const callJinaGen = require('./lib/call-jina');
  const refineXmlGen = require('./lib/refine-xml');

  // Determine output file path
  const outFile = commandLineParameters.qtGetSurePath('values.outFile[0]', '');

  if (outFile && fs.existsSync(path.dirname(outFile))) {
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    outputsPath = path.dirname(outFile);
  }

  const outputFilePath = outFile
    ? outFile
    : path.join(outputsPath, `${targetObjectName}.xml`);

  const baseName = path.basename(outputFilePath);
  const outputDir = path.dirname(outputFilePath);
  fs.mkdirSync(outputDir, { recursive: true });
  const extension = path.extname(baseName);

  // Set up temporary file path
  const tempName = `${baseName.replace(extension, '')}_temp${extension}`;
  const tempFilePath = path.join(batchSpecificDebugLogDirPath, tempName);
  fs.mkdirSync(path.dirname(tempFilePath), { recursive: true });
  xLog.status(`Writing working XML to ${tempFilePath}`);

  if (!targetObjectName && !commandLineParameters.switches.listElements) {
    xLog.error(`Target element name is required. Try -help or -listElements`);
    process.exit(1);
  }

  let xmlnsDeclaration = '';
  let children = [];
  const substringsToExclude = ['SIF_Metadata', 'SIF_ExtendedElements'];

  // Check if spreadsheet exists
  if (!fs.existsSync(spreadsheetPath)) {
    xLog.error(`No specifications found. ${spreadsheetPath} does not exist`);
    process.exit(1);
  }

  // Initialize XML version stack
  const xmlVersionStack = ['First pass. No XML'];

  // Function to remove root XPath
  function removeRootXPath(xpath) {
    const parts = xpath.split('/');
    const resultXPath = '/' + parts.slice(2).join('/');
    return resultXPath;
  }

  // Function to create worksheet fields optimized for lookup by XPath
  function createWorksheetFields(sheet) {
    const range = xlsx.utils.decode_range(sheet['!ref']);
    const rows = range.e.r + 1; // Total number of rows (1-based index)
    const cols = range.e.c + 1; // Total number of columns (1-based index)

    const fields = {};

    for (let row = 1; row < rows; row++) {
      const uniqueIDCellAddress = xlsx.utils.encode_cell({ r: row, c: 5 });
      const fullUniqueID = sheet[uniqueIDCellAddress]
        ? sheet[uniqueIDCellAddress].v
        : undefined;

      if (fullUniqueID) {
        const uniqueID = removeRootXPath(fullUniqueID);
        fields[uniqueID] = {};

        for (let col = 0; col < cols; col++) {
          const columnHeaderCellAddress = xlsx.utils.encode_cell({
            r: 0,
            c: col,
          });
          const columnHeader = sheet[columnHeaderCellAddress]
            ? sheet[columnHeaderCellAddress].v
            : undefined;

          const cellAddress = xlsx.utils.encode_cell({ r: row, c: col });
          let cellValue = sheet[cellAddress] ? sheet[cellAddress].v : undefined;
          if (col === 5) {
            cellValue = uniqueID;
          }

          fields[uniqueID][columnHeader] = cellValue;
        }
      }
    }

    return fields;
  }

  // Function to validate XML against XSD
  function validateXMLAgainstXSD(xmlString, xsdPath) {
    return new Promise((resolve, reject) => {
      fs.readFile(xsdPath, 'utf8', (err, xsdData) => {
        if (err) {
          reject(err);
          return;
        }

        const ajv = new Ajv({
          allErrors: true,
          strict: false,
          validateSchema: false,
        });
        const parserOptions = {
          ignoreAttributes: false,
          attributeNamePrefix: '',
          parseNodeValue: true,
          parseAttributeValue: true,
        };

        const parser = new XMLParser();

        const xsdParsed = parser.parse(xsdData, parserOptions);
        ajv.addSchema(xsdParsed, 'xsd');

        const xmlParsed = parser.parse(xmlString, parserOptions);

        const isValid = ajv.validate('xsd', xmlParsed);

        if (isValid) {
          resolve({ isValid: true, errors: null });
        } else {
          const errors = ajv.errors.map((error) => ({
            message: error.message,
            line: error.dataPath,
          }));
          resolve({ isValid: false, errors });
        }
      });
    });
  }

  // Helper function to get an entry in the worksheet's dictionary
  function getFieldsRow(xpath, fields) {
    return fields[xpath];
  }

  // Function to check if an XPath is present in the worksheet
  function hasFieldsRow(xpath, fields) {
    const row = getFieldsRow(xpath, fields);
    return row != null;
  }

  // Function to get the value of a cell in the worksheet
  function getFieldValue(xpath, name, fields) {
    const row = getFieldsRow(xpath, fields);
    return row[name];
  }

  // Function to check for an empty object
  function isEmpty(obj) {
    return Object.keys(obj).length === 0;
  }

  // Function to create an XML element
  function createXmlElement(tagName, attributes = {}, value = null) {
    const element = {};
    element[tagName] = {
      $: attributes,
    };
    if (value != null) {
      element[tagName]._ = value;
    }
    return element;
  }

  // Function to add a child XML element to a parent
  function addXmlElement(child, parent) {
    const childKey = Object.keys(child)[0];
    const parentKey = Object.keys(parent)[0];
    if (parent[parentKey][childKey] == null) {
      parent[parentKey][childKey] = [child[childKey]];
    } else {
      parent[parentKey][childKey].push(child[childKey]);
    }
  }

  // Function to copy children from source XML to destination XML
  function copyXmlChildren(source, destination) {
    const sourceKey = Object.keys(source)[0];
    const destinationKey = Object.keys(destination)[0];
    if (sourceKey !== destinationKey) {
      xLog.debug(
        'Warning: Source and destination mismatch, copying children anyway!',
      );
      xLog.debug(`Source: ${sourceKey}, Destination: ${destinationKey}`);
    }

    // Copy attributes
    const attributeKeys = Object.keys(
      source.qtGetSurePath(`[${sourceKey}].$`, {}),
    );

    for (const attributeKey of attributeKeys) {
      destination[destinationKey].$[attributeKey] =
        source[sourceKey].$[attributeKey];
    }

    // Copy elements
    const elementKeys = Object.keys(source[sourceKey]);
    for (const elementKey of elementKeys) {
      if (elementKey !== '$') {
        destination[destinationKey][elementKey] = source[sourceKey][elementKey];
      }
    }
  }

  // Function to parse XML string into an object
  function parseXmlString(xml) {
    return new Promise((resolve, reject) => {
      try {
        xml2js.parseString(xml, (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      } catch (err) {
        xLog.error(`xml2js() failed on this XML:`);
        xLog.result(xml);
        xLog.error(`End of bad XML`);
        reject(err);
      }
    });
  }

  // Function to create XML string from object
  function createXmlString(xmlJsonObject) {
    const builder = new xml2js.Builder();
    return builder.buildObject(xmlJsonObject);
  }

  // Function to create UUID
  function createUUID() {
    try {
      return v1();
    } catch (error) {
      return v4();
    }
  }

  // Function to remove the first line from a text
  function removeFirstLine(text) {
    const lines = text.split('\n');
    lines.splice(0, 1);
    return lines.join('\n');
  }

  // Function to get the group XPath from a value XPath
  function getGroupXPath(xpath) {
    const parts = xpath.split('/');
    return parts.slice(0, -1).join('/');
  }

  // Function to traverse XML and process each node
  const traverseXMLGen = ({ callJina }) => async function ({
    sheet,
    xmlObject,
    fields,
    elementSpecWorksheet,
  }) {
    const range = xlsx.utils.decode_range(sheet['!ref']);
    const rows = range.e.r + 1; // Total number of rows
    const cols = range.e.c + 1; // Total number of columns

    let child;
    let allXPaths = [];

          const groupChildren = ['/LEAAccountability/@RefId'];
          const groupXPath = '/LEAAccountability';

          child = await callJina({
            groupXPath,
            children: groupChildren,
            fields,
            elementSpecWorksheet,
          });

console.log(`\n=-=============   child  ========================= [unityDataGenerator.js.[ anonymous ]]\n`);


console.dir({['child']:child}, { showHidden: false, depth: 4, colors: true });

console.log(`\n=-=============   child  ========================= [unityDataGenerator.js.[ anonymous ]]\n`);


    // Clean up and parse the XML
    const parsedObject = await parseXmlString(
      child.replace(/^[^[]*?</, '<').replace(/[^>*]*?$/, ''),
    ).catch((err) => {
      xLog.error(err);
      process.exit(1);
    });

    copyXmlChildren(parsedObject, xmlObject);
    const rootKey = Object.keys(xmlObject)[0];
    xmlObject[rootKey].$.xmlns = xmlnsDeclaration;
  };

  // EXECUTE PROCESSING

  const { callJina } = callJinaGen({
    addXmlElement,
    getFieldValue,
    createXmlElement,
    knownIds,
    createUUID,
    jinaCore,
    xmlVersionStack,
    commandLineParameters,
    tempFilePath,
  });

  const { callRefiner } = refineXmlGen({
    jinaRefiner,
    commandLineParameters,
  });

  const { cleanAndOutputXml } = require('./lib/clean-and-output-xml-exit')({
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
  });

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

      const targetWorksheet = workbook.Sheets[name];
      const targetXpathFieldList = createWorksheetFields(targetWorksheet);
      const sheet = workbook.Sheets[name];
      const structurePath = path.join(structuresPath, `${name}.xml`);

      if (!fs.existsSync(structurePath)) {
        xLog.status(`XML not found: ${structurePath}`);
        process.exit(1);
      }

      const xmlString = fs.readFileSync(structurePath, 'utf8');
      const elementSpecWorksheet = xlsx.utils.sheet_to_json(sheet);

      await xml2js.parseString(
        xmlString,
        cleanAndOutputXml({
          targetXpathFieldList,
          sheet,
          structurePath,
          outputFilePath,
          elementSpecWorksheet,
        }),
      );
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

const path = require('path');
const xLog = require('./lib/x-log');

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