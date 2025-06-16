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

const commandLineParser = require('qtools-parse-command-line');
const commandLineParameters = commandLineParser.getParameters({
	applicationControls: [
		'-writeVectorDatabase',
		'-newDatabase',
		'-dropTable',
		'-showStats',
		'-rebuildDatabase',
		'--offset',
		'--limit',
		'--resultCount',
		'--targetTableName',
		'--dataProfile',
	],
});
const generateEmbeddings = require('./lib/generate-embeddings');
const getClosestRecords = require('./lib/get-closest-records');
const { initVectorDatabase } = require('./lib/init-vector-database');
const { dropAllVectorTables } = require('./lib/drop-all-vector-tables');
const { showDatabaseStats } = require('./lib/show-database-stats');

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
		const config = getConfig(moduleName); //moduleName is closure
		const { databaseFilePath, openAiApiKey, defaultTargetTableName } = config;
		
		// Get data profile configuration
		const dataProfile = commandLineParameters.values.dataProfile;
		
		if (!dataProfile) {
			xLog.error('--dataProfile parameter is required');
			xLog.error('Available profiles: sif, ceds');
			xLog.error('Example: vectorTools --dataProfile=sif --showStats');
			return {};
		}
		
		// Extract profile-specific settings from nested config object
		const profileSettings = config.dataProfiles?.[dataProfile];
		const sourceTableName = profileSettings?.sourceTableName;
		const sourcePrivateKeyName = profileSettings?.sourcePrivateKeyName;
		const sourceEmbeddableContentNameStr = profileSettings?.sourceEmbeddableContentName;
		const profileDefaultTargetTableName = profileSettings?.defaultTargetTableName;
		
		// Parse comma-separated embeddable content names
		const sourceEmbeddableContentName = sourceEmbeddableContentNameStr ? 
			sourceEmbeddableContentNameStr.split(',').map(s => s.trim()) : [];
		
		// Validate profile configuration
		if (!sourceTableName || !sourcePrivateKeyName || !sourceEmbeddableContentName.length) {
			xLog.error(`Invalid or missing configuration for data profile '${dataProfile}'`);
			xLog.error('Required settings: sourceTableName, sourcePrivateKeyName, sourceEmbeddableContentName');
			return {};
		}
		
		xLog.status(`Using data profile: ${dataProfile}`);
		xLog.status(`Source table: ${sourceTableName}`);
		xLog.status(`Source key: ${sourcePrivateKeyName}`);
		xLog.status(`Embeddable content: ${sourceEmbeddableContentName.join(', ')}`);

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

		// Use --targetTableName if provided, otherwise use profile default, then global default
		const vectorTableName =
			commandLineParameters.values.targetTableName || 
			profileDefaultTargetTableName || 
			defaultTargetTableName;

		if (commandLineParameters.values.targetTableName) {
			xLog.status(`Using custom target table: ${vectorTableName}`);
		} else {
			xLog.status(`Using default target table: ${vectorTableName}`);
		}

		const vectorDb = initVectorDatabase(
			databaseFilePath,
			vectorTableName,
			xLog,
		); // showVecVersion(db);

		// Show database stats if requested
		if (commandLineParameters.switches.showStats) {
			xLog.status('Showing database statistics...');
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

			// Pass the specific vector table name to ensure we only drop the specified profile's tables
			dropAllVectorTables(vectorDb, xLog, vectorTableName);

			// Show the empty state after dropping tables
			xLog.status('Database state after dropping tables:');
			showDatabaseStats(vectorDb, xLog);

			// Only exit if we're not also writing to the database
			if (!commandLineParameters.switches.writeVectorDatabase) {
				return {}; // Exit after dropping tables
			}
		}

		// Handle -rebuildDatabase - Complete rebuild workflow with backup and verification
		if (commandLineParameters.switches.rebuildDatabase) {
			const fs = require('fs');
			const path = require('path');
			const { execSync } = require('child_process');
			const readline = require('readline');
			
			const rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout
			});
			
			// Helper function to get table record count
			const getTableCount = (tableName) => {
				try {
					const countResult = vectorDb.prepare(`SELECT COUNT(*) as count FROM "${tableName}"`).get();
					return countResult.count;
				} catch (error) {
					return 0; // Table doesn't exist
				}
			};
			
			// Helper function to check if table exists
			const tableExists = (tableName) => {
				try {
					const result = vectorDb.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name = ?`).get(tableName);
					return !!result;
				} catch (error) {
					return false;
				}
			};
			
			// Helper function to prompt user using callback style
			const askUser = (question, callback) => {
				rl.question(question, (answer) => {
					callback(answer.toLowerCase().trim());
				});
			};
			
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
					xLog.error(`Backup script not found at ${backupScript}`);
					rl.close();
					return {};
				}
			} catch (error) {
				xLog.error(`Database backup failed: ${error.message}`);
				rl.close();
				return {};
			}
			
			// Check if source table exists first
			const sourceExists = tableExists(sourceTableName);
			if (!sourceExists) {
				xLog.error(`ERROR: Source table '${sourceTableName}' does not exist.`);
				xLog.error('Cannot proceed with rebuild.');
				rl.close();
				return {};
			}
			
			const sourceCount = getTableCount(sourceTableName);
			xLog.status(`Source table '${sourceTableName}' contains ${sourceCount} records.`);
			
			if (sourceCount === 0) {
				xLog.error(`ERROR: Source table '${sourceTableName}' is empty.`);
				xLog.error('Cannot proceed with rebuild.');
				rl.close();
				return {};
			}
			
			// Step 1: Create new vector database
			const newTableName = `${vectorTableName}_NEW`;
			xLog.status('');
			xLog.status('Step 1: Creating new vector database...');
			xLog.status('This may take several minutes...');
			
			try {
				// Generate embeddings for new table
				generateEmbeddings({
					openai,
					vectorDb,
				}).workingFunction({
					sourceTableName,
					vectorTableName: newTableName,
					sourcePrivateKeyName,
					sourceEmbeddableContentName,
				});
				
				xLog.status('Vector generation completed.');
			} catch (error) {
				xLog.error(`Vector database creation failed: ${error.message}`);
				rl.close();
				return {};
			}
			
			// Step 2: Verify new database
			xLog.status('');
			xLog.status('Step 2: Verifying new database...');
			
			const newCount = getTableCount(newTableName);
			const oldCount = getTableCount(vectorTableName);
			
			if (newCount === 0) {
				xLog.error('ERROR: New table appears to be empty. Aborting deployment.');
				rl.close();
				return {};
			}
			
			xLog.status(`New ${newTableName} contains ${newCount} records.`);
			
			if (oldCount > 0) {
				xLog.status(`Current ${vectorTableName} contains ${oldCount} records.`);
				
				// Basic sanity check
				if (newCount < Math.floor(oldCount / 2)) {
					xLog.status('WARNING: New table has significantly fewer records than old table.');
					xLog.status('This might indicate a problem with the rebuild process.');
				}
			}
			
			// Step 3: Ask for deployment confirmation
			xLog.status('');
			xLog.status('Step 3: Deploy new database?');
			xLog.status('This will:');
			xLog.status(`  1. Delete the existing '${vectorTableName}' table`);
			xLog.status(`  2. Rename '${newTableName}' to '${vectorTableName}'`);
			xLog.status('');
			
			askUser('Proceed with deployment? (y/N): ', (deployConfirm) => {
				if (deployConfirm !== 'y' && deployConfirm !== 'yes') {
					xLog.status('Deployment cancelled.');
					xLog.status(`New table '${newTableName}' remains available for manual inspection.`);
					rl.close();
					return;
				}
				
				// Step 4: Deploy new database
				xLog.status('');
				xLog.status('Step 4: Deploying new database...');
				
				try {
					// Drop existing table if it exists
					if (tableExists(vectorTableName)) {
						xLog.status(`Dropping existing ${vectorTableName} table...`);
						dropAllVectorTables(vectorDb, xLog, vectorTableName);
					}
					
					// Rename new table to original name by recreating
					xLog.status('Recreating table with original name...');
					
					// Copy data from NEW table to original table name
					// First, get the schema of the NEW table
					const schemaResult = vectorDb.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name = ?`).get(newTableName);
					
					if (!schemaResult) {
						throw new Error(`Could not find schema for ${newTableName}`);
					}
					
					// Create new table with original name using same schema
					const createSql = schemaResult.sql.replace(`"${newTableName}"`, `"${vectorTableName}"`);
					vectorDb.exec(createSql);
					
					// Copy all data from NEW table to original table
					const copyResult = vectorDb.exec(`INSERT INTO "${vectorTableName}" SELECT * FROM "${newTableName}"`);
					
					// Drop the NEW table
					xLog.status('Cleaning up temporary table...');
					dropAllVectorTables(vectorDb, xLog, newTableName);
					
				} catch (error) {
					xLog.error(`Deployment failed: ${error.message}`);
					xLog.error('Manual intervention may be required.');
					rl.close();
					return;
				}
				
				// Step 5: Final verification
				xLog.status('');
				xLog.status('Step 5: Final verification...');
				
				const finalCount = getTableCount(vectorTableName);
				
				if (finalCount > 0) {
					xLog.status(`✓ Deployment successful! ${vectorTableName} now contains ${finalCount} records.`);
				} else {
					xLog.status('⚠ WARNING: Could not verify final record count. Check table status manually.');
				}
				
				xLog.status('');
				xLog.status('=========================================');
				xLog.status(`${String(dataProfile).toUpperCase()} Vector Database Rebuild Complete`);
				xLog.status('=========================================');
				
				rl.close();
			}); // End of askUser callback
			return {};
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
				},
				commandLineParameters.values.queryString.qtLast(),
			);
		}

		return {};
	};

//END OF moduleFunction() ============================================================


module.exports = moduleFunction({ moduleName })({}); //runs it right now
//module.exports = moduleFunction({config, commandLineParameters, moduleName})();
