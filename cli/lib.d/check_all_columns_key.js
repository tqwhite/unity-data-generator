const xlsx = require('./node_modules/xlsx');
const crypto = require('crypto');

const wb = xlsx.readFile('/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/code/assets/databaseDefinitionss/CEDS/CEDS-Elements_v13_hasSpreadsheet/CEDS-V13.0.0.0.xlsx');
const data = xlsx.utils.sheet_to_json(wb.Sheets['All - By Domain']);

// Get all columns
const columns = Object.keys(data[0]);
console.log('Using all columns as composite key:', columns.length, 'columns\n');

// Create a hash of all column values for each row
const rowHashes = data.map(row => {
  const values = columns.map(col => String(row[col] || '')).join('|');
  return crypto.createHash('md5').update(values).digest('hex');
});

const unique = new Set(rowHashes);
console.log('Total rows:', data.length);
console.log('Unique rows (all columns):', unique.size);
console.log('True duplicates:', data.length - unique.size);

if (data.length !== unique.size) {
  const counts = {};
  rowHashes.forEach((hash, idx) => {
    if (!counts[hash]) {
      counts[hash] = { count: 0, indices: [] };
    }
    counts[hash].count++;
    counts[hash].indices.push(idx);
  });

  const dups = Object.entries(counts).filter(([hash, info]) => info.count > 1).slice(0, 5);
  console.log('\nSample EXACT duplicate rows:');
  dups.forEach(([hash, info]) => {
    const firstRow = data[info.indices[0]];
    console.log(`\n  Found ${info.count} identical copies of:`);
    console.log(`    Global ID: ${firstRow['Global ID']}`);
    console.log(`    Element: ${firstRow['Element Name']}`);
    console.log(`    Domain: ${firstRow['Domain']}`);
    console.log(`    Entity: ${firstRow['Entity']}`);
  });

  console.log('\n✓ Using all columns would eliminate these exact duplicates');
  console.log('✓ Remaining unique rows:', unique.size);
}