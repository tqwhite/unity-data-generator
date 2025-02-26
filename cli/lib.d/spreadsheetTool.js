#!/usr/bin/env node
'use strict';

/**
 * Copyright 2023 Access for Learning
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Authors: TQ White II (Justkidding, Inc.) and John Lovell (Access for Learning, LLC)
 */
// =============================================================================
// SYSTEM IMPORTS

// Import necessary modules
const path = require('path');
const os = require('os');
const fs = require('fs');
const xlsx = require('xlsx');
const qt = require('qtools-functional-library');
const crypto = require('crypto');

// --------------------------------------------------------------------------------
// FIND PROJECT ROOT
const findProjectRoot = ({ rootFolderName = 'system', closest = true } = {}) =>
	__dirname.replace(
		new RegExp(`^(.*${closest ? '' : '?'}\/${rootFolderName}).*$`),
		'$1',
	);
const applicationBasePath = findProjectRoot(); 

// =============================================================================
// MODULE NAME DETERMINATION

// Derive the module name from the current filename (without extension)
const moduleName = path.basename(__filename, '.js');

// =============================================================================
// MODULE IMPORTS

const initAtp = require('qtools-ai-thought-processor/jina')({
	configFileBaseName: moduleName,
	applicationBasePath,
	applicationControls: ['-loadDatabase', 'purgeBackupDbTables'],
});

// Initialize SQLite database
const initSqliteDatabase = (databaseFilePath) => {
	const Database = require('better-sqlite3');
	return new Database(databaseFilePath, { verbose: console.log });
};

// =============================================================================
// MAIN EXECUTION FUNCTION

