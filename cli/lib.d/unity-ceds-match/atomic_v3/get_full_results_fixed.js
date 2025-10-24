#!/usr/bin/env node

const Database = require('better-sqlite3');
const fs = require('fs');

const db = new Database('/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/datastore/cedsIds.sqlite3');
const results = JSON.parse(fs.readFileSync('./real_llm_results_2025-10-23T23-05-36-502Z.json', 'utf8'));

// Get 20 random matches with full details to reconstruct the test
const testData = db.prepare(`
    SELECT
        n.refId as sif_id,
        n.xpath as sif_xpath,
        n.Name as sif_name,
        n.description as sif_description,
        n.Type as sif_datatype,
        c.GlobalID as ceds_id,
        c.Domain || '/' || c.Entity || '/' || c.ElementName as ceds_path,
        c.ElementName as ceds_name,
        c.Definition as ceds_definition
    FROM unityCedsMatches m
    JOIN naDataModel n ON m.naDataModelRefId = n.refId
    JOIN _CEDSElements c ON m._CEDSElementsRefId = c.GlobalID
    WHERE m.confidence > 0.85
        AND n.description IS NOT NULL
        AND LENGTH(n.description) > 15
    ORDER BY RANDOM()
    LIMIT 20
`).all();

// Match test results with actual data by SIF name and description
const fullResults = results.results.map(r => {
    // Find matching test data
    const match = testData.find(t => 
        t.sif_name === r.sif_name && 
        t.sif_description.trim() === r.sif_description.trim()
    );
    
    // Get predicted CEDS details (if different and not NONE)
    let predicted = null;
    if (r.llm_prediction !== r.correct_ceds_id && r.llm_prediction !== 'NONE') {
        predicted = db.prepare(`
            SELECT 
                GlobalID,
                Domain || '/' || c.Entity || '/' || c.ElementName as path,
                ElementName,
                Definition
            FROM _CEDSElements c
            WHERE GlobalID = ?
        `).get(r.llm_prediction);
    }
    
    return {
        test: r.test_number,
        result: r.is_correct ? '✅' : '❌',
        sif_xpath: match?.sif_xpath || 'N/A',
        sif_name: r.sif_name,
        sif_description: r.sif_description,
        correct_ceds_id: r.correct_ceds_id,
        correct_ceds_path: match?.ceds_path || 'N/A',
        correct_ceds_name: r.correct_ceds_name,
        correct_ceds_definition: match?.ceds_definition || 'N/A',
        predicted_ceds_id: r.llm_prediction,
        predicted_ceds_name: predicted?.ElementName || (r.llm_prediction === 'NONE' ? 'NONE' : ''),
        predicted_ceds_path: predicted?.path || (r.llm_prediction === 'NONE' ? 'NONE' : ''),
        predicted_ceds_definition: predicted?.Definition || ''
    };
});

// Output as formatted table
console.log(JSON.stringify(fullResults, null, 2));

db.close();
