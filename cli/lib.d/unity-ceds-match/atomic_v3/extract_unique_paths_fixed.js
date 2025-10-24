#!/usr/bin/env node

const Database = require('better-sqlite3');
const db = new Database('/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/datastore/cedsIds.sqlite3');

// Get sample xPaths
const samples = db.prepare(`
    SELECT DISTINCT xpath
    FROM naDataModel
    WHERE xpath IS NOT NULL
    LIMIT 100
`).all();

// Extract object types manually
const objectTypes = {};
samples.forEach(s => {
    const parts = s.xpath.split('/').filter(p => p);
    if (parts[0]) {
        const objType = parts[0].replace(/s$/, ''); // Remove plural
        objectTypes[objType] = (objectTypes[objType] || 0) + 1;
    }
});

console.log('Sample SIF Object Types for Domain Mapping:\n');
console.log('These need LLM to tell us which CEDS domain they map to:\n');

Object.entries(objectTypes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .forEach(([type, count]) => {
        console.log(`${type}`);
    });

// Get some real examples
const examples = db.prepare(`
    SELECT xpath, Name
    FROM naDataModel  
    WHERE xpath LIKE '/xStudent%'
    LIMIT 5
`).all();

console.log('\n\nExample xStudent paths:');
examples.forEach(e => {
    console.log(`${e.xpath} (${e.Name})`);
});

const staffExamples = db.prepare(`
    SELECT xpath, Name
    FROM naDataModel
    WHERE xpath LIKE '%Staff%' OR xpath LIKE '%Employee%'
    LIMIT 5
`).all();

console.log('\n\nExample Staff/Employee paths:');
staffExamples.forEach(e => {
    console.log(`${e.xpath} (${e.Name})`);
});

db.close();
