#!/usr/bin/env node
'use strict';

/*
 * CONVERSATION-GENERATOR: Core Orchestration Engine
 * =================================================
 *
 * This module is the heart of the qtools-ai-framework, managing the flow of wisdom
 * (data) through conversations, thinkers, and facilitators.
 *
 * KEY DATA FLOW CONCEPTS:
 * ----------------------
 * 1. WISDOM OBJECT: The primary data carrier that accumulates information as it flows
 *    through the system. Each thinker/conversation adds to the wisdom.
 *
 * 2. CONVERSATION TYPES:
 *    - Array Conversations: Process multiple conversations sequentially, passing wisdom forward
 *    - Single Conversations: Execute a specific conversation or delegate to a facilitator
 *    - Facilitator-Managed: Special conversations that control their own execution loops
 *
 * 3. CRITICAL DATA FLOW PATHS:
 *    - iterate-over-collection → conversation-generator → thinkers
 *    - Array conversations: wisdom flows from one conversation to the next
 *    - Thinker pipeline: wisdom accumulates as it passes through each thinker
 *
 * 4. COMMON DATA FLOW ISSUES:
 *    - Wisdom not being passed from facilitators to sub-conversations
 *    - Stale wisdom values from cached variables instead of passThroughObject
 *    - Metadata wrappers interfering with wisdom flow
 *
 * REGRESSION HISTORY:
 * ------------------
 * - Commit 76eb1780: Fixed wisdom flow regression where currentElement was lost
 *   due to using cached wisdom instead of passThroughObject.latestWisdom
 */

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot
//const projectRoot=fs.realpathSync(path.join(__dirname, '..', '..')); // adjust the number of '..' to fit reality

const qt = require('qtools-functional-library'); //qt.help({printOutput:true, queryString:'.*', sendJson:false});
const asynchronousPipePlus = new require('qtools-asynchronous-pipe-plus')();
const pipeRunner = asynchronousPipePlus.pipeRunner;
const taskListPlus = asynchronousPipePlus.taskListPlus;
const path = require('path');
const wisdomBusGen = require('../wisdom-bus/wisdom-bus');
const { migrateThinker } = require('../wisdom-bus/migrate-thinker-helper');

//START OF moduleFunction() ============================================================

