#!/usr/bin/env node

/**
 * test-single-example.js
 * Test one example to show how LLM matching works
 */

const Database = require('better-sqlite3');

const db = new Database('/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/datastore/cedsIds.sqlite3');

// Get a specific interesting example with "Name" in it
let example = db.prepare(`
    SELECT
        n.xpath as sif_path,
        n.Name as sif_name,
        n.description as sif_description,
        c.GlobalID as ceds_id,
        c.Domain || '/' || c.Entity || '/' || c.ElementName as ceds_path,
        c.ElementName as ceds_name,
        c.Definition as ceds_definition
    FROM unityCedsMatches m
    JOIN naDataModel n ON m.naDataModelRefId = n.refId
    JOIN _CEDSElements c ON m._CEDSElementsRefId = c.GlobalID
    WHERE n.Name = 'Name'
        AND n.description IS NOT NULL
        AND LENGTH(n.description) > 20
        AND m.confidence > 0.8
    LIMIT 1
`).get();

if (!example) {
    // Get any good example
    example = db.prepare(`
        SELECT
            n.xpath as sif_path,
            n.Name as sif_name,
            n.description as sif_description,
            c.GlobalID as ceds_id,
            c.Domain || '/' || c.Entity || '/' || c.ElementName as ceds_path,
            c.ElementName as ceds_name,
            c.Definition as ceds_definition
        FROM unityCedsMatches m
        JOIN naDataModel n ON m.naDataModelRefId = n.refId
        JOIN _CEDSElements c ON m._CEDSElementsRefId = c.GlobalID
        WHERE n.description IS NOT NULL
            AND LENGTH(n.description) > 20
            AND m.confidence > 0.85
        ORDER BY RANDOM()
        LIMIT 1
    `).get();
}

if (!example) {
    console.log('No suitable example found in database.');
    process.exit(1);
}

// Get some CEDS candidates including the correct one
const candidates = db.prepare(`
    SELECT
        GlobalID as id,
        Domain || '/' || Entity || '/' || ElementName as path,
        ElementName as name,
        Definition as definition
    FROM _CEDSElements
    WHERE ElementName LIKE '%Name%'
        OR ElementName LIKE '%First%'
        OR Definition LIKE '%first name%'
        OR Definition LIKE '%given name%'
    LIMIT 10
`).all();

console.log('=' .repeat(70));
console.log('LLM MATCHING DEMONSTRATION');
console.log('=' .repeat(70));

console.log('\n📋 SIF ELEMENT TO MATCH:');
console.log(`Path: ${example.sif_path}`);
console.log(`Name: ${example.sif_name}`);
console.log(`Description: ${example.sif_description}`);

console.log('\n🎯 CORRECT ANSWER (from database):');
console.log(`CEDS: ${example.ceds_path}`);
console.log(`Definition: ${example.ceds_definition}`);

console.log('\n📝 PROMPT FOR LLM:');
console.log('-'.repeat(70));

const prompt = `You are an expert in educational data standards. Match this SIF element to the BEST CEDS definition.

SIF ELEMENT:
- Path: ${example.sif_path}
- Name: ${example.sif_name}
- Description: ${example.sif_description}

CEDS CANDIDATES:
${candidates.map((c, i) =>
`${i + 1}. [ID: ${c.id}]
   Path: ${c.path}
   Definition: ${c.definition.substring(0, 100)}...`
).join('\n\n')}

Which CEDS element best matches the SIF element? Return only the ID.`;

console.log(prompt);

console.log('\n' + '-'.repeat(70));
console.log('\n💡 EXPECTED BEHAVIOR:');
console.log(`An LLM would likely identify ID: ${example.ceds_id} as the best match`);
console.log('because the descriptions align semantically (both refer to first/given name).');

console.log('\n💰 COST FOR THIS QUERY:');
console.log('Tokens: ~500 input, ~10 output');
console.log('Cost: ~$0.0001 (GPT-4o-mini)');

console.log('\n🚀 TO RUN WITH REAL LLM:');
console.log('OPENAI_API_KEY=your-key node test-llm-real.js');

console.log('\n=' .repeat(70));

db.close();