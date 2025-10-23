const xlsx = require('./node_modules/xlsx');
const wb = xlsx.readFile('/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/code/assets/databaseDefinitionss/CEDS/CEDS-Elements_v13_hasSpreadsheet/CEDS-V13.0.0.0.xlsx');
const data = xlsx.utils.sheet_to_json(wb.Sheets['All - By Domain']);

const compositeKeys = data.map(r => {
  const id = r['Global ID'] || '';
  const domain = r['Domain'] || '';
  const entity = r['Entity'] || '';
  return `${id}|${domain}|${entity}`;
});

const unique = new Set(compositeKeys);
console.log('Total rows:', data.length);
console.log('Unique composite keys (ID+Domain+Entity):', unique.size);
console.log('Has duplicates:', data.length !== unique.size);

if (data.length !== unique.size) {
  const counts = {};
  compositeKeys.forEach(key => counts[key] = (counts[key] || 0) + 1);
  const dups = Object.entries(counts).filter(([key, count]) => count > 1).slice(0, 10);
  console.log('\nSample duplicate composite keys:');
  dups.forEach(([key, count]) => {
    console.log(`  ${key}: ${count} times`);
    // Show the actual rows
    const matchingRows = data.filter((r, idx) => compositeKeys[idx] === key).slice(0, 2);
    matchingRows.forEach(r => {
      console.log(`    -> Element: ${r['Element Name']}, Status: ${r['Status']}, New Assoc: ${r['New Association']}`);
    });
  });
}