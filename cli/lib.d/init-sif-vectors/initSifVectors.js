#!/usr/bin/env node
'use strict';

// Suppress punycode deprecation warning
process.noDeprecation = true;

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const qt = require('qtools-functional-library');
const crypto = require('crypto');
const os = require('os');
const path = require('path');
const fs = require('fs');

// --------------------------------------------------------------------------------
// FIND PROJECT ROOT
const findProjectRoot = ({ rootFolderName = 'system', closest = true } = {}) =>
  __dirname.replace(
    new RegExp(`^(.*${closest ? '' : '?'}\/${rootFolderName}).*$`),
    '$1',
  );
const applicationBasePath = findProjectRoot();

const commandLineParser = require('qtools-parse-command-line');
const commandLineParameters = commandLineParser.getParameters({
  applicationControls: ['-writeVectorDatabase'],
});
const generateEmbeddings = require('./lib/generate-embeddings');
const getClosestRecords = require('./lib/get-closest-records');

// =============================================================================
// MODULE IMPORTS

const initAtp = require('qtools-ai-thought-processor/jina')({
  configFileBaseName: moduleName,
  applicationBasePath,
  applicationControls: ['-writeVectorDatabase', '--queryString'],
});

// Function to convert string refId to integer with minimal collision risk
const refIdToInteger = (refId) => {
  // Use SHA-256 for better collision resistance
  const hash = crypto.createHash('sha256').update(String(refId)).digest('hex');
  
  // Create a unique integer identifier from the hash
  // Taking a portion of the hash and converting it to a BigInt
  // This gives us effectively unlimited distinct values
  
  // We're explicitly creating a BigInt from a hex string
  // By using the '0x' prefix, JavaScript knows to interpret it as hexadecimal
  const bigIntValue = BigInt('0x' + hash.substring(0, 12));
  
  // Return the BigInt directly - it will be properly handled as a SQLite INTEGER
  // No need for modulo as BigInt can represent arbitrarily large integers
  return bigIntValue;
};

const initVectorDatabase = (databaseFilePath, vectorTableName, xLog) => {
  const sqliteVec = require('sqlite-vec');
  const db = require('better-sqlite3')(databaseFilePath, {});
  sqliteVec.load(db);
  return db;
};

//START OF moduleFunction() ============================================================
const moduleFunction =
  ({ moduleName } = {}) =>
  ({ unused }) => {
    const { xLog, getConfig, rawConfig, commandLineParameters } =
      process.global;
    const { databaseFilePath, openAiApiKey } = getConfig(moduleName);

    const initOpenAi = () => {
      const OpenAI = require('openai');
      const openai = new OpenAI({
        apiKey: openAiApiKey,
      });
      return openai;
    };

    // ================================================================================
    const openai = initOpenAi();

    // ================================================================================
    
    // Configuration for SIF vectors
    const sourceTableName = 'naDataModel';
    const vectorTableName = 'sifElementVectors';
    const sourcePrivateKeyName = 'refId';
    // We'll concatenate Description and xPath for embedding
    const sourceEmbeddableContentName = ['Description', 'XPath'];
    
    // Note: This tool is configured to only process the first 3 records
    
    const vectorDb = initVectorDatabase(
      databaseFilePath,
      vectorTableName,
      xLog,
    );
    
    if (commandLineParameters.switches.writeVectorDatabase) {
      generateEmbeddings({
        openai,
        vectorDb,
        refIdToInteger,
      }).workingFunction({
        sourceTableName,
        vectorTableName,
        sourcePrivateKeyName,
        sourceEmbeddableContentName,
      });
    }
    
    if (commandLineParameters.values.queryString) {
      getClosestRecords({
        openai,
        vectorDb,
        refIdToInteger,
      }).workingFunction({
        sourceTableName,
        vectorTableName,
        sourcePrivateKeyName,
        sourceEmbeddableContentName,
      },
      commandLineParameters.values.queryString.qtLast(),
      );
    }

    return {};
  };

//END OF moduleFunction() ============================================================

module.exports = moduleFunction({ moduleName })({}); // runs it right now