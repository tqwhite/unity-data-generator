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
	{ thoughtProcessName, smartyPantsChooser },
	callback,
) {
	const { xLog, getConfig } = process.global;

	const localConfig = getConfig(moduleName); //getConfig(`${moduleName}`);
	const thinkersList = getConfig('thinkers'); //thinkers is the entire prompting datastructure, has an element for each line in a thought process

	const { thoughtProcesses, defaultThoughtProcess } = localConfig; //thought processes is the list of thinker modules

	const thoughtProcesslist = thoughtProcesses[thoughtProcessName];

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
		(promptGenerationData, options = {}, callback) => {
			const taskList = new taskListPlus();

			// --------------------------------------------------------------------------------
			// INITIALIZE PIPE

			taskList.push((args, next) => {
				const thinkerResponses = {};

				next('', { ...args, thinkerResponses });
			});

			// --------------------------------------------------------------------------------
			// INSTANTIATE AND EXECUTE THINKERS

			thoughtProcesslist.forEach((thoughtProcess) =>
				taskList.push((args, next) => {
					const { thinkerResponses, thinkersList, promptGenerationData } = args;
					const latestWisdom = args.latestWisdom
						? args.latestWisdom
						: 'Start from scratch';

					const thinkerSpec = thinkersList[thoughtProcess.configName];

					const { smartyPantsName } = thinkerSpec;

					const localCallback = (err, latestResponse) => {
						thinkerResponses[thinkerSpec.selfName] = latestResponse;

						latestResponse.wisdom = latestResponse.wisdom
							.replace(/\`\`\`xml/i, '')
							.replace(/\`\`\`/, '');
						next(err, {
							...args,
							thinkerResponses,
							latestResponse,
							latestWisdom: latestResponse.wisdom,
							lastThinkerName: thinkerSpec.selfName,
						});
					};

					const thinker = require(thinkerSpec.module)({
						thinkerSpec,
						smartyPants: smartyPantsChooser({ smartyPantsName }),
					});

					const thinkerExchangePromptData = {
						...promptGenerationData,
						...args,
					};

					thinker.executeRequest({ thinkerExchangePromptData }, localCallback);
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

			const initialData = { localConfig, promptGenerationData, thinkersList }; //thoughtProcesslist enters in the loop above
			pipeRunner(taskList.getList(), initialData, (err, args) => {
				const {
					latestResponse,
					responseObj,
					thinkerResponses,
					lastThinkerName,
				} = args;

				callback(err, {
					latestResponse,
					thinkerResponses,
					lastThinkerName,
					XXX: 'HELLO',
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

	const getResponse = (promptGenerationData, options = {}) => {

		//this appears to be the one that is actioned
		return new Promise((resolve, reject) => {
			askTheSmartyPants(promptGenerationData, options, (err, response) => {
				resolve(response);
			}); //returns to think-keep-trying or think-up-answer
		});
	};

	const debugInfo = () => {
		xLog.status(`thoughtProcessName=${thoughtProcessName} [${moduleName}]`);
	};

	return { getResponse, debugInfo };
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;
//module.exports = new moduleFunction();
//moduleFunction().workingFunction().qtDump();

