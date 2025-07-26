#!/usr/bin/env node
'use strict';

const qt = require('qtools-functional-library');

//START OF moduleFunction() ============================================================

const moduleFunction = function(args={}) {

const mainHelp = args => {
	const {defaultRequestFilePath, errorMessage=''} = args;

	return `
============================================================

NAME

	Spreadsheet Tool - Excel/CSV data processing and database integration for Unity Object Generator

DESCRIPTION

	spreadsheetTool [inputFile] [outputDirectory] [OPTIONS]
	
	Bidirectional data conversion tool for Unity Object Generator project.
	Provides seamless conversion between SQLite database tables and Excel/JSON files
	in both directions to support flexible data workflows.
	
	DATABASE EXPORT (Default Operation):
	Reads data from Unity Object Generator SQLite database tables and generates
	Excel (.xlsx) and JSON files for external use, reporting, and data sharing.
	No flags required - simply specify table and output location.
	
	SPREADSHEET IMPORT (With -loadDatabase):
	Imports Excel/CSV data into SQLite database tables using the project's 
	standard database abstraction layer. After import, automatically generates 
	export files from the newly stored data for verification.
	
	BIDIRECTIONAL WORKFLOW:
	The tool supports complete round-trip data handling: import spreadsheets,
	process in database, then export updated data back to spreadsheets.

CONTROLS

	inputFile:          IMPORT: Path to Excel (.xlsx) or CSV file for database import
	                    Required when using -loadDatabase, optional for database export
	                    
	outputDirectory:    EXPORT: Directory for generated Excel/JSON output files
	                    Defaults to configured output path if not specified
	                    
	--tableName:        DATABASE: Specify database table name for import/export
	                    For import: creates table with this name (default: camelCase from filename)
	                    For export: reads from this table (default: configured defaultTableName)
	                    
	--sheetName:        EXCEL: Specific worksheet name to process (Excel files only)
	                    If not specified, processes the first worksheet
	                    
	--configPath:       OVERRIDE: Custom configuration file path
	                    Overrides default project configuration settings

SWITCHES

	-loadDatabase:      IMPORT: Import spreadsheet data INTO database (then export)
	                    Changes mode from export-only to import-then-export
	                    Requires inputFile parameter to specify source spreadsheet
	                    
	-list:              INFO: List all worksheets in Excel file without processing
	                    Useful for exploring multi-sheet Excel files before import
	                    
	-purgeBackupDbTables: MAINTENANCE: Remove old database table backups
	                     Keeps only the most recent backup versions for space management
	                     
	-echoAlso:          DISPLAY: Show generated data in console as well as files
	                    Useful for debugging and immediate data review
	                    
	-verbose:           DEBUGGING: Show detailed processing information including
	                    database operations, file paths, and transformation steps

<!frameworkHelpInfo!>

DATA FORMATS

	Excel (.xlsx):      Supports multi-sheet Excel files with named worksheets
	                    Automatically detects headers and data types
	                    
	CSV (.csv):         Standard comma-separated values with header support
	                    Handles various encoding formats (UTF-8, ASCII)

OPERATION MODES

	EXPORT MODE (Default):
	SQLite database → Excel/JSON files
	
	IMPORT MODE (With -loadDatabase):
	Excel/CSV → SQLite database → Excel/JSON files

COMMON OPERATIONS

	Database Export:
	spreadsheetTool                                             # Export default table to files
	spreadsheetTool /path/to/output                            # Export to specific directory
	spreadsheetTool --tableName=studentData /path/to/output    # Export specific table
	
	Spreadsheet Import:
	spreadsheetTool -loadDatabase student_data.xlsx            # Import Excel to database
	spreadsheetTool -loadDatabase data.csv --tableName=surveys # Import with custom table name
	
	File Exploration:
	spreadsheetTool -list workbook.xlsx                        # List all worksheets
	spreadsheetTool -loadDatabase workbook.xlsx --sheetName="Sheet2" # Import specific sheet
	
	Maintenance:
	spreadsheetTool -purgeBackupDbTables                       # Clean old backups

EXAMPLES

	Database Export (Default Operation):
	spreadsheetTool                                                # Export default table to files
	spreadsheetTool --tableName=cedsElements                      # Export CEDS elements to files  
	spreadsheetTool --tableName=myTable /tmp                      # Export myTable to /tmp directory
	
	File Import to Database:
	spreadsheetTool -loadDatabase "Student Data.xlsx"             # Import Excel, create studentData table
	spreadsheetTool -loadDatabase data.csv --tableName=surveys    # Import CSV with custom table name
	spreadsheetTool -loadDatabase /tmp/TESTTQ.csv --tableName=TESTTQ2  # Import CSV to specific table
	spreadsheetTool -loadDatabase data.csv --tableName=surveys /custom/output # Import with custom output directory
	
	File Exploration:
	spreadsheetTool -list "Multi Sheet Workbook.xlsx"             # Explore worksheet structure
	spreadsheetTool -loadDatabase workbook.xlsx --sheetName="Q1 Data" -echoAlso # Import specific sheet with console output
	
	Output Formats (automatically generates JSON, Excel, and CSV):
	spreadsheetTool --tableName=myData /tmp                       # Creates: /tmp/myData.json, /tmp/myData_generated.xlsx, /tmp/myData.csv

INTEGRATION WORKFLOW

	Typical Unity Object Generator data pipeline:
	1. unityDataGenerator: Generate synthetic educational data
	2. dbSqlUtil: Store/query data in SQLite database
	3. spreadsheetTool: Export database tables to Excel for analysis
	4. [External analysis in Excel]
	5. spreadsheetTool -loadDatabase: Import modified data back to database
	6. vectorTools: Create embeddings from updated data

============================================================
${errorMessage}
`;
};

	return ({mainHelp});
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction();