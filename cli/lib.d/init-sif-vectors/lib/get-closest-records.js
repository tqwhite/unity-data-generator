#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const os = require('os');
const path = require('path');
const fs = require('fs');

//START OF moduleFunction() ============================================================
const moduleFunction =
  ({ moduleName } = {}) =>
  ({ openai, vectorDb }) => {
    const { xLog, getConfig, rawConfig, commandLineParameters } =
      process.global;
    const localConfig = getConfig(moduleName);

    const workingFunction = async (embeddingSpecs, queryString) => {
      const {
        sourceTableName,
        vectorTableName,
        sourcePrivateKeyName,
        sourceEmbeddableContentName,
      } = embeddingSpecs;
      
      // Generate embedding for the query string
      const queryEmbed = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: queryString,
        encoding_format: 'float',
      });

      const query = queryEmbed.data[0].embedding;
      
      // Find closest matches using vector similarity search
      const rows = vectorDb
        .prepare(
          `SELECT rowid, distance FROM ${vectorTableName} WHERE embedding MATCH ? ORDER BY distance LIMIT 10`,
        )
        .all(new Float32Array(query));

      // Get the full records for each match
      const answers = rows.map(vectorChoice => {
        // For each rowid (converted integer), we need to find the corresponding original record
        // This is more complex since the rowid is a hash, not the actual refId
        
        // First, get all records from the table - we'll need to filter them
        // For a production system, you'd want to optimize this with a lookup table
        const allRecords = vectorDb.prepare(`SELECT * FROM ${sourceTableName}`).all();
        
        // Find the record that matches this rowid
        const matchingRecord = allRecords.find(record => {
          // Simply compare the refId with the rowid, since they should now be the same value
          // (refId is a numeric string that can be directly compared)
          return record[sourcePrivateKeyName].toString() === vectorChoice.rowid.toString();
        }) || {};
        
        return { ...vectorChoice, record: matchingRecord };
      });

      // Format and display results
      xLog.result(`Top matches for query: "${queryString}"`);
      xLog.result('------------------------------------------------------');
      
      if (answers.length === 0) {
        xLog.result('No matches found.');
      } else {
        answers.forEach((item, index) => {
          // Format fields from the record for display
          const description = item.record.Description || '';
          const xpath = item.record.xPath || '';
          const distance = item.distance.toFixed(4);
          
          xLog.result(`${index + 1}. [Score: ${distance}]`);
          
          if (description) {
            xLog.result(`   Description: ${description.substring(0, 150)}${description.length > 150 ? '...' : ''}`);
          }
          
          if (xpath) {
            xLog.result(`   XPath: ${xpath}`);
          }
          
          xLog.result('------------------------------------------------------');
        });
      }
    };

    xLog.status(`${moduleName} is initialized`);
    return { workingFunction };
  };

//END OF moduleFunction() ============================================================

module.exports = moduleFunction({ moduleName }); //returns initialized moduleFunction