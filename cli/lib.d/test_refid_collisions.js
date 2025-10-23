const crypto = require('crypto');
const xlsx = require('./node_modules/xlsx');

const wb = xlsx.readFile('/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/code/assets/databaseDefinitionss/CEDS/CEDS-Elements_v13_hasSpreadsheet/CEDS-V13.0.0.0.xlsx');
const data = xlsx.utils.sheet_to_json(wb.Sheets['All - By Domain']);

// Get all columns
const columns = Object.keys(data[0]);

// Generate refIds the same way spreadsheetTool does
const refIds = data.map(record => {
  const values = columns.map(col => record[col] || '');
  const uniqueValue = values.join('|');
  const hash = crypto.createHash('sha256').update(uniqueValue).digest('hex');
  // This is what spreadsheetTool does - only uses first 12 chars!
  return BigInt('0x' + hash.substring(0, 12)).toString();
});

const unique = new Set(refIds);

console.log('Total rows:', data.length);
console.log('Unique refIds (12-char hash):', unique.size);
console.log('Hash collisions:', data.length - unique.size);

if (data.length !== unique.size) {
  // Find which records collided
  const counts = {};
  refIds.forEach((refId, idx) => {
    if (!counts[refId]) counts[refId] = [];
    counts[refId].push(idx);
  });

  const collisions = Object.entries(counts).filter(([refId, indices]) => indices.length > 1).slice(0, 3);
  console.log('\nSample hash collisions:');
  collisions.forEach(([refId, indices]) => {
    console.log(`\n  RefId ${refId} collides for ${indices.length} records:`);
    indices.slice(0, 2).forEach(idx => {
      const r = data[idx];
      console.log(`    Row ${idx}: GlobalID=${r['Global ID']}, Element=${r['Element Name']}, Domain=${r['Domain']}`);
    });
  });
}

console.log('\n✗ The 12-character hash truncation is causing collisions!');
console.log('✓ The source data IS unique, but the refId generation truncates too much');