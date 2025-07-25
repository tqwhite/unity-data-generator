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

	Database SQL Utility - Direct SQL operations for Unity Object Generator database

DESCRIPTION

	dbSqlUtil [OPTIONS]
	
	Provides direct SQL execution capabilities for the Unity Object Generator SQLite
	database. Allows running individual SQL statements or batches of SQL commands
	for database maintenance, analysis, and administrative tasks.
	
	SQL EXECUTION MODES:
	Supports both single SQL statement execution and batch processing from files.
	Uses the project's SQLite database with proper connection management and
	error handling for safe database operations.
	
	DATABASE SAFETY:
	All operations use the project's standard SQLite abstraction layer for
	consistent database access. Provides transaction support and rollback
	capabilities for complex operations.

CONTROLS

	--sqlStatement:     DIRECT: Single SQL statement to execute immediately
	                    Supports SELECT, INSERT, UPDATE, DELETE, CREATE, DROP
	                    
	--sqlFile:          BATCH: Path to file containing SQL statements to execute
	                    Processes multiple statements sequentially with error handling
	                    
	--databasePath:     DATABASE: Custom database file path
	                    Overrides default Unity Object Generator database location
	                    
	--outputFile:       RESULTS: Path to save query results (for SELECT statements)
	                    Outputs in JSON format for programmatic processing

SWITCHES

	-executeList:       BATCH: Execute SQL statements from file or list
	                    Primary mode for running multiple SQL operations
	                    
	-showResults:       OUTPUT: Display query results in console
	                    Shows formatted output for SELECT statements and row counts
	                    
	-transactionMode:   SAFETY: Wrap all operations in a single transaction
	                    Allows rollback if any statement fails (recommended for batches)
	                    
	-confirmDestructive: SAFETY: Require confirmation for DELETE, DROP, UPDATE operations
	                    Interactive prompts for potentially dangerous operations
	                    
	-verbose:           DEBUGGING: Show detailed SQL execution information
	                    Displays executed statements, timing, and row counts

<!frameworkHelpInfo!>

SQL OPERATION TYPES

	SELECT Operations:  Query data from database tables
	                   Results displayed in console or saved to JSON file
	                   
	INSERT/UPDATE:     Modify existing data with full transaction support
	                  Automatic rollback on error when using -transactionMode
	                  
	CREATE/DROP:       DESTRUCTIVE: Database structure modifications
	                  Creates or removes tables, indexes, views
	                  
	Administrative:    Database maintenance operations like VACUUM, ANALYZE

SAFETY FEATURES

	Transaction Support:    All operations can be wrapped in transactions
	                       Automatic rollback on error prevents partial updates
	                       
	Confirmation Prompts:   Interactive verification for destructive operations
	                       Prevents accidental data loss
	                       
	Backup Integration:     Works with project's database backup systems
	                       Recommends backups before major operations

COMMON OPERATIONS

	Query Operations:
	dbSqlUtil --sqlStatement="SELECT * FROM naDataModel LIMIT 10" -showResults
	dbSqlUtil --sqlFile=analysis_queries.sql --outputFile=results.json
	
	Data Modification:
	dbSqlUtil --sqlStatement="UPDATE table SET field='value' WHERE id=1" -confirmDestructive
	dbSqlUtil --sqlFile=batch_updates.sql -transactionMode -verbose
	
	Database Maintenance:
	dbSqlUtil --sqlStatement="VACUUM" -verbose                    # Optimize database
	dbSqlUtil --sqlStatement="ANALYZE" -showResults               # Update statistics

EXAMPLES

	dbSqlUtil --sqlStatement="SELECT COUNT(*) FROM _CEDSElements" -showResults     # Quick count
	dbSqlUtil --sqlFile=maintenance.sql -transactionMode -verbose                 # Batch operations
	dbSqlUtil --sqlStatement="DROP TABLE temp_table" -confirmDestructive         # Safe deletion
	dbSqlUtil --sqlStatement="SELECT * FROM vectorTables" --outputFile=vectors.json # Export data

WARNING: DESTRUCTIVE OPERATIONS

	Always use -confirmDestructive with:
	- DROP TABLE/INDEX statements
	- DELETE operations without specific WHERE clauses  
	- UPDATE operations affecting multiple rows
	- Any statement that modifies database structure

============================================================
${errorMessage}
`;
};

	return ({mainHelp});
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction();