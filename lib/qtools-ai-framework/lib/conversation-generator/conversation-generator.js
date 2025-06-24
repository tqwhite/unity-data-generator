#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot
//const projectRoot=fs.realpathSync(path.join(__dirname, '..', '..')); // adjust the number of '..' to fit reality

const qt = require('qtools-functional-library'); //qt.help({printOutput:true, queryString:'.*', sendJson:false});
const asynchronousPipePlus = new require('qtools-asynchronous-pipe-plus')();
const pipeRunner = asynchronousPipePlus.pipeRunner;
const taskListPlus = asynchronousPipePlus.taskListPlus;

//START OF moduleFunction() ============================================================

const moduleFunction = function (
	{ conversationName, smartyPantsChooser },
	callback,
) {
	const { xLog, getConfig } = process.global;

	const localConfig = getConfig(moduleName); //getConfig(`${moduleName}`);
	const thinkersList = getConfig('thinkers'); //thinkers is the entire prompting datastructure, has an element for each line in a thought process

	const conversationsList = localConfig; //thought processes is the list of thinker modules

	const {thinkerList} = conversationsList[conversationName];

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
				latestWisdom,
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

	return { getResponse, debugInfo };
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;
//module.exports = new moduleFunction();
//moduleFunction().workingFunction().qtDump();

