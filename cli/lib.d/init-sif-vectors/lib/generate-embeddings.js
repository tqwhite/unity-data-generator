#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const os = require('os');
const path = require('path');
const fs = require('fs');

//START OF moduleFunction() ============================================================
const moduleFunction =
  ({ moduleName } = {}) =>
  ({ openai, vectorDb, refIdToInteger }) => {
    const { xLog, getConfig, rawConfig, commandLineParameters } =
      process.global;
    const { unused } = getConfig(moduleName);

    // ================================================================================

    const showVecVersion = (vectorDb) => {
      const { sqlite_version, vec_version } = vectorDb
        .prepare(
          'select sqlite_version() as sqlite_version, vec_version() as vec_version;',
        )
        .get();

      console.log(
        `sqlite_version=${sqlite_version}, vec_version=${vec_version}`,
      );
    };
    
    const initVectorTables = (vectorDb, vectorTableName) => {
      const tableList = vectorDb
        .prepare(
          `SELECT name FROM sqlite_master WHERE name LIKE '${vectorTableName}%';`,
        )
        .all();
      if (tableList.length) {
        xLog.status(`OVERWRITING preexisting ${vectorTableName}`);
      }
      tableList.forEach(({ name }) => vectorDb.exec(`drop table if exists ${name};`));
      vectorDb.exec(
        `CREATE VIRTUAL TABLE ${vectorTableName} USING vec0(embedding float[1536])`,
      );
    };
    
    // ================================================================================

    const workingFunction = async (embeddingSpecs) => {
      const {
        sourceTableName,
        vectorTableName,
        sourcePrivateKeyName,
        sourceEmbeddableContentName,
      } = embeddingSpecs;

      showVecVersion(vectorDb);
      initVectorTables(vectorDb, vectorTableName);

      // Get only the first 3 records from naDataModel
      const sourceRecords = vectorDb
        .prepare(`SELECT * FROM ${sourceTableName} LIMIT 3;`)
        .all();

      if (!sourceRecords || !sourceRecords.length) {
        throw new Error(`No records found in ${sourceTableName}`);
      }

      xLog.status(`Found ${sourceRecords.length} records in ${sourceTableName} (limited to 3 records)`);

      // Since we're only processing 3 records, we can use a batch size of 3
      const batchSize = 3;
      for (let i = 0; i < sourceRecords.length; i += batchSize) {
        const batchRecords = sourceRecords.slice(i, i + batchSize);
        
        // Process batch
        await processBatch(batchRecords, {
          sourceTableName,
          vectorTableName,
          sourcePrivateKeyName,
          sourceEmbeddableContentName,
        });
        
        xLog.status(`Processed batch ${i / batchSize + 1} of ${Math.ceil(sourceRecords.length / batchSize)}`);
      }

      xLog.status('All records processed successfully');
    };
    
    // Process a batch of records
    const processBatch = async (records, embeddingSpecs) => {
      const {
        vectorTableName,
        sourcePrivateKeyName,
        sourceEmbeddableContentName,
      } = embeddingSpecs;
      
      const embeddings = await Promise.all(
        records.map(async (record) => {
          // Combine multiple fields if specified as an array
          let textToEmbed;
          
          if (Array.isArray(sourceEmbeddableContentName)) {
            // Join the values of multiple fields with a space
            textToEmbed = sourceEmbeddableContentName
              .map(field => record[field] || '')
              .filter(value => value)
              .join(' ');
          } else {
            textToEmbed = record[sourceEmbeddableContentName] || '';
          }
          
          if (!textToEmbed) {
            xLog.error(`No text to embed for record with ${sourcePrivateKeyName} = ${record[sourcePrivateKeyName]}`);
            return null;
          }
          
          try {
            const embedding = await openai.embeddings.create({
              model: 'text-embedding-3-small',
              input: textToEmbed,
              encoding_format: 'float',
            });
            
            // Convert string refId to integer (required for sqlite-vec)
            // If refId is already an integer, refIdToInteger will still work
            const rowid = refIdToInteger(record[sourcePrivateKeyName]);
        
            return {
              rowid,
              embedding: embedding.data[0].embedding,
            };
          } catch (error) {
            xLog.error(`Error generating embedding for record ${record[sourcePrivateKeyName]}: ${error.message}`);
            return null;
          }
        })
      );
      
      // Filter out any null results
      const validEmbeddings = embeddings.filter(e => e !== null);
      
      // Insert embeddings into vector table
      for (const { rowid, embedding } of validEmbeddings) {
        try {
          xLog.status(`Inserting vector for rowid ${rowid} (type: ${typeof rowid})`);
          
          vectorDb
            .prepare(`INSERT INTO "${vectorTableName}" (rowid, embedding) VALUES (?, ?)`)
            .run(BigInt(rowid), new Float32Array(embedding));
          
          xLog.status(`Successfully inserted vector for rowid ${rowid}`);
        } catch (error) {
          xLog.error(`Error inserting vector for rowid ${rowid}: ${error.message}`);
          xLog.error(`Rowid type: ${typeof rowid}, value: ${rowid}`);
        }
      }
    };

    xLog.status(`${moduleName} is initialized`);
    return { workingFunction };
  };

//END OF moduleFunction() ============================================================

module.exports = moduleFunction({ moduleName }); //returns initialized moduleFunction