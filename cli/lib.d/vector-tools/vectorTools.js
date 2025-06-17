#!/usr/bin/env node
'use strict';

// Suppress punycode deprecation warning
process.noDeprecation = true;

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

const qt = require('qtools-functional-library'); //also exposes qtLog(); qt.help({printOutput:true, queryString:'.*', sendJson:false});

const os = require('os');
const path = require('path');
const fs = require('fs');

// --------------------------------------------------------------------------------
// FIND PROJECT ROOT
const findProjectRoot = ({ rootFolderName = 'system', closest = true } = {}) =>
	__dirname.replace(
		new RegExp(`^(.*${closest ? '' : '?'}\/${rootFolderName}).*$`),
		'$1',
	);
const applicationBasePath = findProjectRoot(); // call with {closest:false} if there are nested rootFolderName directories and you want the top level one

// Note: commandLineParameters will be set by qtools-ai-framework below
const generateEmbeddings = require('./lib/generate-embeddings');
const getClosestRecords = require('./lib/get-closest-records');
const { dropAllVectorTables, dropProductionVectorTables } = require('./lib/drop-all-vector-tables');
const { showDatabaseStats } = require('./lib/show-database-stats');
const { getProfileConfiguration, logConfigurationStatus } = require('./lib/vector-config-handler');
const { 
	initVectorDatabase, 
	getTableCount, 
	tableExists 
} = require('./lib/vector-database-operations');

// =============================================================================
// MODULE IMPORTS

//HACKERY: from some reason, putting require('generate-embeddings') AFTER this causes sqlite to screw up

// process.global.configPath=process.env.udgConfigPath; // unused, jina finds the config on its own, see node_modules/qtools-ai-thought-processor/...figure-out-config-path.js
const initAtp = require('../../../lib/qtools-ai-framework/jina')({
	configFileBaseName: moduleName,
	applicationBasePath,
	applicationControls: [
		'-writeVectorDatabase',
		'-newDatabase',
		'-dropTable',
		'-showStats',
		'-rebuildDatabase',
		'-verbose',
		'--queryString',
		'--offset',
		'--limit',
		'--resultCount',
		'--targetTableName',
		'--dataProfile',
	],
}); // SIDE EFFECTS: Initializes xLog and getConfig in process.global