const moduleFunction = function (
	{
		conversationName,
		smartyPantsChooser,
		thinkerParameters,
		thoughtProcessName,
		facilitatorAccessor,
	},
	callback,
) {
	const { xLog, getConfig } = process.global;

	// Generate unique ID for this conversation instance
	const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

	// ---------------------------------------------------------------------
	// Handle array of conversation names

	if (Array.isArray(conversationName)) {
		xLog.progress(
			`[${moduleName}] Processing array of ${conversationName.length} conversations`,
		);

		const getResponse = (passThroughObject, options = {}) => {
			return new Promise(async (resolve, reject) => {
				try {
					// Initialize wisdom-bus for this array conversation
					const arrayWisdomBus = wisdomBusGen({
						initialWisdom: passThroughObject.latestWisdom || {},
						collisionStrategy: options.collisionStrategy || 'sequence',
					});

					const currentArgs = passThroughObject.args || {};
					const startTime = Date.now();

					// Create accessor for array-level metadata
					const metadataAccessor = arrayWisdomBus.createAccessor(
						`array_${conversationId}`,
					);
					metadataAccessor.saveUtilityScopedData('_conversationMetadata', {
						[conversationId]: {
							type: 'array',
							conversations: conversationName,
							startTime: startTime,
							subConversations: [],
						},
					});

					// Process each conversation (which could be string or array)
					for (let i = 0; i < conversationName.length; i++) {
						const subConversationName = conversationName[i];
						xLog.progress(
							`[${moduleName}] Running sub-conversation ${i + 1}/${conversationName.length}: ${JSON.stringify(subConversationName)}`,
						);

						// Get current consolidated state for sub-conversation
						const { wisdom: currentWisdom } = arrayWisdomBus.consolidate();

						// Recursive call to moduleFunction
						const subConversation = moduleFunction({
							conversationName: subConversationName,
							smartyPantsChooser,
							thinkerParameters,
							thoughtProcessName,
						});

						// Execute sub-conversation
						const result = await subConversation.getResponse(
							{
								args: currentArgs,
								latestWisdom: currentWisdom,
							},
							options,
						);

						// Create accessor for this sub-conversation's results
						const subConvAccessor = arrayWisdomBus.createAccessor(
							`subconv_${i}_${Date.now()}`,
						);

						// Add all new wisdom from sub-conversation
						Object.entries(result.latestWisdom).forEach(([key, value]) => {
							if (key !== '_conversationMetadata') {
								subConvAccessor.saveWisdom(key, value);
							}
						});

						// Track sub-conversation completion
						const metadata = metadataAccessor.getUtilityScopedData(
							'_conversationMetadata',
						);
						metadata[conversationId].subConversations.push({
							index: i,
							name: subConversationName,
							completedAt: Date.now(),
						});
						metadataAccessor.saveUtilityScopedData(
							'_conversationMetadata',
							metadata,
						);
					}

					// Final consolidation
					const {
						wisdom: finalWisdom,
						collisions,
						processCount,
					} = arrayWisdomBus.consolidate();

					// Update metadata with completion info
					const metadata = finalWisdom._conversationMetadata || {};
					if (metadata[conversationId]) {
						metadata[conversationId].endTime = Date.now();
						metadata[conversationId].duration =
							metadata[conversationId].endTime - startTime;
						metadata[conversationId].processCount = processCount;
						metadata[conversationId].collisionCount =
							Object.keys(collisions).length;
					}
					finalWisdom._conversationMetadata = metadata;

					xLog.progress(
						`[${moduleName}] Completed array processing in ${metadata[conversationId]?.duration}ms with ${processCount} processes`,
					);

					// Debug: Save process registry
					if (options.debug) {
						const registry = arrayWisdomBus.getProcessRegistry();
						xLog.saveProcessFile(
							`array_conversation_registry_${conversationId}.json`,
							JSON.stringify(registry, null, 2),
						);
					}

					resolve({
						latestWisdom: finalWisdom,
						args: currentArgs,
					});
				} catch (error) {
					xLog.error(
						`[${moduleName}] Error in array conversation handler: ${error.message}`,
					);
					reject(error);
				}
			});
		};

		const debugInfo = () => {
			xLog.progress(
				`conversationName=${JSON.stringify(conversationName)} (array) [${moduleName}]`,
			);
		};

		return { getResponse, debugInfo, conversationId };
	}

	// ---------------------------------------------------------------------
	// Single conversation handling (existing code)

	// Extract promptLibraryName from thought process configuration
	const thoughtProcessConfig = getConfig(thoughtProcessName);
	const promptLibraryName = thoughtProcessConfig.promptLibraryName;
	const promptLibraryModulePath = thoughtProcessConfig.promptLibraryModulePath;

	const localConfig = getConfig(moduleName); //getConfig(`${moduleName}`);
	const thinkersList = getConfig('thinkers'); //thinkers is the entire prompting datastructure, has an element for each line in a thought process

	const conversationsList = localConfig; //thought processes is the list of thinker modules

	// Check if this is a facilitator-managed conversation
	const conversationConfig = conversationsList[conversationName];

	//we now allow subordinate conversations, with facilitators, that need to be initialized
	if (conversationConfig && conversationConfig.facilitatorModuleName) {
		// This is a facilitator-managed conversation - delegate to the facilitator
		xLog.progress(
			`[${moduleName}] Delegating to facilitator: ${conversationConfig.facilitatorModuleName}`,
		);

		const facilitatorModule = require(
			`../facilitators/${conversationConfig.facilitatorModuleName}/${conversationConfig.facilitatorModuleName}`,
		);

		// Create jinaCore-like object with necessary functions
		const jinaCore = {
			conversationGenerator: ({
				conversationName,
				thinkerParameters,
				thoughtProcessName,
			}) =>
				moduleFunction({
					conversationName,
					smartyPantsChooser,
					thinkerParameters,
					thoughtProcessName,
				}),
			smartyPantsChooser,
		};

		const facilitator = facilitatorModule({
			jinaCore,
			conversationName: conversationConfig.conversationThinkerListName,
			thinkerParameters,
			thoughtProcessName,
		});

		const getResponse = (passThroughObject, options = {}) => {
			// For now, facilitators still use the old pattern
			// They will be updated separately to use wisdom-bus internally
			return facilitator.facilitator(passThroughObject);
		};

		const debugInfo = () => {
			xLog.progress(
				`conversationName=${conversationName} (facilitator-managed) [${moduleName}]`,
			);
		};

		return { getResponse, debugInfo, conversationId };
	}

	const { thinkerList } = conversationConfig;

	// Instantiate prompt-generator from framework location
	const promptGenerator =
		promptLibraryName && promptLibraryModulePath
			? require('../prompt-generator')({
					promptLibraryModulePath,
					promptLibraryName,
				})
			: null;

	// ================================================================================
	// WHERE THE RUBBER MEETS THE ROAD

	// 	const conversationReplacementObject = {};
	// 	const addToConversationReplaceObject = (args) => {
	// 		if (typeof args != 'object') {
	// 			xLog.error(
	// 				`can only add objects to conversationReplaceObject [${moduleName}]`,
	// 			);
	// 			throw `can only add objects to conversationReplaceObject [${moduleName}]`;
	// 		}
	// 		conversationReplacementObject = {
	// 			...conversationReplacementObject,
	// 			...args,
	// 		};
	// 	};
	// This acts as an intermediary to convey opaque prompt data from the outside world to the thinkerS that actually talks to an AI system
	const askTheSmartyPantsActual =
		({ localConfig }) =>
		(passThroughObject, options = {}, callback) => {
			// Initialize wisdom-bus for this conversation
			const conversationWisdomBus = wisdomBusGen({
				initialWisdom: passThroughObject.latestWisdom || {},
				collisionStrategy: options.collisionStrategy || 'sequence',
			});
			
			// Phase B: Inject wisdom-bus into facilitator if facilitatorAccessor provided
			if (facilitatorAccessor && facilitatorAccessor.wisdomAccessor) {
				xLog.verbose(`[${moduleName}] Injecting wisdom-bus into facilitator via facilitatorAccessor`);
				facilitatorAccessor.wisdomAccessor(conversationWisdomBus);
			}

			const taskList = new taskListPlus();

			// --------------------------------------------------------------------------------
			// INITIALIZE PIPE

			taskList.push((args, next) => {
				const thinkerResponses = args.thinkerResponses
					? args.thinkerResponses
					: {};

				next('', {
					...args,
					thinkerResponses,
					wisdomBus: conversationWisdomBus,
				});
			});

			// --------------------------------------------------------------------------------
			// INSTANTIATE AND EXECUTE THINKERS

			if (!(thinkerList instanceof Array)) {
				throw `thinkerList is empty. Usually means bad conversationThinkerListName in systemConfig.ini. [${moduleName}]`;
			}


			thinkerList.forEach((thinkerName) =>
				taskList.push((args, next) => {
					xLog.progress(
						`\n===============   ${thinkerName.configName}  ========================= [conversation-generator.js.moduleFunction]\n`,
					);

					const { thinkerResponses, thinkersList, wisdomBus } = args;

					const thinkerSpec = thinkersList[thinkerName.configName];
					const { smartyPantsName } = thinkerSpec;

					// Create a unique accessor for this thinker
					const thinkerProcessId = `${thinkerSpec.selfName}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
					const thinkerAccessor = wisdomBus.createAccessor(thinkerProcessId);
					
					// Phase C: Set initial data on accessor if provided
					if (args.initialData && thinkerAccessor.setInitialData) {
						xLog.verbose(`[${moduleName}] Setting initial data on thinker accessor for ${thinkerSpec.selfName}`);
						thinkerAccessor.setInitialData(args.initialData);
					}

					const localCallback = (err, latestResponse) => {
						if (err) {
							xLog.error(`Thinker ${thinkerSpec.selfName} error: ${err}`);
							return next(err);
						}

						// Store response metadata (not wisdom)
						thinkerResponses[thinkerSpec.selfName] = {
							success: latestResponse.success || true,
							message: latestResponse.message,
							processId: thinkerProcessId,
							timestamp: Date.now(),
						};

						next(err, {
							...args,
							thinkerResponses,
							latestResponse,
							lastThinkerName: thinkerSpec.selfName,
						});
					};

					const smartyPants = smartyPantsName
						? smartyPantsChooser({ smartyPantsName })
						: undefined;

					let thinker = require(thinkerSpec.module)({
						thinkerSpec,
						smartyPants,
						thinkerParameters,
						promptGenerator,
						wisdomBus: thinkerAccessor,
					});

					// Wrap thinker to handle both old and new patterns
					thinker = migrateThinker(thinker);

					// Pass wisdom-bus accessor AND current wisdom view
					// Some thinkers may still need latestWisdom during migration
					// Get fresh consolidated view to include previous thinkers' contributions
					const { wisdom: currentConsolidatedWisdom } = wisdomBus.consolidate();
					const thinkerArgs = {
						...args,
						wisdomBus: thinkerAccessor,
						latestWisdom: currentConsolidatedWisdom,
					};

					thinker.executeRequest(thinkerArgs, localCallback);
				}),
			);

			// --------------------------------------------------------------------------------
			// CONSOLIDATION AND FINALIZATION

			taskList.push((args, next) => {
				const { wisdomBus, thinkerResponses } = args;

				// Consolidate all thinker contributions
				const {
					wisdom: finalWisdom,
					collisions,
					processCount,
				} = wisdomBus.consolidate();

				// Log consolidation summary
				xLog.verbose(
					`[${moduleName}] Conversation consolidation: ${processCount} thinkers, ${Object.keys(collisions).length} collisions`,
				);

				// Save debug info if requested
				if (options.debug) {
					const registry = wisdomBus.getProcessRegistry();
					xLog.saveProcessFile(
						`conversation_registry_${conversationId}.json`,
						JSON.stringify(
							{
								registry,
								collisions,
								finalWisdom,
							},
							null,
							2,
						),
					);
				}

				next('', {
					...args,
					latestWisdom: finalWisdom,
					_wisdomBusMetadata: {
						processCount,
						collisionCount: Object.keys(collisions).length,
						collisions,
					},
				});
			});

			// --------------------------------------------------------------------------------
			// INIT AND EXECUTE THE PIPELINE

			const initialData = {
				...passThroughObject.args,
				thinkersList,
			}; //thoughtProcesslist enters in the loop above
			pipeRunner(taskList.getList(), initialData, (err, args) => {
				const { latestWisdom, thinkerResponses, _wisdomBusMetadata } = args;

				callback(err, {
					latestWisdom,
					args: {
						...args,
						// Include wisdom-bus metadata for debugging
						_wisdomBusMetadata,
					},
				});
			});
		};

	// ================================================================================
	// INITIALIZE THE THINKERS

	const askTheSmartyPants = askTheSmartyPantsActual({
		localConfig,
	});

	// ================================================================================
	// DO THE JOB

	let count = 0;

	const getResponse = (passThroughObject, options = {}) => {
		//this appears to be the one that is actioned
		return new Promise((resolve, reject) => {
			askTheSmartyPants(passThroughObject, options, (err, response) => {
				resolve(response);
			}); //returns to think-keep-trying or think-up-answer
		});
	};

	const debugInfo = () => {
		xLog.progress(`conversationName=${conversationName} [${moduleName}]`);
	};

	// Return the conversation interface
	// Note: We return the original getResponse, not getResponseWithMetadata
	// The metadata wrapper was causing wisdom flow issues
	return { getResponse, debugInfo, conversationId };
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;
//module.exports = new moduleFunction();
//moduleFunction().workingFunction().qtDump();

