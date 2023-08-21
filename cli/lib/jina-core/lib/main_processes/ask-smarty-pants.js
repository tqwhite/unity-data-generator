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
	{ thoughtProcess, personality },
	callback
) {
	
	const { xLog, getConfig } = process.global;
	const localConfig = getConfig(moduleName); //getConfig(`${moduleName}`);

	const { thoughtProcesses, defaultThoughtProcess } = localConfig;
	const thinkerSpecificationList = thoughtProcess
		? thoughtProcesses[thoughtProcess]
		: thoughtProcesses[defaultThoughtProcess];
	
	
	// ================================================================================
	// WHERE THE RUBBER MEETS THE ROAD
	
	const askTheSmartyPantsActual = ({ localConfig, personality }) => (
		args,
		callback
	) => {
		const taskList = new taskListPlus();
		
		const {pleaForHelp}=args;


		// --------------------------------------------------------------------------------
		// INITIALIZE PIPE

		taskList.push((args, next) => {
			const { localConfig, personality, pleaForHelp } = args;
			const {
				thoughtProcesses,
				defaultThoughtProcess,
				personalities,
				defaultPersonality
			} = localConfig;

			const personalMotto = personality
				? personalities[personality]
				: personalities[defaultPersonality];

			const thinkerResponses = [];

			const latestResponse = {message:pleaForHelp};

			next('', { ...args, personalMotto, thinkerResponses, latestResponse });
		});

		// --------------------------------------------------------------------------------
		// INSTANTIATE AND EXECUTETHINKERS

		thinkerSpecificationList.forEach(thinkerSpec =>
			taskList.push((args, next) => {
				const { personalMotto, thinkerResponses, latestResponse } = args;
				const {message}=latestResponse;

				const localCallback = (err, latestResponse) => {
					thinkerResponses.push(latestResponse);
					next(err, { ...args, thinkerResponses, latestResponse });
				};

				const thinker = require(thinkerSpec.module)({
					...thinkerSpec,
					personalMotto
				});


				const neuronData = message;

				thinker.executeRequest({neuronData}, localCallback);
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

		const initialData = { localConfig, personality, pleaForHelp }; //thinkerSpecificationList enters in the loop above
		pipeRunner(taskList.getList(), initialData, (err, args) => {

			const {latestResponse:response, responseObj} = args;
			callback(err, {response, responseObj});
		});
	};
	


	// ================================================================================
	// INITIALIZE THE THINKERS
	
	const askTheSmartyPants = askTheSmartyPantsActual({
		localConfig,
		personality
	});

	// ================================================================================
	// DO THE JOB
	
	let count = 0;

	const getResponse = (pleaForHelp, options, callback) => {
	
		if (typeof(options)=='function'){
			callback=options;
			options={};
		}
	
		if (callback) {
			askTheSmartyPants({pleaForHelp, ...options}, (err, result) => callback(err, 100 * count++));
		} else {
			return new Promise((resolve, reject) => {
				askTheSmartyPants({pleaForHelp, ...options}, (err, response) => {
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

