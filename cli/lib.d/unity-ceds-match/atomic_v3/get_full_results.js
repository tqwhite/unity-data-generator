#!/usr/bin/env node

const Database = require('better-sqlite3');
const fs = require('fs');

const db = new Database('/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/datastore/cedsIds.sqlite3');
const results = JSON.parse(fs.readFileSync('./real_llm_results_2025-10-23T23-05-36-502Z.json', 'utf8'));

// Get full details for each result
const fullResults = results.results.map(r => {
    // Get SIF details
    const sif = db.prepare(`
        SELECT xpath, Name, description, Type
        FROM naDataModel 
        WHERE refId = ?
    `).get(r.sif_id);
    
    // Get correct CEDS details
    const ceds = db.prepare(`
        SELECT 
            GlobalID,
            Domain || '/' || Entity || '/' || ElementName as path,
            ElementName,
            Definition
        FROM _CEDSElements
        WHERE GlobalID = ?
    `).get(r.correct_ceds_id);
    
    // Get predicted CEDS details (if different)
    let predicted = null;
    if (r.llm_prediction !== r.correct_ceds_id && r.llm_prediction !== 'NONE') {
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
        sif_xpath: sif?.xpath || 'N/A',
        sif_name: sif?.Name || r.sif_name,
        sif_description: sif?.description || r.sif_description,
        correct_ceds_id: r.correct_ceds_id,
        correct_ceds_path: ceds?.path || 'N/A',
        correct_ceds_definition: ceds?.Definition || 'N/A',
        predicted_ceds_id: r.llm_prediction,
        predicted_ceds_path: predicted?.path || (r.llm_prediction === 'NONE' ? 'NONE' : ''),
        predicted_ceds_definition: predicted?.Definition || ''
    };
});

// Output as table
console.log(JSON.stringify(fullResults, null, 2));

db.close();
