#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot
//const projectRoot=fs.realpathSync(path.join(__dirname, '..', '..')); // adjust the number of '..' to fit reality

const qt = require('qtools-functional-library'); //qt.help({printOutput:true, queryString:'.*', sendJson:false});
const asynchronousPipePlus = new require('qtools-asynchronous-pipe-plus')();
const pipeRunner = asynchronousPipePlus.pipeRunner;
const taskListPlus = asynchronousPipePlus.taskListPlus;

//START OF moduleFunction() ============================================================

const moduleFunction = function(
	{ thoughtProcess, smartyPantsChooser },
	callback
) {
	
	const { xLog, getConfig } = process.global;
	
	const localConfig = getConfig(moduleName); //getConfig(`${moduleName}`);
	const thinkersList=getConfig('thinkers'); //thinkers is the entire prompting datastructure, has an element for each line in a thought process

	const { thoughtProcesses, defaultThoughtProcess } = localConfig; //thought processes is the list of thinker modules
	
	thoughtProcess && xLog.status(`Overriding default (${defaultThoughtProcess}), using --thoughtProcess=${thoughtProcess} instead`)
	
	const thoughtProcesslist = thoughtProcess
		? thoughtProcesses[thoughtProcess]
		: thoughtProcesses[defaultThoughtProcess];
	
	// ================================================================================
	// WHERE THE RUBBER MEETS THE ROAD
	
	// This acts as an intermediary to convey opaque prompt data from the outside world to the thinkerS that actually talks to an AI system
	const askTheSmartyPantsActual = ({ localConfig }) => (
		args,
		callback
	) => {
		const taskList = new taskListPlus();
		
		const {promptGenerationData}=args;

	
		// --------------------------------------------------------------------------------
		// INITIALIZE PIPE

		taskList.push((args, next) => {

			const thinkerResponses = {};

			next('', { ...args, thinkerResponses });
		});

		// --------------------------------------------------------------------------------
		// INSTANTIATE AND EXECUTETHINKERS

		thoughtProcesslist.forEach(thoughtProcess =>
			taskList.push((args, next) => {
				const { thinkerResponses, latestResponse='first pass. no XML yet. replace with top-level object.', thinkersList, promptGenerationData } = args;

				
				const thinkerSpec=thinkersList[thoughtProcess.name];
				const {smartyPantsName}=thinkerSpec;

				const localCallback = (err, latestResponse) => {
					thinkerResponses[thinkerSpec.name]=latestResponse;
					next(err, { ...args, thinkerResponses, latestResponse, lastThinkerName:thinkerSpec.name });
				};
				
				const smartyPants=smartyPantsChooser({smartyPantsName});

				const thinker = require(thinkerSpec.module)({
					thinkerSpec,
					smartyPants
				});


				const thinkerExchangePromptData = {...promptGenerationData, latestResponse}; 

				thinker.executeRequest({thinkerExchangePromptData}, localCallback);
			})
		);

		// --------------------------------------------------------------------------------
		// TASKLIST ITEM TEMPLATE

		taskList.push((args, next) => {
			const { thinkerResponses } = args;

			
			next('', { ...args});
		});

		// --------------------------------------------------------------------------------
		// INIT AND EXECUTE THE PIPELINE

		const initialData = { localConfig, promptGenerationData, thinkersList }; //thoughtProcesslist enters in the loop above
		pipeRunner(taskList.getList(), initialData, (err, args) => {

			const {latestResponse, responseObj, thinkerResponses, lastThinkerName} = args;

			callback(err, {...latestResponse, thinkerResponses, lastThinkerName});
		});
	};
	


	// ================================================================================
	// INITIALIZE THE THINKERS
	
	const askTheSmartyPants = askTheSmartyPantsActual({
		localConfig
	});

	// ================================================================================
	// DO THE JOB
	
	let count = 0;

	const getResponse = (promptGenerationData, options, callback) => {
	
		if (typeof(options)=='function'){
			callback=options;
			options={};
		}
	
		if (callback) {
			askTheSmartyPants({promptGenerationData, ...options}, (err, result) => callback(err, 100 * count++));
		} else {
			return new Promise((resolve, reject) => {
				askTheSmartyPants({promptGenerationData, ...options}, (err, response) => {
					resolve(response);
				});
			});
		}
	};
	
	return { getResponse };
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;
//module.exports = new moduleFunction();
//moduleFunction().workingFunction().qtDump();

