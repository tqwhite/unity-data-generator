#!/usr/bin/env node

const Database = require('better-sqlite3');
const db = new Database('/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/datastore/cedsIds.sqlite3');

// Get unique xPath patterns
const paths = db.prepare(`
    SELECT DISTINCT 
        substr(xpath, 1, instr(xpath || '/', '/', instr(xpath || '/', '/', 2))) as path_prefix,
        COUNT(*) as count
    FROM naDataModel
    WHERE xpath IS NOT NULL
    GROUP BY path_prefix
    ORDER BY count DESC
    LIMIT 30
`).all();

console.log('Top SIF xPath Prefixes to Learn Domain Mappings:\n');
paths.forEach(p => {
    if (p.path_prefix && p.path_prefix.length > 1) {
        console.log(`${p.path_prefix} (${p.count} elements)`);
    }
});

// Get actual object types
const objects = db.prepare(`
    SELECT DISTINCT 
        substr(xpath, 2, instr(substr(xpath, 2) || '/', '/') - 1) as object_type,
        COUNT(*) as count
    FROM naDataModel
    WHERE xpath IS NOT NULL
    GROUP BY object_type
    ORDER BY count DESC
    LIMIT 20
`).all();

console.log('\n\nMain SIF Object Types:\n');
objects.forEach(o => {
    if (o.object_type) {
        console.log(`${o.object_type}: ${o.count} elements`);
    }
});

db.close();
