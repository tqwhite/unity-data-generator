'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = ({ moduleName } = {}) => ({ unused } = {}) => {
	const { xLog, getConfig, rawConfig, commandLineParameters, projectRoot } = process.global;
	const moduleConfig = getConfig(moduleName);

	const replaceExistingDatabase = async (config, openai, vectorDb, semanticAnalyzer, databaseOperations) => {
		const { xLog, commandLineParameters } = process.global;
		const qt = require('qtools-functional-library');
		const asynchronousPipePlus = require('qtools-asynchronous-pipe-plus')();
		const { pipeRunner, taskListPlus } = asynchronousPipePlus;
		
		// Use qtools for safe config access
		const {
			dataProfile,
			sourceTableName,
			vectorTableName: vectorTableNameRaw,
			sourcePrivateKeyName,
			sourceEmbeddableContentName
		} = config.qtSelectProperties([
			'dataProfile',
			'sourceTableName',
			'vectorTableName',
			'sourcePrivateKeyName',
			'sourceEmbeddableContentName'
		]);
		
		// Handle vectorTableName being an array (from command line params)
		const vectorTableName = Array.isArray(vectorTableNameRaw) ? vectorTableNameRaw[0] : vectorTableNameRaw;
		
		xLog.status(
			`Starting Complete Database Rebuild for ${dataProfile.toUpperCase()} profile...`,
		);
		

		
		// Single confirmation check
		const confirmRebuild = (args, next) => {
			// Check -yesAll flag using qtools safe path access
			if (commandLineParameters.qtGetSurePath('switches.yesAll', false)) {
				xLog.status('Auto-confirming rebuild (yesAll flag detected)');
				return next('', args);
			}
			
			const readline = require('readline');
			const rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout
			});
			
			try {
				const totalSourceCount = vectorDb.prepare(`SELECT COUNT(*) as count FROM ${sourceTableName}`).get().count;
				
				// Calculate actual records to be processed based on limit/offset
				const offset = parseInt(commandLineParameters.qtGetSurePath('values.offset[0]', '0'));
				const limit = commandLineParameters.qtGetSurePath('values.limit[0]', null);
				
				let recordsToProcess;
				let processingNote = '';
				if (limit) {
					const limitNum = parseInt(limit);
					recordsToProcess = Math.min(limitNum, Math.max(0, totalSourceCount - offset));
					processingNote = ` (limited by --limit=${limitNum} --offset=${offset})`;
				} else {
					recordsToProcess = Math.max(0, totalSourceCount - offset);
					if (offset > 0) {
						processingNote = ` (starting from offset ${offset})`;
					}
				}
				
				// Estimate time based on actual records to process (roughly 1 second per record for atomic mode)
				const estimatedMinutes = Math.max(1, Math.ceil(recordsToProcess / 60));
				const timeEstimate = estimatedMinutes < 2 ? 'less than 2 minutes' : `approximately ${estimatedMinutes} minutes`;
				
				// Check if vector table exists before querying it
				let vectorCount = 0;
				try {
					const tableExists = vectorDb.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name = ?`).get(vectorTableName);
					if (tableExists) {
						vectorCount = vectorDb.prepare(`SELECT COUNT(*) as count FROM ${vectorTableName}`).get().count;
					}
				} catch (vectorTableError) {
					// Vector table doesn't exist - that's okay, we'll show 0
					vectorCount = 0;
				}
				
				xLog.emphatic('⚠️  DESTRUCTIVE OPERATION WARNING ⚠️');
				xLog.status(`This will completely rebuild the vector database:`);
				xLog.status(`  • Data Profile: ${dataProfile.toUpperCase()}`);
				xLog.status(`  • Records to Process: ${recordsToProcess}${processingNote}`);
				xLog.status(`  • Total Source Records: ${totalSourceCount}`);
				xLog.status(`  • Current Vectors: ${vectorCount}`);
				xLog.status(`  • All existing vectors will be deleted and regenerated`);
				xLog.status(`  • Estimated Time: ${timeEstimate}`);
				
				rl.question('\nDo you want to continue? (yes/no): ', (answer) => {
					rl.close();
					if (answer.toLowerCase() === 'yes') {
						xLog.status('User confirmed rebuild operation');
						next('', args);
					} else {
						xLog.status('Operation cancelled by user');
						process.exit(0);
					}
				});
				
			} catch (error) {
				rl.close();
				xLog.error(`Failed to get database counts: ${error.message}`);
				next(error);
			}
		};
		
		// Drop vector tables task
		const dropVectorTables = (args, next) => {
			xLog.status('Dropping existing vector tables...');
			
			try {
				// Use the databaseOperations passed as parameter
				const dropResult = databaseOperations.dropTable();
				
				if (dropResult.qtGetSurePath('success', false)) {
					xLog.status(`✓ Dropped vector table: ${vectorTableName}`);
					next('', args.qtMerge({ dropCompleted: true }));
				} else {
					const error = new Error('Drop table operation failed');
					xLog.error(error.message);
					next(error);
				}
					
			} catch (error) {
				xLog.error(`Failed to initialize drop operation: ${error.message}`);
				next(error);
			}
		};
		
		// Generate vectors task
		const processFactsIntoDatabaseVectors = (args, next) => {
			xLog.status('Generating fresh vectors with updated atomic facts extractor...');
			
			try {
				const { createVectorDatabase } = require('../create-vector-database')({});
				const progressTracker = require('../progress-tracker')({});
				
				createVectorDatabase(progressTracker)(config, openai, vectorDb, semanticAnalyzer)
					.then((result) => {
						// Use qtools safe path access for result checking
						const success = result.qtGetSurePath('success', false);
						
						if (success) {
							xLog.status('✓ Vector generation completed successfully');
							next('', args.qtMerge({ 
								generationResult: result,
								generationCompleted: true 
							}));
						} else {
							const error = new Error('Vector generation failed - no success flag in result');
							xLog.error(error.message);
							next(error);
						}
					})
					.catch((error) => {
						xLog.error(`Vector generation failed: ${error.message}`);
						next(error);
					});
					
			} catch (error) {
				xLog.error(`Failed to initialize vector generation: ${error.message}`);
				next(error);
			}
		};
		
		// Report completion task
		const reportCompletion = (args, next) => {
			const completedAt = new Date().toISOString();
			const todayDate = completedAt.split('T')[0]; // YYYY-MM-DD format
			
			try {
				// Determine actual table name based on semantic analysis mode
				const semanticAnalysisMode = commandLineParameters.qtGetSurePath(
					'values.semanticAnalysisMode[0]',
					'simpleVector',
				);
				const actualVectorTableName = semanticAnalysisMode === 'atomicVector'
					? `${vectorTableName}_atomic`
					: vectorTableName;
				
				const vectorCount = vectorDb.prepare(`SELECT COUNT(*) as count FROM ${actualVectorTableName}`).get().count;
				
				xLog.emphatic(`✓ DATABASE REBUILD COMPLETED FOR ${dataProfile.toUpperCase()} PROFILE`);
				xLog.status(`✓ Generated ${vectorCount} vectors in table: ${actualVectorTableName}`);
				xLog.status(`✓ Completed at: ${completedAt}`);
				xLog.status('');
				xLog.status('To verify the new records:');
				xLog.status(`   SELECT COUNT(*) FROM ${actualVectorTableName} WHERE DATE(createdAt) = '${todayDate}';`);
				xLog.status(`   SELECT * FROM ${actualVectorTableName} WHERE DATE(createdAt) = '${todayDate}' LIMIT 5;`);
				
				// Create final result object
				const finalResult = {
					success: true,
					dataProfile,
					vectorsCreated: vectorCount,
					tableName: actualVectorTableName,
					completedAt
				};
				
				next('', args.qtMerge({ completionResult: finalResult }));
				
			} catch (error) {
				xLog.error(`Failed to generate completion report: ${error.message}`);
				next(error);
			}
		};
		
		// Execute pipeline
		return new Promise((resolve, reject) => {
			const taskList = new taskListPlus();
			
			taskList.push(confirmRebuild);
			taskList.push(dropVectorTables);
			taskList.push(processFactsIntoDatabaseVectors);
			taskList.push(reportCompletion);
			
			// Initial pipeline data - use qtools for safe initialization
			const initialArgs = {
				startTime: new Date().toISOString(),
				config: config.qtClone(),
				operation: 'rebuildDatabase'
			};
			
			pipeRunner(taskList.getList(), initialArgs, (err, finalArgs) => {
				// Handle qtools-asynchronous-pipe-plus 'skipRestOfPipe' convention
				const actualError = err === 'skipRestOfPipe' ? null : err;
				
				if (actualError) {
					xLog.error(`Database rebuild failed: ${actualError.message}`);
					xLog.status('The source data table remains intact.');
					reject(actualError);
				} else {
					xLog.emphatic('🎉 DATABASE REBUILD COMPLETED SUCCESSFULLY!');
					
					// Extract final result using qtools safe access
					const verificationResult = finalArgs.qtGetSurePath('verificationResult', {});
					const vectorCount = verificationResult.qtGetSurePath('vectorsCreated', 0);
					
					if (vectorCount > 0) {
						xLog.result(`Final vector count: ${vectorCount}`);
					}
					
					// Return clean result object
					resolve({
						success: true,
						...verificationResult
					});
				}
			});
		});
	};

	return { replaceExistingDatabase };
};

module.exports = moduleFunction({ moduleName }); //returns initialized moduleFunction