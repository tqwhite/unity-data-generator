const xlsx = require('./node_modules/xlsx');
const path = '/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/code/assets/databaseDefinitionss/CEDS/CEDS-Elements_v13_hasSpreadsheet/CEDS-V13.0.0.0.xlsx';

const wb = xlsx.readFile(path);
const sheetName = 'All - By Domain';
const ws = wb.Sheets[sheetName];

// Get the range
const range = xlsx.utils.decode_range(ws['!ref']);
console.log('Sheet range:', ws['!ref']);
console.log('Rows (including header):', range.e.r + 1);

// Parse with sheet_to_json
const data = xlsx.utils.sheet_to_json(ws);
console.log('\nRows from sheet_to_json:', data.length);

// Get all unique column names across ALL rows (not just first row)
const allColumns = new Set();
data.forEach(row => {
  Object.keys(row).forEach(key => allColumns.add(key));
});
console.log('Unique columns across all rows:', allColumns.size);
console.log('Column names:', Array.from(allColumns).sort());

// Count rows with empty/undefined Global ID
const noGlobalId = data.filter(r => !r['Global ID'] || r['Global ID'] === '').length;
console.log('\nRows without Global ID:', noGlobalId);

// Show sample of first few rows
console.log('\nFirst 3 rows (Global ID, Element Name, Domain):');
data.slice(0, 3).forEach((r, i) => {
  console.log(`  Row ${i+1}: GlobalID="${r['Global ID']}", Element="${r['Element Name']}", Domain="${r['Domain']}"`);
});

// Count truly empty rows (all fields null/undefined/empty)
const emptyRows = data.filter(row => {
  const values = Object.values(row);
  return values.every(v => !v || v === '');
});
console.log('\nCompletely empty rows:', emptyRows.length);
