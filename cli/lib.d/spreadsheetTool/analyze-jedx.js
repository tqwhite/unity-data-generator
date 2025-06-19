const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const file = '/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/code/assets/databaseDefinitionss/JEDx/JEDxSampleDataSheets.xls';

if (fs.existsSync(file)) {
  const workbook = xlsx.readFile(file);
  const sheetNames = workbook.SheetNames;
  
  console.log('Available sheets:', sheetNames);
  
  // Look at first sheet's data
  const firstSheet = workbook.Sheets[sheetNames[0]];
  const sheetData = xlsx.utils.sheet_to_json(firstSheet);
  
  console.log('\nFirst 3 records from sheet:', sheetNames[0]);
  console.log('Total records:', sheetData.length);
  
  sheetData.slice(0, 3).forEach((record, index) => {
    console.log(`Record ${index + 1}:`);
    console.log('  XPath:', record.XPath || 'UNDEFINED');
    console.log('  Path:', record.Path || 'UNDEFINED'); 
    console.log('  Name:', record.Name || 'UNDEFINED');
    console.log('  All keys:', Object.keys(record));
  });
  
  // Check for duplicate XPath or Path values
  const xpathValues = sheetData.map(r => r.XPath || '').filter(v => v);
  const pathValues = sheetData.map(r => r.Path || '').filter(v => v);
  
  console.log('\nXPath values count:', xpathValues.length);
  console.log('Unique XPath values:', new Set(xpathValues).size);
  console.log('Path values count:', pathValues.length);
  console.log('Unique Path values:', new Set(pathValues).size);
  
  // Check for empty values
  const emptyXPath = sheetData.filter(r => !r.XPath || r.XPath === '').length;
  const emptyPath = sheetData.filter(r => !r.Path || r.Path === '').length;
  console.log('Records with empty XPath:', emptyXPath);
  console.log('Records with empty Path:', emptyPath);
  
  // Show some Path values
  console.log('\nSample Path values:');
  pathValues.slice(0, 5).forEach((path, i) => console.log(`  ${i+1}: "${path}"`));
} else {
  console.log('File not found:', file);
}