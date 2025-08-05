'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction =
	({ moduleName } = {}) =>
	({ unused } = {}) => {
		const { xLog, getConfig, rawConfig, commandLineParameters, projectRoot } =
			process.global;
		const moduleConfig = getConfig(moduleName);

		// Validation function for resume batch operations
		const validateAndPrepareBatch = (
			values,
			progressTracker,
			vectorDb,
			config,
		) => {
			let batchToResume;

			if (values.batchId && values.batchId[0]) {
				batchToResume = progressTracker.getBatchProgress(
					vectorDb,
					values.batchId[0],
				);
				if (!batchToResume) {
					xLog.error(`Batch not found: ${values.batchId[0]} [${moduleName}]`);
					process.exit(1);
				}
			} else {
				const incompleteBatches = progressTracker.getIncompleteBatches(
					vectorDb,
					config.dataProfile,
				);
				if (incompleteBatches.length === 0) {
					xLog.status(
						`No incomplete batches found for ${config.dataProfile} profile`,
					);
					return null; // Signal that there's nothing to resume, but it's not an error
				}
				batchToResume = incompleteBatches[0];
			}

			xLog.status(`Resuming batch: ${batchToResume.batch_id}`);
			xLog.status(
				`Progress: ${batchToResume.processed_records}/${batchToResume.total_records} records`,
			);

			return batchToResume;
		};

		// Helper function for vector generation
		const createVectorDatabase =
			(progressTracker) =>
			async (
				config,
				openai,
				vectorDb,
				semanticAnalyzer,
				resumeBatch = null,
			) => {
				const {
					dataProfile,
					sourceTableName,
					vectorTableName,
					sourcePrivateKeyName,
					sourceEmbeddableContentName,
				} = config;

				// Validate and prepare batch for resume operations if no resumeBatch provided
				if (resumeBatch === null && commandLineParameters.switches.resume) {
					const validatedBatch = validateAndPrepareBatch(
						commandLineParameters.values,
						progressTracker,
						vectorDb,
						config,
					);

					// If no batches to resume, exit gracefully
					if (validatedBatch === null) {
						return { success: true, shouldExit: true };
					}

					resumeBatch = validatedBatch;
				}

				// Determine actual table name and semantic mode
				const semanticAnalysisMode = commandLineParameters.qtGetSurePath(
					'values.semanticAnalysisMode[0]',
					'simpleVector',
				);
				const actualTableName =
					semanticAnalysisMode === 'atomicVector'
						? `${vectorTableName}_atomic`
						: vectorTableName;

				// Log generation parameters
				const generationParams = {
					dataProfile,
					sourceTableName,
					vectorTableName,
					actualTableName,
					semanticAnalysisMode,
					sourcePrivateKeyName,
					sourceEmbeddableContentName,
					resumeMode: !!resumeBatch,
					batchId: resumeBatch?.batch_id || 'new'
				};
				
				xLog.saveProcessFile(`${moduleName}_promptList.log`, `Vector Generation Parameters:\n${JSON.stringify(generationParams, null, 2)}`, {append:true});

				try {
					let sourceRowList,
						batchId,
						processedKeys = [];

					if (resumeBatch) {
						// Resume mode - get unprocessed records
						batchId = resumeBatch.batch_id;
						processedKeys = progressTracker.getProcessedKeys(vectorDb, batchId);

						xLog.status(
							`Starting Resuming Vector Database Generation for ${dataProfile.toUpperCase()} profile...`,
						);
						if (actualTableName) {
							xLog.status(`Target table: "${actualTableName}"`);
						}
						xLog.status(`Resuming batch: ${batchId}`);
						xLog.status(`Already processed: ${processedKeys.length} records`);

						// Get remaining records to process
						const allRecords = vectorDb
							.prepare(`SELECT * FROM ${sourceTableName}`)
							.all();
						sourceRowList = allRecords.filter((record) => {
							const keyValue = record[sourcePrivateKeyName];
							return !processedKeys.includes(keyValue.toString());
						});

						xLog.status(
							`Remaining to process: ${sourceRowList.length} records`,
						);
					} else {
						// New batch mode - get records based on limit/offset
						xLog.status(
							`Starting Vector Database Generation for ${dataProfile.toUpperCase()} profile...`,
						);
						if (actualTableName) {
							xLog.status(`Target table: "${actualTableName}"`);
						}

						const limit = commandLineParameters.values.limit
							? parseInt(commandLineParameters.values.limit[0], 10)
							: null;
						const offset = commandLineParameters.values.offset
							? parseInt(commandLineParameters.values.offset[0], 10)
							: 0;

						// Build SQL query with limit and offset
						let sql = `SELECT * FROM ${sourceTableName}`;
						const params = [];

						if (limit !== null) {
							sql += ` LIMIT ? OFFSET ?`;
							params.push(limit, offset);
						} else if (offset > 0) {
							sql += ` OFFSET ?`;
							params.push(offset);
						}

						// Get source data for processing
						sourceRowList = vectorDb.prepare(sql).all(...params);

						// Create new progress batch
						batchId = progressTracker.createBatch(
							vectorDb,
							config,
							semanticAnalysisMode,
							sourceRowList.length,
							{
								limit,
								offset,
								command: 'writeVectorDatabase',
								semanticAnalysisMode,
							},
						);
					}

					xLog.status(
						`Processing ${sourceRowList.length} records from ${sourceTableName}${resumeBatch ? ' (RESUME)' : ''}`,
					);

					// Generate vectors with progress tracking
					await semanticAnalyzer.generateVectors({
						sourceRowList,
						sourceEmbeddableContentName,
						sourcePrivateKeyName,
						openai,
						vectorDb,
						tableName: vectorTableName,
						dataProfile,
						// Progress tracking parameters
						batchId,
						progressTracker,
						alreadyProcessedCount: processedKeys.length,
					});

					// Mark batch as completed
					progressTracker.completeBatch(vectorDb, batchId);

					// Log completion results
					const completionResult = {
						success: true,
						batchId,
						totalRecords: sourceRowList.length,
						semanticAnalysisMode,
						actualTableName,
						dataProfile
					};
					
					xLog.saveProcessFile(`${moduleName}_responseList.log`, `Vector Generation Completed:\n${JSON.stringify(completionResult, null, 2)}`, {append:true});

					return { success: true, shouldExit: true };
				} catch (error) {
					xLog.error(`Vector database generation failed: ${error.message}`);
					return { success: false, shouldExit: true };
				}
			};

		return { createVectorDatabase };
	};

module.exports = moduleFunction({ moduleName }); //returns initialized moduleFunction
