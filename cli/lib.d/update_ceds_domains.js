#!/usr/bin/env node
'use strict';

const xlsx = require('./node_modules/xlsx');
const Database = require('../node_modules/better-sqlite3');

// Read spreadsheet
console.log('Reading spreadsheet...');
const workbook = xlsx.readFile('/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/code/assets/databaseDefinitionss/CEDS/CEDS-Elements_v13_hasSpreadsheet/CEDS-V13.0.0.0.xlsx');
const data = xlsx.utils.sheet_to_json(workbook.Sheets['All - By Domain']);
console.log(`Read ${data.length} rows from spreadsheet`);

// Connect to database
const db = new Database('/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/datastore/cedsIds.sqlite3');

// Add columns if they don't exist
try {
  db.exec('ALTER TABLE _CEDSElements ADD COLUMN Domain TEXT');
  console.log('Added Domain column');
} catch (e) {
  console.log('Domain column already exists');
}

try {
  db.exec('ALTER TABLE _CEDSElements ADD COLUMN Entity TEXT');
  console.log('Added Entity column');
} catch (e) {
  console.log('Entity column already exists');
}

// Update records
console.log('\nUpdating database...');
const stmt = db.prepare('UPDATE _CEDSElements SET Domain = ?, Entity = ? WHERE GlobalID = ?');
let updateCount = 0;
let skipCount = 0;

const updates = db.transaction(() => {
  data.forEach(row => {
    const globalId = row['Global ID'];
    const domain = row['Domain'];
    const entity = row['Entity'];

    if (!globalId) {
      skipCount++;
      return;
    }

    // Skip bad domain data
    if (domain && domain.length > 50) {
      skipCount++;
      return;
    }

    const result = stmt.run(
      domain || null,
      entity || null,
      globalId
    );

    if (result.changes > 0) {
      updateCount++;
    }
  });
});

updates();

console.log(`\n✓ Updated ${updateCount} records`);
console.log(`  Skipped ${skipCount} records`);

// Verify the results
console.log('\nVerifying domain distribution:');
const stats = db.prepare('SELECT Domain, COUNT(*) as count FROM _CEDSElements WHERE Domain IS NOT NULL GROUP BY Domain ORDER BY count DESC').all();
stats.forEach(s => console.log(`  ${s.Domain}: ${s.count}`));

const total = db.prepare('SELECT COUNT(*) as count FROM _CEDSElements WHERE Domain IS NOT NULL').get();
const totalAll = db.prepare('SELECT COUNT(*) as count FROM _CEDSElements').get();
console.log(`\n✓ Total elements with domains: ${total.count} of ${totalAll.count} total`);

// Show samples
console.log('\nSample updated records:');
const samples = db.prepare('SELECT GlobalID, ElementName, Domain, Entity FROM _CEDSElements WHERE Domain IS NOT NULL LIMIT 5').all();
samples.forEach(row => {
  console.log(`  ${row.GlobalID}: ${row.ElementName}`);
  console.log(`    Domain: ${row.Domain}, Entity: ${row.Entity}`);
});

db.close();
console.log('\n✓ Done!');