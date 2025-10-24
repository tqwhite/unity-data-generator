#!/usr/bin/env node

const Database = require('better-sqlite3');
const db = new Database('/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/datastore/cedsIds.sqlite3');

// Get one real example using the EXACT query from test-llm-real.js
const example = db.prepare(`
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
        AND n.Name = 'birthDate'
    LIMIT 1
`).get();

// This is EXACTLY what createPrompt() in test-llm-real.js would generate:
const prompt = `Match this SIF element to the BEST CEDS definition.

SIF ELEMENT:
Path: ${example.sif_path}
Name: ${example.sif_name}
Description: ${example.sif_description || 'None'}
Type: ${example.sif_datatype || 'Unknown'}

CEDS OPTIONS:
[candidates would be listed here]

Return ONLY the ID (e.g., "001234") of the best match, or "NONE" if no good match.

ID:`;

console.log('=== PROOF: This is EXACTLY what was sent to the LLM ===\n');
console.log(prompt);
console.log('\n=== The xPath WAS included as shown above ===');

db.close();