(async () => {
	// =============================================================================
	// INITIALIZATION

	// Access global variables set up by 'initAtp'
	const { xLog, getConfig, commandLineParameters } = process.global;

	// Get configuration specific to this module
	let { outputsPath, databaseFilePath, retainOnDbBackupPurge = 3 } = getConfig(moduleName);
	
	// If database path is not specified in config, use the embed-vector-tools one
	if (!databaseFilePath) {
		const embedVectorConfig = getConfig('embedVectorTools');
		databaseFilePath = embedVectorConfig ? embedVectorConfig.databaseFilePath : null;
		
		if (databaseFilePath) {
			xLog.status(`Using database path from embedVectorTools: ${databaseFilePath}`);
		} else {
			databaseFilePath = path.join(applicationBasePath, 'data', 'data.sqlite3');
			xLog.status(`Using default database path: ${databaseFilePath}`);
			
			// Ensure directory exists
			fs.mkdirSync(path.dirname(databaseFilePath), { recursive: true });
		}
	}

	// =============================================================================
	// COMMAND-LINE PARAMETERS PROCESSING

	// Get command-line parameters
	const spreadsheetFile = commandLineParameters.qtGetSurePath('fileList[0]', '');
	const outputPathArg = commandLineParameters.qtGetSurePath('fileList[1]', '');
	const loadDatabaseMode = commandLineParameters.switches.loadDatabase;
	const purgeBackupsMode = commandLineParameters.switches.purgeBackupDbTables;
	
	// Check parameters based on mode
	if (purgeBackupsMode) {
		// When purging backups, no other parameters are needed
		// We'll handle this in a separate flow
	} else if (loadDatabaseMode) {
		// In load database mode, input file is required to update the database
		if (!spreadsheetFile) {
			xLog.error('Input spreadsheet file is required when using -loadDatabase. Use: spreadsheetTool -loadDatabase inputFile [outputDirectory]');
			process.exit(1);
		}
	} else {
		// In default mode (just read from DB), just need spreadsheet file for filename if output not specified
		if (!spreadsheetFile && !outputPathArg && !commandLineParameters.switches.help) {
			xLog.error('Either input file or output directory is required. Use: spreadsheetTool [inputFile] [outputDirectory] or -help for more information');
			process.exit(1);
		}
	}

	// Show help if requested
	if (commandLineParameters.switches.help) {
		xLog.result(`
Spreadsheet Tool - Read Excel files into structured data

USAGE:
  spreadsheetTool [inputFile] [outputDirectory]   Generate JSON/Excel files from database (default)
  spreadsheetTool -loadDatabase inputFile [outputDirectory]   Load spreadsheet INTO database, then generate files
  
  inputFile          Path to the Excel spreadsheet file (required with -loadDatabase, optional otherwise)
  outputDirectory    Directory for output files (optional, default is configured output path)

OPTIONS:
  -list              List all sheets in the spreadsheet
  -loadDatabase      Load spreadsheet data INTO the database (by default, database is not updated)
  -purgeBackupDbTables  Remove old database table backups, keeping only the most recent ones
  -echoAlso          Display the output in the console
  -help              Show this help message
		`);
		process.exit(0);
	}

	// List sheets if requested
	if (commandLineParameters.switches.list) {
		if (!fs.existsSync(spreadsheetFile)) {
			xLog.error(`Spreadsheet file not found: ${spreadsheetFile}`);
			process.exit(1);
		}

		const workbook = xlsx.readFile(spreadsheetFile);
		const sheetNames = workbook.SheetNames;
		
		xLog.result('Available sheets:');
		sheetNames.forEach(sheet => {
			xLog.result(`  - ${sheet}`);
		});
		
		process.exit(0);
	}

	// Set up output directory and file paths based on arguments
	let finalOutputPath;
	let baseFileName;
	
	if (outputPathArg) {
		// If an output path is specified, use it
		finalOutputPath = outputPathArg;
		// Create directory if it doesn't exist
		fs.mkdirSync(finalOutputPath, { recursive: true });
	} else {
		// Use default output path
		finalOutputPath = outputsPath;
	}
	
	// Determine base filename
	if (spreadsheetFile) {
		baseFileName = path.basename(spreadsheetFile, path.extname(spreadsheetFile));
	} else {
		baseFileName = 'database_export';
	}
	
	// Construct the output file paths
	const outputFilePath = path.join(finalOutputPath, `${baseFileName}.json`);

	// Ensure the output directory exists
	const outputDir = path.dirname(outputFilePath);
	fs.mkdirSync(outputDir, { recursive: true });

	// Helper function to generate refId for a record
	const generateRefId = (record) => {
		// Create a deterministic string from the record, excluding any refId
		const { refId, ...recordWithoutRefId } = record;
		const str = JSON.stringify(recordWithoutRefId);
		return crypto.createHash('sha256').update(str).digest('hex').substring(0, 24);
	};
	
	// Function to create backup table if it exists
	const backupAndCreateTable = (db, tableName) => {
		// Check if table exists
		const tableExists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(tableName);
		
		if (tableExists) {
			// Create backup table name with timestamp
			const now = new Date();
			const dateStr = `${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
			
			// Find the next available version number
			let version = 1;
			let backupTableName;
			do {
				backupTableName = `${tableName}_backup_${dateStr}_v${version}`;
				const backupExists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(backupTableName);
				if (!backupExists) break;
				version++;
			} while (version < 100); // Safety limit
			
			// Create backup table
			db.prepare(`CREATE TABLE "${backupTableName}" AS SELECT * FROM "${tableName}"`).run();
			xLog.status(`Created backup table: ${backupTableName}`);
			
			// Drop original table
			db.prepare(`DROP TABLE "${tableName}"`).run();
			xLog.status(`Dropped original table: ${tableName}`);
		}
	};
	
	// Create schema for the table based on the data
	const createTableSchema = (db, tableName, data) => {
		// Collect all unique property names across all records
		const allProperties = new Set(['refId']); // Always include the primary key
		data.forEach(record => {
			Object.keys(record).forEach(key => allProperties.add(key));
		});
		
		// Create SQL for table schema
		const columnDefs = Array.from(allProperties).map(prop => {
			if (prop === 'refId') {
				return `"${prop}" TEXT PRIMARY KEY`;
			} else {
				return `"${prop}" TEXT`;
			}
		}).join(', ');
		
		// Create the table
		const createTableSQL = `CREATE TABLE "${tableName}" (${columnDefs})`;
		db.prepare(createTableSQL).run();
		xLog.status(`Created table "${tableName}" with columns: ${Array.from(allProperties).join(', ')}`);
	};
	
	// Function to insert data into the table
	const insertDataIntoTable = (db, tableName, data) => {
		// Process all records and add refId
		const processedData = data.map(record => {
			// Add a refId to each record
			return { ...record, refId: generateRefId(record) };
		});
		
		// Start a transaction for faster inserts
		const insertTransaction = db.transaction((records) => {
			// Get all property names (columns) from the first record
			const allProperties = new Set();
			records.forEach(record => {
				Object.keys(record).forEach(key => allProperties.add(key));
			});
			
			// Create a prepared statement for insertion
			const props = Array.from(allProperties);
			const placeholders = props.map(() => '?').join(',');
			const insertSQL = `INSERT INTO "${tableName}" (${props.map(p => `"${p}"`).join(',')}) VALUES (${placeholders})`;
			const insertStmt = db.prepare(insertSQL);
			
			// Insert each record
			records.forEach(record => {
				const values = props.map(prop => record[prop] || null);
				insertStmt.run(values);
			});
		});
		
		// Execute the transaction with all records
		insertTransaction(processedData);
		xLog.status(`Inserted ${processedData.length} records into "${tableName}"`);
		
		return processedData;
	};
	
	// Function to read data from table
	const readDataFromTable = (db, tableName) => {
		// Get all rows
		const selectSQL = `SELECT * FROM "${tableName}"`;
		const rows = db.prepare(selectSQL).all();
		
		// Strip refId from the results
		return rows.map(row => {
			const { refId, ...rest } = row;
			return rest;
		});
	};
	
	// Function to purge old database backup tables
	const purgeBackupTables = (db, baseTableName, retainCount = 3) => {
		// Find all backup tables for the specified base table
		const allTablesSQL = `SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '${baseTableName}_backup_%' ORDER BY name DESC`;
		const backupTables = db.prepare(allTablesSQL).all();
		
		if (backupTables.length === 0) {
			xLog.status(`No backup tables found for ${baseTableName}`);
			return;
		}
		
		// Keep the most recent ones based on retainCount
		const tablesToKeep = backupTables.slice(0, retainCount);
		const tablesToDelete = backupTables.slice(retainCount);
		
		xLog.status(`Found ${backupTables.length} backup tables, keeping ${tablesToKeep.length}, removing ${tablesToDelete.length}`);
		
		// Drop the older tables
		if (tablesToDelete.length > 0) {
			tablesToDelete.forEach(table => {
				const dropSQL = `DROP TABLE "${table.name}"`;
				db.prepare(dropSQL).run();
				xLog.status(`Dropped backup table: ${table.name}`);
			});
		}
		
		return {
			kept: tablesToKeep.map(t => t.name),
			deleted: tablesToDelete.map(t => t.name)
		};
	};

	// =============================================================================
	// PROCESS SPREADSHEET

	try {
		// Initialize database
		const db = initSqliteDatabase(databaseFilePath);
		const tableName = 'naDataModel';
		let resultData;
		let jsonOutput;
		
		// Handle purge backups mode
		if (purgeBackupsMode) {
			try {
				xLog.status(`Purging old backup tables for ${tableName}...`);
				const purgeResult = purgeBackupTables(db, tableName, retainOnDbBackupPurge);
				if (purgeResult && purgeResult.deleted && purgeResult.deleted.length > 0) {
					xLog.status(`Successfully purged ${purgeResult.deleted.length} backup tables`);
					xLog.status(`Kept the most recent ${purgeResult.kept.length} backups: ${purgeResult.kept.join(', ')}`);
					xLog.status(`Deleted old backups: ${purgeResult.deleted.join(', ')}`);
				} else {
					xLog.status(`No backup tables were deleted. Either none found or all were within the retain count (${retainOnDbBackupPurge}).`);
				}
				db.close();
				process.exit(0);
			} catch (purgeError) {
				xLog.error(`Error purging backup tables: ${purgeError.message}`);
				db.close();
				process.exit(1);
			}
		}
		
		try {
			let spreadsheetData;
			
			// Process spreadsheet if file is provided and we're in loadDatabase mode
			if (spreadsheetFile && loadDatabaseMode) {
				// Check if the spreadsheet file exists
				if (!fs.existsSync(spreadsheetFile)) {
					xLog.error(`Spreadsheet file not found: ${spreadsheetFile}`);
					process.exit(1);
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
				spreadsheetData = {
					metadata: {
						fileName: path.basename(spreadsheetFile),
						totalSheets: sheetNames.length,
						totalRows: allData.length,
						columns: Array.from(allColumns)
					},
					data: allData
				};
				
				// Database operations - write data to database
				xLog.status(`Writing data to database at: ${databaseFilePath}`);
				
				// Backup existing table if it exists and create new one
				backupAndCreateTable(db, tableName);
				
				// Create new table schema based on the data
				createTableSchema(db, tableName, spreadsheetData.data);
				
				// Insert data into the table
				insertDataIntoTable(db, tableName, spreadsheetData.data);
				xLog.status(`Database updated successfully with ${spreadsheetData.data.length} records`);
			}
			
			// Always read from database for output files
			xLog.status(`Reading data from database at: ${databaseFilePath}`);
			
			// Check if table exists
			const tableExists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(tableName);
			if (!tableExists) {
				xLog.error(`Table '${tableName}' does not exist in the database. Use -loadDatabase to create it first.`);
				process.exit(1);
			}
			
			// Load data from database
			const dbData = readDataFromTable(db, tableName);
			
			// Get unique columns
			const allColumns = new Set();
			dbData.forEach(row => {
				Object.keys(row).forEach(key => allColumns.add(key));
			});
			
			// Create result data structure
			resultData = {
				metadata: {
					source: 'Database',
					tableName: tableName,
					totalRows: dbData.length,
					columns: Array.from(allColumns)
				},
				data: dbData
			};
			
			xLog.status(`Loaded ${dbData.length} records from database table '${tableName}'`);
			
			// Convert to JSON
			jsonOutput = JSON.stringify(resultData, null, 2);
			
			// Write JSON to file 
			fs.writeFileSync(outputFilePath, jsonOutput, 'utf-8');
			xLog.status(`JSON output written to: ${outputFilePath}`);
			
			// Create Excel file from JSON data
			const excelOutputPath = path.join(path.dirname(outputFilePath), `${path.basename(outputFilePath, '.json')}_generated.xlsx`);
			
			// Create a new workbook
			const newWorkbook = xlsx.utils.book_new();
			
			// Group data by SheetName
			const dataBySheet = {};
			resultData.data.forEach(row => {
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
			xlsx.writeFile(newWorkbook, excelOutputPath);
			xLog.status(`Excel file generated from database data: ${excelOutputPath}`);
			
			// Echo to console if requested
			if (commandLineParameters.switches.echoAlso) {
				xLog.result(`\n${jsonOutput}\n`);
			}
			
		} catch (innerError) {
			xLog.error(`Processing error: ${innerError.message}`);
		} finally {
			// Close the database connection
			if (db) db.close();
		}

	} catch (error) {
		xLog.error(`Error processing: ${error.message}`);
		process.exit(1);
	}

})(); // End of main execution function
