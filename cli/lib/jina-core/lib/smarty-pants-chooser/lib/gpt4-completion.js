#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot
//const projectRoot=fs.realpathSync(path.join(__dirname, '..', '..')); // adjust the number of '..' to fit reality

const qt = require('qtools-functional-library'); //qt.help({printOutput:true, queryString:'.*', sendJson:false});

const asynchronousPipePlus = new require('qtools-asynchronous-pipe-plus')();
const pipeRunner = asynchronousPipePlus.pipeRunner;
const taskListPlus = asynchronousPipePlus.taskListPlus;
//START OF moduleFunction() ============================================================

const moduleFunction = function ({ accessParms, annotation }) {
	const { apiKey } = accessParms;
	const { xLog, getConfig } = process.global;
	//const localConfig = getConfig(moduleName); //getConfig(`${moduleName}`);
	xLog.status(annotation);

	const accessExternalResource = (args, callback) => {
		const { promptList } = args;
		const taskList = new taskListPlus();

		// --------------------------------------------------------------------------------
		// TASKLIST ITEM TEMPLATE

		taskList.push((args, next) => {
			const openAiCompletion = require('./openai-completion')({
				accessParms,
				model: 'gpt-4',
				model: 'gpt-4o',
			});
			next('', { ...args, openAiCompletion });
		});
		// --------------------------------------------------------------------------------
		// TASKLIST ITEM TEMPLATE

		taskList.push((args, next) => {
			const { openAiCompletion, promptList } = args;
			const localCallback = (err, { rawAiResponseObject, wisdom }) => {
				next(err, { ...args, rawAiResponseObject, wisdom });
			};
			openAiCompletion.getCompletion({ promptList }, localCallback);
		});

		// --------------------------------------------------------------------------------
		// INIT AND EXECUTE THE PIPELINE

		const initialData = { apiKey, promptList };
		pipeRunner(taskList.getList(), initialData, (err, args) => {
			const { rawAiResponseObject, wisdom } = args;
			callback(err, { rawAiResponseObject, wisdom });
		});
	};
	

	return { accessExternalResource };
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;
//module.exports = new moduleFunction();
//moduleFunction().workingFunction().qtDump();

