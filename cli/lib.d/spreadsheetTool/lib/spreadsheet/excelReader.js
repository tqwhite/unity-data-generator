'use strict';

/**
 * Excel Reader Module
 * Handles reading Excel spreadsheets
 */

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

/**
 * List all sheets in a spreadsheet
 * @param {string} spreadsheetFile - Path to the spreadsheet file
 * @returns {Promise<Array>} List of sheet names
 */
async function listSheets(spreadsheetFile) {
  const { xLog } = process.global;
  
  // Check if the spreadsheet file exists
  if (!fs.existsSync(spreadsheetFile)) {
    throw new Error(`Spreadsheet file not found: ${spreadsheetFile}`);
  }
  
  // Read the spreadsheet
  const workbook = xlsx.readFile(spreadsheetFile);
  const sheetNames = workbook.SheetNames;
  
  // Display sheets
  xLog.result('Available sheets:');
  sheetNames.forEach(sheet => {
    xLog.result(`  - ${sheet}`);
  });
  
  return sheetNames;
}

/**
 * Read a spreadsheet file into a structured format
 * @param {string} spreadsheetFile - Path to the spreadsheet file
 * @returns {Promise<Object>} The structured spreadsheet data
 */
async function readSpreadsheet(spreadsheetFile) {
  const { xLog } = process.global;
  
  // Check if the spreadsheet file exists
  if (!fs.existsSync(spreadsheetFile)) {
    throw new Error(`Spreadsheet file not found: ${spreadsheetFile}`);
  }
  
  xLog.status(`Processing spreadsheet: ${spreadsheetFile}`);
  
  // Read the spreadsheet
  const workbook = xlsx.readFile(spreadsheetFile);
  const sheetNames = workbook.SheetNames;
  
  // Process each sheet in the workbook
  const allColumns = new Set();
  const allData = [];
  
  // First pass - collect all unique column names across all sheets
  sheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const sheetData = xlsx.utils.sheet_to_json(sheet, { header: 'A' });
    
    // Skip empty sheets
    if (sheetData.length === 0) return;
    
    // Get headers from the first row
    const headers = sheetData[0];
    Object.values(headers).forEach(header => {
      if (header && typeof header === 'string') {
        allColumns.add(header);
      }
    });
  });
  
  // Second pass - process each sheet's data
  sheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const sheetData = xlsx.utils.sheet_to_json(sheet);
    
    // Skip empty sheets
    if (sheetData.length === 0) return;
    
    // Add sheet name to each row
    sheetData.forEach(row => {
      row.SheetName = sheetName;
      allData.push(row);
    });
    
    xLog.status(`Processed sheet: ${sheetName} (${sheetData.length} rows)`);
  });
  
  // Create result data structure
  const resultData = {
    metadata: {
      fileName: path.basename(spreadsheetFile),
      totalSheets: sheetNames.length,
      totalRows: allData.length,
      columns: Array.from(allColumns)
    },
    data: allData
  };
  
  return resultData;
}

module.exports = {
  listSheets,
  readSpreadsheet
};