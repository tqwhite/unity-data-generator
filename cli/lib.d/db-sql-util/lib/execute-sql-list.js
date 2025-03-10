#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

const os = require('os');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const parseSqlString = require('./parse-sql-string');

//START OF moduleFunction() ============================================================
const moduleFunction =
	({ moduleName } = {}) =>
	({ sqlStatementFilePath } = {}) => {
		const { xLog, getConfig, rawConfig, commandLineParameters } =
			process.global;
		const config = getConfig(moduleName) || {}; //moduleName is closure
		
		// Read SQL file
		let sqlContent;
		try {
			sqlContent = fs.readFileSync(sqlStatementFilePath, 'utf8');
			xLog.status(`Successfully read SQL file: ${sqlStatementFilePath}`);
		} catch (error) {
			xLog.error(`Error reading SQL file: ${error.message}`);
			process.exit(1);
		}
		
		// Get database path
		const workingDatabasePath = commandLineParameters.values.databasePath
			? commandLineParameters.values.databasePath.qtFirst()
			: config.databaseFilePath;

		if (!workingDatabasePath) {
			xLog.error('No database path specified in config or command line');
			process.exit(1);
		}
		
		xLog.status(`Using database: ${workingDatabasePath}`);
		
		// Check if the database file exists and is accessible
		try {
			if (!fs.existsSync(workingDatabasePath)) {
				xLog.warn(
					`Database file does not exist at ${workingDatabasePath}. A new one will be created.`,
				);
			}
		} catch (error) {
			xLog.error(`Error checking database file: ${error.message}`);
			process.exit(1);
		}
		
		// Connect to the database
		let db;
		try {
			db = new Database(workingDatabasePath, {
				verbose: commandLineParameters.switches.debug ? console.log : null,
			});
			xLog.status('Database connection established');
		} catch (error) {
			xLog.error(`Failed to connect to database: ${error.message}`);
			process.exit(1);
		}

		// Use the parseSqlString module to parse SQL content into statements
		const validSqlStatements = parseSqlString(sqlContent);
		
		xLog.status(`Found ${validSqlStatements.length} SQL statements to execute after preprocessing`);
		
		if (commandLineParameters.switches.debug) {
			if (validSqlStatements.length > 0) {
				xLog.debug(`First statement: ${validSqlStatements[0].substring(0, 100)}...`);
				xLog.debug(`Last statement: ${validSqlStatements[validSqlStatements.length - 1].substring(0, 100)}...`);
			} else {
				xLog.debug('No valid SQL statements found');
			}
		}
		
		// Execute the statements in batches
		const results = [];
		const errors = [];
		const errorLogs = [];
		const BATCH_SIZE = 100; // Process 5000 statements at a time
		
		// xLog.processLogDir is set up in the parent directory. It need not be done here.
		
		// Determine which SQL file is being processed for logging
		let sqlFileName = "unknownSQL";
		if (commandLineParameters.switches.CEDS_Elements) {
			sqlFileName = "CEDS_Elements";
		} else if (commandLineParameters.switches.CEDS_IDS) {
			sqlFileName = "CEDS_IDS";
		}
		
		// Get skip parameter if provided
		const skipCount = commandLineParameters.values.skip
			? parseInt(commandLineParameters.values.skip.qtFirst(), 10)
			: 0;
			
		if (skipCount > 0) {
			xLog.status(`Skipping the first ${skipCount} statements as requested`);
		}
		
		// Determine total batches
		const totalBatches = Math.ceil((validSqlStatements.length - skipCount) / BATCH_SIZE);
		xLog.status(`Processing ${validSqlStatements.length - skipCount} statements in ${totalBatches} batches of ${BATCH_SIZE}`);
		
		// Process in batches
		let currentBatch = 1;
		let processedCount = 0;
		let startIndex = skipCount;
		
		try {
			while (startIndex < validSqlStatements.length) {
				const endIndex = Math.min(startIndex + BATCH_SIZE, validSqlStatements.length);
				const batchStatements = validSqlStatements.slice(startIndex, endIndex);
				
				xLog.status(`\nBatch ${currentBatch}/${totalBatches}: Processing statements ${startIndex + 1} to ${endIndex}`);
				
				// Execute batch in a transaction
				try {
					db.exec('PRAGMA foreign_keys = OFF;');
					//db.exec('BEGIN TRANSACTION;');
					
					// Clear batch error logs
					errorLogs.length = 0;
					
					batchStatements.forEach((sql, batchIndex) => {
						const globalIndex = startIndex + batchIndex;
						try {
							if (!commandLineParameters.switches.silent) {
								if (batchIndex % 100 === 0 || batchIndex === batchStatements.length - 1) {
									xLog.status(`Processing statement ${globalIndex + 1}/${validSqlStatements.length}`);
								}
							}
							
							// In debug mode, we'll only log SQL that causes errors
							// SQL statements will be logged in the catch block for errors
							
							const result = db.exec(sql);
							results.push({ index: globalIndex, success: true });
						} catch (error) {
							const errorMessage = `Error in statement #${globalIndex + 1}: ${error.message}`;
							const errorEntry = { 
								index: globalIndex, 
								statement: sql.substring(0, 500) + (sql.length > 500 ? '...' : ''),
								error: error.message 
							};
							
							errors.push(errorEntry);
							// Only log SQL statements that cause errors
							errorLogs.push(`--- Statement #${globalIndex + 1} ---\n${sql}\n\nError: ${error.message}\n\n`);
							
							if (!commandLineParameters.switches.silent) {
								xLog.error(`\n=-=============   ERROR IN SQL STATEMENT #${globalIndex + 1}  ========================= [execute-sql-list.js.]\n`);
								xLog.error(`${sql}`);
								xLog.error(`\n=-=--------------------------------------------------- [execute-sql-list.js.]\n`);
								xLog.error(`ERROR: ${error.message}`);
								console.log(`\n=-=============   End ERROR SQL  ========================= [execute-sql-list.js.]\n`);
if (!error.message.match(/.* values for .* columns/) && !(error.message.match(/unrecognized token/) && sql.match(/ INTO CEDS_Term /))){
console.log(' Debug Exit [execute-sql-list.js.]', {depth:4, colors:true}); process.exit(); //tqDebug
}

							}
						}
					});
					
					if (errors.length === 0) {
						//db.exec('COMMIT;');
						xLog.status(`Batch ${currentBatch} committed successfully`);
						
						// Print restart information
						const nextStartIndex = endIndex;
						if (nextStartIndex < validSqlStatements.length) {
							xLog.status(`\n=============================================`);
							xLog.status(`RESTART INFO: To continue from the next batch, use:`);
							xLog.status(`--skip=${nextStartIndex}`);
							xLog.status(`=============================================\n`);
						}
					} else {
						//db.exec('ROLLBACK;');
						xLog.error(`Batch ${currentBatch} rolled back due to ${errors.length} errors`);
						
						// Write error log for this batch - only if there are errors
						if (errorLogs.length > 0) {
							const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
							const logFileName = `${sqlFileName}_batch${currentBatch}_errors_${timestamp}.log`;
							xLog.saveProcessFile(logFileName, errorLogs.join('\n'));
							xLog.status(`Error details saved to logs/${logFileName}`);
						}
						
						// Stop processing if there are errors
						//break;
					}
				} catch (error) {
					//db.exec('ROLLBACK;');
					xLog.error(`Batch ${currentBatch} transaction failed: ${error.message}`);
					//break;
				}
				
				processedCount += batchStatements.length;
				startIndex = endIndex;
				currentBatch++;
			}
		} finally {
			db.close();
			xLog.status('Database connection closed');
			
			// Write a summary of all errors to a log file if there were any
			if (errors.length > 0) {
				const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
				const summaryFileName = `${sqlFileName}_errors_summary_${timestamp}.json`;
				xLog.saveProcessFile(summaryFileName, errors, { saveAsJson: true });
				xLog.status(`Error summary saved to logs/${summaryFileName}`);
			}
		}
		
		const summary = {
			total: validSqlStatements.length,
			processed: processedCount,
			skipped: skipCount,
			successful: results.length,
			errors: errors.length,
			errorDetails: errors.length > 0 ? `See logs directory for detailed error reports` : null,
			nextSkip: startIndex < validSqlStatements.length ? startIndex : null
		};
		
		xLog.status(
			`\nSQL Execution Summary: ${summary.successful}/${summary.processed} processed statements executed successfully (${summary.skipped} skipped)`
		);
		
		if (summary.errors > 0) {
			xLog.error(
				`\nFound ${summary.errors} errors. Error details have been saved to the logs directory:\n${xLog.getProcessFilesDirectory()}.`
			);
		}
		
		if (summary.nextSkip !== null) {
			xLog.status(`To continue from where processing stopped, use: --skip=${summary.nextSkip}\n`);
		}
		
		return summary;
	};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction({ moduleName }); //returns initialized moduleFunction