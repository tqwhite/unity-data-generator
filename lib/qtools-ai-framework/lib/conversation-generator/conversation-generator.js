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

//START OF moduleFunction() ============================================================

const moduleFunction = function (
	{ conversationName, smartyPantsChooser, thinkerParameters, thoughtProcessName },
	callback,
) {
	const { xLog, getConfig } = process.global;
	
	// Generate unique ID for this conversation instance
	const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	
	// ---------------------------------------------------------------------
	// Handle array of conversation names
	
	if (Array.isArray(conversationName)) {
		xLog.status(`[${moduleName}] Processing array of ${conversationName.length} conversations`);
		
		const getResponse = (passThroughObject, options = {}) => {

			return new Promise(async (resolve, reject) => {
				try {
					// Clone wisdom to avoid modifying original
					let currentWisdom = Object.assign({}, passThroughObject.latestWisdom || {});

					const currentArgs = passThroughObject.args || {};
					
					// Initialize conversation metadata
					if (!currentWisdom._conversationMetadata) {
						currentWisdom._conversationMetadata = {};
					}
					
					// Record entry state
					currentWisdom._conversationMetadata[conversationId] = {
						type: 'array',
						conversations: conversationName,
						entryState: Object.assign({}, currentWisdom),
						startTime: Date.now(),
						subConversations: []
					};
					
					// Process each conversation (which could be string or array)
					for (let i = 0; i < conversationName.length; i++) {
						const subConversationName = conversationName[i];
						xLog.status(`[${moduleName}] Running sub-conversation ${i+1}/${conversationName.length}: ${JSON.stringify(subConversationName)}`);
						
						// Recursive call to moduleFunction
						const subConversation = moduleFunction({
							conversationName: subConversationName,
							smartyPantsChooser,
							thinkerParameters,
							thoughtProcessName,
						});
						
						// Execute sub-conversation
						const result = await subConversation.getResponse({
							args: currentArgs,
							latestWisdom: currentWisdom
						}, options);
						
						// Update wisdom for next iteration
						currentWisdom = result.latestWisdom;
						
						// Ensure conversation metadata is maintained
						if (!currentWisdom._conversationMetadata) {
							currentWisdom._conversationMetadata = {};
						}
						
						// Track in metadata (recreate parent entry if needed)
						if (!currentWisdom._conversationMetadata[conversationId]) {
							// Create entryState without _conversationMetadata to avoid circular reference
							const { _conversationMetadata, ...entryStateWithoutMetadata } = passThroughObject.latestWisdom;
							currentWisdom._conversationMetadata[conversationId] = {
								type: 'array',
								conversations: conversationName,
								entryState: Object.assign({}, entryStateWithoutMetadata),
								startTime: Date.now(),
								subConversations: []
							};
						}
						
						currentWisdom._conversationMetadata[conversationId].subConversations.push({
							index: i,
							name: subConversationName,
							completedAt: Date.now()
						});
					}
					
					// Record exit state
					currentWisdom._conversationMetadata[conversationId].endTime = Date.now();
					currentWisdom._conversationMetadata[conversationId].duration = 
						currentWisdom._conversationMetadata[conversationId].endTime - 
						currentWisdom._conversationMetadata[conversationId].startTime;
					
					xLog.status(`[${moduleName}] Completed array processing in ${currentWisdom._conversationMetadata[conversationId].duration}ms`);
					
					// Debug: Check if metadata exists
					if (currentWisdom._conversationMetadata) {
						xLog.status(`[${moduleName}] Conversation metadata contains ${Object.keys(currentWisdom._conversationMetadata).length} entries`);
						// Save conversation metadata for debugging

						xLog.saveProcessFile(
							`conversation_metadata_${conversationId}.json`,
							JSON.stringify(currentWisdom._conversationMetadata, null, 2)
						);
					}
					
					resolve({
						latestWisdom: currentWisdom,
						args: currentArgs
					});
					
				} catch (error) {
					xLog.error(`[${moduleName}] Error in array conversation handler: ${error.message}`);
					reject(error);
				}
			});
		};
		
		const debugInfo = () => {
			xLog.status(`conversationName=${JSON.stringify(conversationName)} (array) [${moduleName}]`);
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
	if (conversationConfig && conversationConfig.facilitatorModuleName) {
		// This is a facilitator-managed conversation - delegate to the facilitator
		xLog.status(`[${moduleName}] Delegating to facilitator: ${conversationConfig.facilitatorModuleName}`);
		
		const facilitatorModule = require(`../facilitators/${conversationConfig.facilitatorModuleName}/${conversationConfig.facilitatorModuleName}`);
		
		// Create jinaCore-like object with necessary functions
		const jinaCore = {
			conversationGenerator: ({ conversationName, thinkerParameters, thoughtProcessName }) =>
				moduleFunction({
					conversationName,
					smartyPantsChooser,
					thinkerParameters,
					thoughtProcessName
				}),
			smartyPantsChooser
		};
		
		const facilitator = facilitatorModule({
			jinaCore,
			conversationName: conversationConfig.conversationThinkerListName,
			thinkerParameters,
			thoughtProcessName,
		});
		
		const getResponse = (passThroughObject, options = {}) => {
			return facilitator.facilitator(passThroughObject);
		};
		
		const debugInfo = () => {
			xLog.status(`conversationName=${conversationName} (facilitator-managed) [${moduleName}]`);
		};
		
		return { getResponse, debugInfo, conversationId };
	}

	const {thinkerList} = conversationConfig;
	
	// Instantiate prompt-generator from framework location
	const promptGenerator = promptLibraryName && promptLibraryModulePath ? 
		require('../prompt-generator')({
			promptLibraryModulePath,
			promptLibraryName
		}) : null;

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
			const { latestWisdom } = passThroughObject;

			const taskList = new taskListPlus();

			// --------------------------------------------------------------------------------
			// INITIALIZE PIPE

			taskList.push((args, next) => {
				const thinkerResponses = args.thinkerResponses?args.thinkerResponses:{};

				next('', { ...args, thinkerResponses });
			});

			// --------------------------------------------------------------------------------
			// INSTANTIATE AND EXECUTE THINKERS
			
			if(!(thinkerList instanceof Array)){
				throw `thinkerList is empty. Usually means bad conversationThinkerListName in systemConfig.ini. [${moduleName}]`;
			}

			thinkerList.forEach((thinkerName) =>
				taskList.push((args, next) => {
					xLog.status(
						`\n===============   ${thinkerName.configName}  ========================= [conversation-generator.js.moduleFunction]\n`,
					);

					const { thinkerResponses, thinkersList, passThroughObject } = args;

					const latestWisdom = args.latestWisdom;
					
					if (!latestWisdom){
						xLog.error(`A Thinker did not send a latestWisdom object. Cannot continue. Exiting.`)
						thinkerResponses.qtListProperties({label:'thinkerResponses so far'});
						throw `A Thinker did not send a latestWisdom object. Cannot continue. Exiting.`
					}
					
					const thinkerSpec = thinkersList[thinkerName.configName];
					const { smartyPantsName } = thinkerSpec;

					const localCallback = (err, latestResponse) => {
						thinkerResponses[thinkerSpec.selfName] = latestResponse;


						next(err, {
							...args,
							latestWisdom: latestResponse.wisdom,
							thinkerResponses,
							latestResponse,
							lastThinkerName: thinkerSpec.selfName,
						});
					};

					const smartyPants=smartyPantsName?smartyPantsChooser({ smartyPantsName }):undefined;
					
					const thinker = require(thinkerSpec.module)({
						thinkerSpec,
						smartyPants,
						thinkerParameters,
						promptGenerator,
					});

					thinker.executeRequest(args, localCallback);
				}),
			);

			// --------------------------------------------------------------------------------
			// TASKLIST ITEM TEMPLATE

			taskList.push((args, next) => {
				const { thinkerResponses } = args;

				next('', { ...args });
			});

			// --------------------------------------------------------------------------------
			// INIT AND EXECUTE THE PIPELINE
			
			const initialData = {
				...passThroughObject.args,
				latestWisdom: passThroughObject.latestWisdom, // Use current wisdom from passThroughObject, not cached version
				thinkersList,
			}; //thoughtProcesslist enters in the loop above
			pipeRunner(taskList.getList(), initialData, (err, args) => {
				const { latestWisdom, thinkerResponses } = args;


				callback(err, {
					latestWisdom,
					args,
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
		xLog.status(`conversationName=${conversationName} [${moduleName}]`);
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