//START OF moduleFunction() ============================================================
const moduleFunction =
	({ moduleName } = {}) =>
	({ unused }) => {
		const { xLog, getConfig, rawConfig, commandLineParameters } =
			process.global;
		
		// Get and validate configuration using the new config handler
		const config = getProfileConfiguration(moduleName);
		if (!config.isValid) {
			return {};
		}
		
		// Extract configuration values
		const {
			dataProfile,
			databaseFilePath,
			openAiApiKey,
			sourceTableName,
			sourcePrivateKeyName,
			sourceEmbeddableContentName,
			vectorTableName
		} = config;
		
		const initOpenAi = () => {
			const OpenAI = require('openai');
			const openai = new OpenAI({
				apiKey: openAiApiKey,
			});
			return openai;
		};

		// ================================================================================
		const openai = initOpenAi();

		// ================================================================================

		// Show configuration status messages
		logConfigurationStatus(config);

		// Initialize database with error handling
		let vectorDb;
		try {
			vectorDb = initVectorDatabase(
				databaseFilePath,
				vectorTableName,
				xLog,
			);
			xLog.verbose('Vector database initialized successfully');
		} catch (error) {
			xLog.error(`Failed to initialize vector database: ${error.message}`);
			xLog.error('Stack trace:', error.stack);
			return {};
		}

		// Show database stats if requested
		if (commandLineParameters.switches.showStats) {
			showDatabaseStats(vectorDb, xLog);
			return {}; // Exit after showing stats
		}


		// Handle -dropTable independently - SAFELY now only drops specified vector table
		if (commandLineParameters.switches.dropTable) {
			xLog.status(
				`Safely dropping ${dataProfile.toUpperCase()} vector table "${vectorTableName}" only...`,
			);
			xLog.status(
				`IMPORTANT: This will NOT affect other profile tables or database tables`,
			);


			try {
				// Use enhanced drop function with safety checks
				const dropResult = dropAllVectorTables(vectorDb, xLog, vectorTableName, { 
					skipConfirmation: true // CLI operation - user already confirmed with -dropTable
				});
				
				if (dropResult.success) {
					xLog.status(`Drop operation completed: ${dropResult.droppedCount} tables dropped`);
				} else {
					xLog.error(`Drop operation failed: ${dropResult.error}`);
					if (dropResult.errors && dropResult.errors.length > 0) {
						dropResult.errors.forEach(err => {
							xLog.error(`  - ${err.table}: ${err.error}`);
						});
					}
				}
			} catch (error) {
				xLog.error(`Failed to drop tables: ${error.message}`);
				xLog.error('Stack trace:', error.stack);
			}

			// Show the empty state after dropping tables
			try {
				xLog.status('Database state after dropping tables:');
				showDatabaseStats(vectorDb, xLog);
			} catch (error) {
				xLog.error(`Failed to show database stats: ${error.message}`);
			}

			// Only exit if we're not also writing to the database
			if (!commandLineParameters.switches.writeVectorDatabase) {
				return {}; // Exit after dropping tables
			}
		}




		const rebuildProcessActual = ({ mainConfigName }) => () => {
			const fs = require('fs');
			const path = require('path');
			const { execSync } = require('child_process');
			const readline = require('readline');
			
			const asynchronousPipePlus = require('qtools-asynchronous-pipe-plus')();
			const pipeRunner = asynchronousPipePlus.pipeRunner;
			const taskListPlus = asynchronousPipePlus.taskListPlus;
	
			// Database helper functions now come from vector-database-operations module
			
			// Helper function to prompt user using callback style
			const askUser = (question, callback) => {
				const rl = readline.createInterface({
					input: process.stdin,
					output: process.stdout
				});
				rl.question(question, (answer) => {
					rl.close();
					callback(answer.toLowerCase().trim());
				});
			};
			
			// Create tasklist for rebuild process
			const rebuildTaskList = new taskListPlus();
			
			// Task 1: Initialize and backup
			rebuildTaskList.push((args, next) => {
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
			});
			
			// Task 2: Generate embeddings
			rebuildTaskList.push((args, next) => {
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
			});
			
			// Task 3: Verify new database
			rebuildTaskList.push((args, next) => {
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
			});
			
			// Task 4: Ask for deployment confirmation
			rebuildTaskList.push((args, next) => {
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
			});
			
			// Task 5: Deploy new database
			rebuildTaskList.push((args, next) => {
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
			});
			
			// Task 6: Final verification
			rebuildTaskList.push((args, next) => {
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
			});
			
			// Run the rebuild pipeline
			pipeRunner(rebuildTaskList.getList(), {}, (err) => {
				if (err && err.message !== 'skipRestOfPipe') {
					xLog.error(`Rebuild failed: ${err.message}`);
				}
				// Always return to exit the rebuild section
			});
			
			return {}; // Exit after starting the rebuild pipeline
		};

		const rebuildProcess = rebuildProcessActual({ mainConfigName: 'vectorTools' });

		// Handle -rebuildDatabase - Complete rebuild workflow with backup and verification
		if (commandLineParameters.switches.rebuildDatabase) {
			rebuildProcess();
		}

		if (commandLineParameters.switches.writeVectorDatabase) {
			generateEmbeddings({
				openai,
				vectorDb,
			}).workingFunction({
				sourceTableName,
				vectorTableName,
				sourcePrivateKeyName,
				sourceEmbeddableContentName,
			});
		}

		if (commandLineParameters.values.queryString) {
			getClosestRecords({
				openai,
				vectorDb,
			}).workingFunction(
				{
					sourceTableName,
					vectorTableName,
					sourcePrivateKeyName,
					sourceEmbeddableContentName,
					dataProfile, // Pass the dataProfile for strategy selection
				},
				commandLineParameters.values.queryString.qtLast(),
			);
		}

		return {};
	};

//END OF moduleFunction() ============================================================


module.exports = moduleFunction({ moduleName })({}); //runs it right now
//module.exports = moduleFunction({config, commandLineParameters, moduleName})();
