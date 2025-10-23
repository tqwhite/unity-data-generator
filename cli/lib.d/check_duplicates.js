const xlsx = require('./node_modules/xlsx');
const wb = xlsx.readFile('/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/code/assets/databaseDefinitionss/CEDS/CEDS-Elements_v13_hasSpreadsheet/CEDS-V13.0.0.0.xlsx');
const data = xlsx.utils.sheet_to_json(wb.Sheets['All - By Domain']);
const globalIds = data.map(r => r['Global ID']).filter(id => id);
const unique = new Set(globalIds);
console.log('Total rows:', data.length);
console.log('Rows with Global ID:', globalIds.length);
console.log('Unique Global IDs:', unique.size);
const hasDups = globalIds.length !== unique.size;
console.log('Has duplicates:', hasDups);
if (hasDups) {
  const counts = {};
  globalIds.forEach(id => counts[id] = (counts[id] || 0) + 1);
  const dups = Object.entries(counts).filter(([id, count]) => count > 1).slice(0, 10);
  console.log('\nSample duplicates:');
  dups.forEach(([id, count]) => console.log('  ' + id + ': ' + count + ' times'));
}