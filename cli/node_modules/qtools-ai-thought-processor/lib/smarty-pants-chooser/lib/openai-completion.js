#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot
//const projectRoot=fs.realpathSync(path.join(__dirname, '..', '..')); // adjust the number of '..' to fit reality

const qt = require('qtools-functional-library'); //qt.help({printOutput:true, queryString:'.*', sendJson:false});

const asynchronousPipePlus = new require('qtools-asynchronous-pipe-plus')();
const pipeRunner = asynchronousPipePlus.pipeRunner;
const taskListPlus = asynchronousPipePlus.taskListPlus;

//START OF moduleFunction() ============================================================

const moduleFunction = function({ accessParms, model, promptList }) {
	const { apiKey } = accessParms;
	const { xLog, getConfig } = process.global;
	//const localConfig = getConfig(moduleName); //getConfig(`${moduleName}`);
	
	
	const getCompletion = (args, callback) => {
		const taskList = new taskListPlus();
		const { promptList, temperatureFactor } = args;

		// --------------------------------------------------------------------------------
		// TASKLIST ITEM TEMPLATE

		taskList.push((args, next) => {
			const localCallback = (err, { OpenAI }) => {
				next(err, { ...args, OpenAI });
			};
			require('./import-openai')(localCallback);
		});

		// --------------------------------------------------------------------------------
		// TASKLIST FEATURES EXAMPLE

		taskList.push(async (args, next) => {
			const { OpenAI, apiKey, model } = args;
			const localCallback = (err, newValue) => {
				next(err, { ...args, newValue });
			};

			const openai = new OpenAI({
				apiKey
			});

			const startTime = performance.now(); //milliseconds
			let rawAiResponseObject;
			
			try {
				rawAiResponseObject = await openai.chat.completions.create({
					messages: promptList,
					model,
					temperature: temperatureFactor?temperatureFactor:0.0,
					//max_tokens: 3000,
					top_p: 1,
					frequency_penalty: 0,
					presence_penalty: 0
				});
			} catch (err) {
				xLog.error(
					`\n=-=============   err  ========================= [openai-completion.js.moduleFunction]\n`
				);
				xLog.error(err);
				xLog.error(promptList);
				xLog.error(
					`\n=-=============   err END ========================= [openai-completion.js.moduleFunction]\n`
				);
				next(err, {wisdom:err.toString(), rawAiResponseObject:{isError:true, err, promptList}});
				return;
			}

			const endTime = performance.now();
			rawAiResponseObject.executionSeconds = (
				(endTime - startTime) /
				1000
			).toFixed(2);
			rawAiResponseObject.completionTime = new Date().toLocaleString();
			rawAiResponseObject.promptList = promptList;

			xLog.status(
				`gpt executionTime=${rawAiResponseObject.executionSeconds} seconds [${moduleName}]`
			);

			const wisdom = rawAiResponseObject
				.qtGetSurePath('choices', [])
				.map(item => item.message.content)
				.join('\n\n');

			next('', { ...args, rawAiResponseObject, wisdom });
		});

		// --------------------------------------------------------------------------------
		// INIT AND EXECUTE THE PIPELINE

		const initialData = { apiKey, model, promptList };
		pipeRunner(taskList.getList(), initialData, (err, args) => {
			const { rawAiResponseObject, wisdom } = args;
			callback(err, { rawAiResponseObject, wisdom });
		});
	};
	
	return { getCompletion };
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;
//module.exports = new moduleFunction();
//moduleFunction().workingFunction().qtDump();

