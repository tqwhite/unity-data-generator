#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const qt = require('qtools-functional-library');

//START OF moduleFunction() ============================================================

const moduleFunction = function (args = {}) {
	const { xLog, getConfig } = process.global;
	const { thinkerParameters={}, promptGenerator } = args; // Extract from args with default
	const localThinkerParameters = thinkerParameters.qtGetSurePath(moduleName, {});
	const allThinkersParameters = thinkerParameters.qtGetSurePath('allThinkers', {});
	
	// Priority: localThinkerParameters > allThinkersParameters > configFromSection
	const configFromSection = getConfig(moduleName);
	const finalConfig = { ...configFromSection, ...allThinkersParameters, ...localThinkerParameters };
	
	xLog.verbose(`Thinker Parameters (${moduleName})\n    `+Object.keys(finalConfig).map(name=>`${name}=${finalConfig[name]}`).join('\n    '));
	const { thinkerSpec, smartyPants } = args;

	// ================================================================================
	// UTILITIES

	const formulatePromptList =
		(promptGenerator) =>
		({ latestWisdom } = {}) => {
			return promptGenerator.iterativeGeneratorPrompt({
				...latestWisdom,
				employerModuleName: moduleName,
			});
		};

	// ================================================================================
	// SQLITE-INSTANCE OPERATIONS (SKELETON - Mock for now)

	const saveVectorToDatabase = (args, callback) => {
		const { vectorData, tableName } = args;
		
		xLog.verbose(`${moduleName}: Would save ${vectorData.length} vector records to ${tableName}`);
		
		// SKELETON: Mock database save
		vectorData.forEach((record, index) => {
			xLog.debug(`${moduleName}: Would save record ${index}: ${record.refId} (${record.factType || 'simple'})`);
		});

		// Simulate async database operation
		setTimeout(() => {
			const mockResult = {
				recordsSaved: vectorData.length,
				tableName: tableName,
				success: true
			};
			callback('', mockResult);
		}, 100);
	};

	// ================================================================================
	// DO THE JOB

	const executeRequest = (args, callback) => {
		const { wisdomBus, latestWisdom } = args;

		if (!wisdomBus && !latestWisdom) {
			return callback(new Error(`${moduleName}: wisdom-bus or latestWisdom is required`));
		}

		try {
			// Determine if we're saving simple or atomic embeddings
			// Try wisdomBus accessor first, then fallback to latestWisdom object
			let simpleEmbedding, embeddingRecords, sourceRefId;
			
			if (wisdomBus && typeof wisdomBus.qtGetSurePath === 'function') {
				simpleEmbedding = wisdomBus.qtGetSurePath('simpleEmbedding');
				embeddingRecords = wisdomBus.qtGetSurePath('atomicEmbeddings') || wisdomBus.qtGetSurePath('embeddingRecords');
				sourceRefId = wisdomBus.qtGetSurePath('sourceRefId');
			} else if (latestWisdom) {
				simpleEmbedding = latestWisdom.simpleEmbedding;
				embeddingRecords = latestWisdom.atomicEmbeddings || latestWisdom.embeddingRecords;
				sourceRefId = latestWisdom.sourceRefId;
			}

			// Log the input/prompt details
			const promptData = {
				operation: 'save-vector-data',
				sourceRefId,
				simpleEmbedding: !!simpleEmbedding,
				embeddingRecords: embeddingRecords ? embeddingRecords.length : 0,
				wisdomBus_keys: Object.keys(wisdomBus),
				timestamp: new Date().toISOString()
			};

			xLog.saveProcessFile(
				`${moduleName}_promptList.log`,
				`\n\n\n${moduleName}---------------------------------------------------\nDatabase Save Operation:\nOperation: Save vector embeddings to database\nSource Element: ${sourceRefId}\nEmbedding Type: ${simpleEmbedding ? 'Simple' : 'Atomic'}\nRecord Count: ${embeddingRecords ? embeddingRecords.length : (simpleEmbedding ? 1 : 0)}\n----------------------------------------------------\n\n`,
				{ append: true },
			);

			xLog.verbose(`${moduleName}: Processing vector data save for ${sourceRefId}`);

			// Get prompts from prompt library (though save operations may not need prompts)
			if (!promptGenerator) {
				return callback(new Error(`${moduleName}: promptGenerator not provided via dependency injection`));
			}

			const prompts = promptGenerator.getPrompts('saveVectorData');
			if (prompts) {
				xLog.verbose(`${moduleName}: Got prompts from prompt library`);
			}

			let vectorDataToSave = [];
			let tableName = '';

			// Handle simple embedding save
			if (simpleEmbedding && !embeddingRecords) {
				const currentElement = wisdomBus.qtGetSurePath('currentElement');
				const embeddingModel = wisdomBus.qtGetSurePath('embeddingModel');
				const embeddableContent = wisdomBus.qtGetSurePath('embeddableContent');

				vectorDataToSave = [{
					refId: sourceRefId,
					sourceRefId: sourceRefId,
					factType: 'simple',
					factText: embeddableContent,
					embedding: simpleEmbedding,
					semanticCategory: null,
					conceptualDimension: null,
					factIndex: 0,
					model: embeddingModel
				}];
				tableName = 'simpleVectors';
			}
			// Handle atomic embeddings save
			else if (embeddingRecords && Array.isArray(embeddingRecords)) {
				vectorDataToSave = embeddingRecords;
				tableName = 'atomicVectors';
			}
			else {
				return callback(new Error(`${moduleName}: No vector data found to save (neither simpleEmbedding nor embeddingRecords)`));
			}

			// Save to database (mock for skeleton)
			saveVectorToDatabase({ vectorData: vectorDataToSave, tableName }, (err, result) => {
				if (err) {
					return callback(err);
				}

				xLog.verbose(`${moduleName}: Saved ${result.recordsSaved} vector records to ${result.tableName}`);

				// Create wisdom object for migration helper
				const wisdom = {
					vectorSaveResult: result,
					recordsSaved: result.recordsSaved,
					vectorTableName: result.tableName,
					saveOperation: 'completed'
				};

				// Log the response details
				const responseData = {
					operation: 'save-vector-data',
					sourceRefId: sourceRefId,
					result,
					wisdom,
					processing_info: {
						status: 'framework_thinker',
						records_saved: result.recordsSaved,
						table_name: result.tableName,
						timestamp: new Date().toISOString()
					}
				};

				xLog.saveProcessFile(
					`${moduleName}_responseList.log`,
					`\n\n\n${moduleName}---------------------------------------------------\nSave Vector Data Response:\n${JSON.stringify(responseData, null, 2)}\n----------------------------------------------------\n\n`,
					{ append: true },
				);

				callback(null, {
					wisdom,
					message: `Saved ${result.recordsSaved} vector records to ${result.tableName}`
				});
			});

		} catch (error) {
			xLog.error(`${moduleName}: Error saving vector data: ${error.message}`);
			callback(error);
		}
	};

	return { executeRequest };
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;