#!/usr/bin/env node

const Database = require('better-sqlite3');
const fs = require('fs');

const db = new Database('/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/datastore/cedsIds.sqlite3');
const results = JSON.parse(fs.readFileSync('./real_llm_results_2025-10-23T23-05-36-502Z.json', 'utf8'));

// For each test result, find the matching record by name and description
const fullResults = results.results.map(r => {
    // Query by name and description to find the actual xPath
    const sif = db.prepare(`
        SELECT 
            n.xpath,
            n.refId,
            n.Name,
            n.description,
            n.Type
        FROM unityCedsMatches m
        JOIN naDataModel n ON m.naDataModelRefId = n.refId
        WHERE n.Name = ?
          AND TRIM(n.description) = TRIM(?)
        LIMIT 1
    `).get(r.sif_name, r.sif_description);
    
    // Get CEDS details
    const ceds = db.prepare(`
        SELECT 
            GlobalID,
            Domain || '/' || Entity || '/' || ElementName as path,
            ElementName,
            Definition
        FROM _CEDSElements
        WHERE GlobalID = ?
    `).get(r.correct_ceds_id);
    
    // Get predicted if wrong
    let predicted = null;
    if (!r.is_correct && r.llm_prediction !== 'NONE') {
        predicted = db.prepare(`
            SELECT 
                GlobalID,
                Domain || '/' || Entity || '/' || ElementName as path,
                ElementName,
                Definition
            FROM _CEDSElements
            WHERE GlobalID = ?
        `).get(r.llm_prediction);
    }
    
    return {
        test: r.test_number,
        result: r.is_correct ? '✅' : '❌',
        sif_xpath: sif?.xpath || 'NOT FOUND IN DB',
        sif_name: r.sif_name,
        sif_description: r.sif_description.substring(0, 80) + (r.sif_description.length > 80 ? '...' : ''),
        correct_ceds_id: r.correct_ceds_id,
        correct_ceds_path: ceds?.path || 'NOT FOUND',
        predicted_ceds_id: r.llm_prediction,
        predicted_ceds_path: predicted?.path || (r.llm_prediction === 'NONE' ? 'NONE' : '')
    };
});

// Output in readable format
console.log('# Test Results with xPaths That Were Sent to LLM\n');
fullResults.forEach(r => {
    console.log(`## Test ${r.test}: ${r.result} ${r.sif_name}`);
    console.log(`**SIF xPath sent to LLM:** \`${r.sif_xpath}\``);
    console.log(`**Description:** ${r.sif_description}`);
    console.log(`**Correct CEDS:** ${r.correct_ceds_id} - ${r.correct_ceds_path}`);
    if (!r.result.includes('✅')) {
        console.log(`**LLM Predicted:** ${r.predicted_ceds_id} - ${r.predicted_ceds_path}`);
    }
    console.log('');
});

db.close();
