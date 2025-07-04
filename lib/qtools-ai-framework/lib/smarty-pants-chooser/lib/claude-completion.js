#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const qt = require('qtools-functional-library');

const asynchronousPipePlus = new require('qtools-asynchronous-pipe-plus')();
const pipeRunner = asynchronousPipePlus.pipeRunner;
const taskListPlus = asynchronousPipePlus.taskListPlus;

//START OF moduleFunction() ============================================================

const moduleFunction = function ({ accessParms, modelName }) {
	const { apiKey } = accessParms;
	const { xLog, getConfig } = process.global;
	xLog.progress(`using Anthropic model: ${modelName}`);

	const accessExternalResource = (args, callback) => {
		const { promptList, temperatureFactor } = args;
		const taskList = new taskListPlus();

		// --------------------------------------------------------------------------------
		// INITIALIZE ANTHROPIC COMPLETION

		taskList.push((args, next) => {
			const anthropicCompletion = require('./anthropic-completion')({
				accessParms,
				model: modelName,
			});
			next('', { ...args, anthropicCompletion });
		});

		// --------------------------------------------------------------------------------
		// MAKE ANTHROPIC API CALL

		taskList.push((args, next) => {
			const { anthropicCompletion, promptList } = args;

			const localCallback = (err, { rawAiResponseObject, wisdom }) => {
				next(err, { ...args, rawAiResponseObject, wisdom });
			};

			xLog.debug(promptList);

			anthropicCompletion.getCompletion(
				{ promptList, temperatureFactor },
				localCallback,
			);
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