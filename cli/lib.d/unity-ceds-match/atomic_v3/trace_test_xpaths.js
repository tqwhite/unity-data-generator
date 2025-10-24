#!/usr/bin/env node

const Database = require('better-sqlite3');
const db = new Database('/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/datastore/cedsIds.sqlite3');

// This is the exact query used in test-llm-real.js
const query = `
    SELECT
        n.refId as sif_id,
        n.xpath as sif_path,
        n.Name as sif_name,
        n.description as sif_description,
        n.Type as sif_datatype,
        c.GlobalID as ceds_id,
        c.Domain || '/' || c.Entity || '/' || c.ElementName as ceds_path,
        c.ElementName as ceds_name,
        c.Definition as ceds_definition,
        c.Format as ceds_format,
        m.confidence as match_confidence
    FROM unityCedsMatches m
    JOIN naDataModel n ON m.naDataModelRefId = n.refId
    JOIN _CEDSElements c ON m._CEDSElementsRefId = c.GlobalID
    WHERE m.confidence > 0.85
        AND n.description IS NOT NULL
        AND LENGTH(n.description) > 15
    ORDER BY RANDOM()
    LIMIT 20
`;

const testData = db.prepare(query).all();

console.log("Sample of what was ACTUALLY available to send to the LLM:\n");
testData.forEach((row, i) => {
    console.log(`Test ${i + 1}:`);
    console.log(`  SIF Path (xPath): ${row.sif_path || 'NULL'}`);
    console.log(`  SIF Name: ${row.sif_name}`);
    console.log(`  SIF Description: ${row.sif_description.substring(0, 60)}...`);
    console.log(`  CEDS Path: ${row.ceds_path}`);
    console.log('---');
});

db.close();
