#!/usr/bin/env node

const Database = require('better-sqlite3');
const fs = require('fs');

const db = new Database('/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/datastore/cedsIds.sqlite3');
const results = JSON.parse(fs.readFileSync('./real_llm_results_2025-10-23T23-05-36-502Z.json', 'utf8'));

// For each result, get the full details from the database using the SIF ID
const fullResults = results.results.map(r => {
    // Get SIF details using the refId
    const sif = db.prepare(`
        SELECT 
            refId,
            xpath,
            Name,
            description,
            Type
        FROM naDataModel 
        WHERE refId = ?
    `).get(r.sif_id);
    
    // Get correct CEDS details
    const ceds = db.prepare(`
        SELECT 
            GlobalID,
            Domain,
            Entity,
            ElementName,
            Domain || '/' || Entity || '/' || ElementName as path,
            Definition
        FROM _CEDSElements
        WHERE GlobalID = ?
    `).get(r.correct_ceds_id);
    
    // Get predicted CEDS details (if different and not NONE)
    let predicted = null;
    if (r.llm_prediction !== r.correct_ceds_id && r.llm_prediction !== 'NONE') {
        predicted = db.prepare(`
            SELECT 
                GlobalID,
                Domain,
                Entity, 
                ElementName,
                Domain || '/' || Entity || '/' || ElementName as path,
                Definition
            FROM _CEDSElements
            WHERE GlobalID = ?
        `).get(r.llm_prediction);
    }
    
    return {
        test: r.test_number,
        result: r.is_correct ? '✅' : '❌',
        sif_id: r.sif_id,
        sif_xpath: sif?.xpath || 'NOT FOUND',
        sif_name: sif?.Name || r.sif_name,
        sif_description: sif?.description || r.sif_description,
        sif_datatype: sif?.Type || '',
        correct_ceds_id: r.correct_ceds_id,
        correct_ceds_path: ceds?.path || 'NOT FOUND',
        correct_ceds_definition: ceds?.Definition || 'NOT FOUND',
        predicted_ceds_id: r.llm_prediction,
        predicted_ceds_path: predicted?.path || (r.llm_prediction === 'NONE' ? 'NONE' : ''),
        predicted_ceds_definition: predicted?.Definition || ''
    };
});

// Output as JSON
console.log(JSON.stringify(fullResults, null, 2));

// Also create a simplified table for markdown
console.log('\n\n=== MARKDOWN TABLE ===\n');
fullResults.forEach(r => {
    console.log(`Test ${r.test}: ${r.result}`);
    console.log(`SIF xPath: ${r.sif_xpath}`);
    console.log(`SIF Name: ${r.sif_name}`);
    console.log(`SIF Desc: ${r.sif_description}`);
    console.log(`Correct CEDS: ${r.correct_ceds_id} - ${r.correct_ceds_path}`);
    if (!r.result.includes('✅')) {
        console.log(`Predicted: ${r.predicted_ceds_id} - ${r.predicted_ceds_path}`);
    }
    console.log('---');
});

db.close();
