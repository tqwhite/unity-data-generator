'use strict';

/**
 * Excel Writer Module
 * Handles writing data to Excel and JSON files
 */

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

/**
 * Write data to a JSON file
 * @param {string} outputFilePath - Path to the output JSON file
 * @param {Object} data - Data to write to the file
 * @returns {Promise<void>}
 */
async function writeJsonFile(outputFilePath, data) {
  const { xLog } = process.global;
  
  // Convert to JSON
  const jsonOutput = JSON.stringify(data, null, 2);
  
  // Ensure the output directory exists
  const outputDir = path.dirname(outputFilePath);
  fs.mkdirSync(outputDir, { recursive: true });
  
  // Write to file
  fs.writeFileSync(outputFilePath, jsonOutput, 'utf-8');
  xLog.status(`JSON output written to: ${outputFilePath}`);
  
  // Echo to console if requested
  if (process.global.commandLineParameters.switches.echoAlso) {
    xLog.result(`\n${jsonOutput}\n`);
  }
}

/**
 * Write data to an Excel file
 * @param {string} outputFilePath - Path to the output Excel file
 * @param {Object} data - Data to write to the file
 * @returns {Promise<void>}
 */
async function writeExcelFile(outputFilePath, data) {
  const { xLog } = process.global;
  
  // Create a new workbook
  const newWorkbook = xlsx.utils.book_new();
  
  // Group data by SheetName
  const dataBySheet = {};
  data.data.forEach(row => {
    const sheetName = row.SheetName || 'Default';
    if (!dataBySheet[sheetName]) {
      dataBySheet[sheetName] = [];
    }
    dataBySheet[sheetName].push(row);
  });
  
  // Create a worksheet for each sheet name
  Object.entries(dataBySheet).forEach(([sheetName, rows]) => {
    // Remove SheetName property from each row
    const cleanRows = rows.map(row => {
      const { SheetName, ...rest } = row;
      return rest;
    });
    
    // Create worksheet from rows
    const worksheet = xlsx.utils.json_to_sheet(cleanRows);
    
    // Use valid Excel sheet name (max 31 chars, no special chars)
    const safeSheetName = sheetName.substring(0, 31).replace(/[\[\]\*\/\\?:]/g, '_');
    
    // Add worksheet to workbook
    xlsx.utils.book_append_sheet(newWorkbook, worksheet, safeSheetName);
    xLog.status(`Added sheet: ${safeSheetName} with ${rows.length} rows`);
  });
  
  // Write to Excel file
  xlsx.writeFile(newWorkbook, outputFilePath);
  xLog.status(`Excel file generated at: ${outputFilePath}`);
}

/**
 * Write data to both JSON and Excel files
 * @param {string} basePath - Base output path (without extension)
 * @param {Object} data - Data to write to the files
 * @returns {Promise<Object>} Paths to the created files
 */
async function writeDataFiles(basePath, data) {
  // Generate file paths
  const jsonPath = `${basePath}.json`;
  const excelPath = `${basePath}_generated.xlsx`;
  
  // Write both files
  await writeJsonFile(jsonPath, data);
  await writeExcelFile(excelPath, data);
  
  return {
    jsonPath,
    excelPath
  };
}

module.exports = {
  writeJsonFile,
  writeExcelFile,
  writeDataFiles
};