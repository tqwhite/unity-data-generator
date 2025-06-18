#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const qt = require('qtools-functional-library');

const os = require('os');
const path = require('path');

// =====================================================================
// MODULE FUNCTION
// =====================================================================
// ---------------------------------------------------------------------
// moduleFunction - provides complete rebuild workflow functionality

const moduleFunction = function(
	{
		globalIdentifier = 'vector-rebuild-workflow',
		moduleName = globalIdentifier
	} = {}
) {
	return ({
		// Parameters will be passed when calling the workflow
	} = {}) => {
		
		// ---------------------------------------------------------------------
		// executeRebuildWorkflow - complete rebuild workflow with backup and verification
		
		const executeRebuildWorkflow = (config, vectorDb, openai, xLog, generateEmbeddings, dbOperations, dropOperations, commandLineParameters, callback) => {
			const fs = require('fs');
			const path = require('path');
			const { execSync } = require('child_process');
			const readline = require('readline');
			
			const asynchronousPipePlus = require('qtools-asynchronous-pipe-plus')();
			const pipeRunner = asynchronousPipePlus.pipeRunner;
			const taskListPlus = asynchronousPipePlus.taskListPlus;
			
			// Extract configuration values
			const { 
				dataProfile, 
				sourceTableName, 
				sourcePrivateKeyName, 
				sourceEmbeddableContentName, 
				vectorTableName 
			} = config;
			
			// Extract database operations
			const { tableExists, getTableCount } = dbOperations;
			
			// Extract drop operations
			const { dropProductionVectorTables, dropAllVectorTables } = dropOperations;
	
			// ---------------------------------------------------------------------
			// askUser - prompts user for input using callback style
			
			const askUser = (question, callback) => {
				// Check for -yesAll flag to automatically answer "yes"
				if (commandLineParameters.switches.yesAll) {
					xLog.status(question + ' [AUTO: yes]');
					return callback('yes');
				}
				
				const rl = readline.createInterface({
					input: process.stdin,
					output: process.stdout
				});
				rl.question(question, (answer) => {
					rl.close();
					callback(answer.toLowerCase().trim());
				});
			};
			
			// ---------------------------------------------------------------------
			// performDatabaseBackup - performs database backup and source validation
			
			const performDatabaseBackup = (args, next) => {
				xLog.status('=========================================');
				xLog.status(`${String(dataProfile).toUpperCase()} Vector Database Rebuild`);
				xLog.status('=========================================');
				
				// Step 0: Backup database
				xLog.status('Step 0: Backing up database...');
				const backupScript = '/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/configs/instanceSpecific/qbook/terminalAndOperation/backupDb';
				
				try {
					if (fs.existsSync(backupScript)) {
						execSync(backupScript, { stdio: 'inherit' });
						xLog.status('Database backup completed successfully.');
					} else {
						return next(new Error(`Backup script not found at ${backupScript}`));
					}
				} catch (error) {
					return next(new Error(`Database backup failed: ${error.message}`));
				}
				
				// Check if source table exists first
				const sourceExists = tableExists(vectorDb, sourceTableName);
				if (!sourceExists) {
					return next(new Error(`Source table '${sourceTableName}' does not exist.`));
				}
				
				const sourceCount = getTableCount(vectorDb, sourceTableName);
				xLog.status(`Source table '${sourceTableName}' contains ${sourceCount} records.`);
				
				if (sourceCount === 0) {
					return next(new Error(`Source table '${sourceTableName}' is empty.`));
				}
				
				const result = {
					sourceCount: sourceCount,
					newTableName: `${vectorTableName}_NEW`
				};
				next(null, result);
			};
			
			// ---------------------------------------------------------------------
			// generateVectorEmbeddings - generates vector embeddings for new table
			
			const generateVectorEmbeddings = (args, next) => {
				xLog.status('');
				xLog.status('Step 1: Creating new vector database...');
				xLog.status('This may take several minutes...');
				
				// Convert the async workingFunction to callback style
				const embeddingPromise = generateEmbeddings({
					openai,
					vectorDb,
				}).workingFunction({
					sourceTableName,
					vectorTableName: args.newTableName,
					sourcePrivateKeyName,
					sourceEmbeddableContentName,
				});
				
				embeddingPromise
					.then(() => {
						xLog.status('Vector generation completed.');
						next(null, args); // Pass args through to next task
					})
					.catch((error) => {
						next(new Error(`Vector database creation failed: ${error.message}`));
					});
			};
			
			// ---------------------------------------------------------------------
			// verifyNewDatabase - verifies new database with count comparison
			
			const verifyNewDatabase = (args, next) => {
				xLog.status('');
				xLog.status('Step 2: Verifying new database...');
				
				const newCount = getTableCount(vectorDb, args.newTableName);
				const oldCount = getTableCount(vectorDb, vectorTableName);
				
				if (newCount === 0) {
					return next(new Error('New table appears to be empty. Aborting deployment.'));
				}
				
				xLog.status(`New ${args.newTableName} contains ${newCount} records.`);
				
				if (oldCount > 0) {
					xLog.status(`Current ${vectorTableName} contains ${oldCount} records.`);
					
					// Basic sanity check
					if (newCount < Math.floor(oldCount / 2)) {
						xLog.status('WARNING: New table has significantly fewer records than old table.');
						xLog.status('This might indicate a problem with the rebuild process.');
					}
				}
				
				const result = {
					...args,
					newCount: newCount,
					oldCount: oldCount
				};
				next(null, result);
			};
			
			// ---------------------------------------------------------------------
			// confirmDeployment - prompts user for deployment confirmation
			
			const confirmDeployment = (args, next) => {
				xLog.status('');
				xLog.status('Step 3: Deploy new database?');
				xLog.status('This will:');
				xLog.status(`  1. Delete the existing '${vectorTableName}' table`);
				xLog.status(`  2. Rename '${args.newTableName}' to '${vectorTableName}'`);
				xLog.status('');
				
				askUser('Proceed with deployment? (y/N): ', (deployConfirm) => {
					if (deployConfirm !== 'y' && deployConfirm !== 'yes') {
						xLog.status('Deployment cancelled.');
						xLog.status(`New table '${args.newTableName}' remains available for manual inspection.`);
						return next(new Error('skipRestOfPipe')); // Use special error to skip remaining tasks
					}
					const result = {
						...args,
						deployConfirmed: true
					};
					next(null, result);
				});
			};
			
			// ---------------------------------------------------------------------
			// deployNewDatabase - deploys new database with table copying
			
			const deployNewDatabase = (args, next) => {
				xLog.status('');
				xLog.status('Step 4: Deploying new database...');
				
				try {
					// Drop existing production table if it exists (but preserve NEW table)
					if (tableExists(vectorDb, vectorTableName)) {
						xLog.status(`Dropping existing ${vectorTableName} table (preserving NEW table)...`);
						
						const dropResult = dropProductionVectorTables(vectorDb, xLog, vectorTableName, {
							skipConfirmation: true // Internal rebuild operation
						});
						
						if (!dropResult.success) {
							const errorMsg = dropResult.error || 'Unknown error during table drop operation';
							throw new Error(`Failed to drop production tables: ${errorMsg}`);
						}
						
						xLog.status(`Successfully dropped ${dropResult.droppedCount} production tables`);
					}
					
					// Since sqlite-vec tables can't be renamed directly, we need to:
					// 1. Create the production table with the same schema as the NEW table
					// 2. Copy all data from NEW to production
					// 3. Drop the NEW table
					
					xLog.status('Creating production table with same schema...');
					
					// Create the production table using the same schema as the NEW table
					vectorDb.exec(`CREATE VIRTUAL TABLE ${vectorTableName} USING vec0(embedding float[1536])`);
					
					xLog.status('Copying data from temporary table to production table...');
					
					// Copy all data from NEW table to production table
					vectorDb.exec(`INSERT INTO "${vectorTableName}" SELECT * FROM "${args.newTableName}"`);
					
					// Drop the NEW table and all its related tables
					xLog.status('Cleaning up temporary table...');
					const cleanupResult = dropAllVectorTables(vectorDb, xLog, args.newTableName, { 
						skipConfirmation: true // Internal cleanup - no confirmation needed
					});
					
					if (!cleanupResult.success) {
						xLog.status(`Warning: Cleanup had issues: ${cleanupResult.error}`);
					}
					
					next(null, args);
				} catch (error) {
					next(new Error(`Deployment failed: ${error.message}`));
				}
			};
			
			// ---------------------------------------------------------------------
			// performFinalVerification - performs final verification and completion
			
			const performFinalVerification = (args, next) => {
				xLog.status('');
				xLog.status('Step 5: Final verification...');
				
				const finalCount = getTableCount(vectorDb, vectorTableName);
				
				if (finalCount > 0) {
					xLog.status(`✓ Deployment successful! ${vectorTableName} now contains ${finalCount} records.`);
				} else {
					xLog.status('⚠ WARNING: Could not verify final record count. Check table status manually.');
				}
				
				xLog.status('');
				xLog.status('=========================================');
				xLog.status(`${String(dataProfile).toUpperCase()} Vector Database Rebuild Complete`);
				xLog.status('=========================================');
				
				next(null, args);
			};
			
			// ---------------------------------------------------------------------
			// 3. Workflow execution pipeline
			
			// Create tasklist for rebuild process
			const rebuildTaskList = new taskListPlus();
			
			// Task 1: Initialize and backup
			rebuildTaskList.push(performDatabaseBackup);
			
			// Task 2: Generate embeddings
			rebuildTaskList.push(generateVectorEmbeddings);
			
			// Task 3: Verify new database
			rebuildTaskList.push(verifyNewDatabase);
			
			// Task 4: Ask for deployment confirmation
			rebuildTaskList.push(confirmDeployment);
			
			// Task 5: Deploy new database
			rebuildTaskList.push(deployNewDatabase);
			
			// Task 6: Final verification
			rebuildTaskList.push(performFinalVerification);
			
			// Run the rebuild pipeline
			pipeRunner(rebuildTaskList.getList(), {}, (err) => {
				if (err && err.message !== 'skipRestOfPipe') {
					xLog.error(`Rebuild failed: ${err.message}`);
					return callback(err);
				}
				callback(null); // Success
			});
		};

		return { executeRebuildWorkflow };
	};
};

// =====================================================================
// MODULE EXPORTS
// =====================================================================

module.exports = moduleFunction;