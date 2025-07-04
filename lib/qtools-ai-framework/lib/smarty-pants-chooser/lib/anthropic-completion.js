#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const qt = require('qtools-functional-library');

const asynchronousPipePlus = new require('qtools-asynchronous-pipe-plus')();
const pipeRunner = asynchronousPipePlus.pipeRunner;
const taskListPlus = asynchronousPipePlus.taskListPlus;

//START OF moduleFunction() ============================================================

const moduleFunction = function({ accessParms, model, promptList }) {
	const { apiKey } = accessParms;
	const { xLog, getConfig } = process.global;
	
	const getCompletion = (args, callback) => {
		const taskList = new taskListPlus();
		const { promptList, temperatureFactor } = args;

		// --------------------------------------------------------------------------------
		// IMPORT ANTHROPIC SDK

		taskList.push((args, next) => {
			const localCallback = (err, { Anthropic }) => {
				next(err, { ...args, Anthropic });
			};
			require('./import-anthropic')(localCallback);
		});

		// --------------------------------------------------------------------------------
		// MAKE ANTHROPIC API CALL

		taskList.push((args, next) => {
			const { Anthropic, apiKey, model } = args;
			const localCallback = (err, newValue) => {
				next(err, { ...args, newValue });
			};

			xLog.debug(`API Key length: ${apiKey ? apiKey.length : 'undefined'}`);
			xLog.debug(`API Key starts with: ${apiKey ? apiKey.substring(0, 20) + '...' : 'undefined'}`);

			const anthropic = new Anthropic({
				apiKey: apiKey
			});

			const startTime = performance.now();
			let rawAiResponseObject;
			
			// Convert OpenAI message format to Anthropic format if needed
			const convertedMessages = convertPromptListToAnthropicFormat(promptList);
			
			// Map OpenAI temperature range (0-2) to Anthropic range (0-1)
			const mappedTemperature = temperatureFactor ? Math.min(temperatureFactor / 2, 1.0) : 1.0;
			
			const parameters = {
				model,
				max_tokens: 4000,
				temperature: mappedTemperature,
				messages: convertedMessages.messages
			};

			// Add system message if present
			if (convertedMessages.system) {
				parameters.system = convertedMessages.system;
			}

			// Add tool definitions if available
			if (convertedMessages.tools && convertedMessages.tools.length > 0) {
				parameters.tools = convertedMessages.tools;
			}
			
			anthropic.messages.create(parameters)
				.then(response => {
					rawAiResponseObject = response;
					
					const endTime = performance.now();
					rawAiResponseObject.executionSeconds = (
						(endTime - startTime) /
						1000
					).toFixed(2);
					rawAiResponseObject.completionTime = new Date().toLocaleString();
					rawAiResponseObject.promptList = promptList;

					xLog.progress(
						`claude executionTime=${rawAiResponseObject.executionSeconds} seconds [${moduleName}]`
					);

					// Extract text content from Anthropic response format
					const wisdom = rawAiResponseObject.content
						.filter(block => block.type === 'text')
						.map(block => block.text)
						.join('\n\n');

					next('', { ...args, rawAiResponseObject, wisdom });
				})
				.catch(err => {
					xLog.error(
						`\n=-=============   err  ========================= [anthropic-completion.js.moduleFunction]\n`
					);
					xLog.error(err);
					xLog.error(promptList);
					xLog.error(
						`\n=-=============   err END ========================= [anthropic-completion.js.moduleFunction]\n`
					);
					next(err, {wisdom: err.toString(), rawAiResponseObject: {isError: true, err, promptList}});
				});
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

// ---------------------------------------------------------------------
// convertPromptListToAnthropicFormat - Convert OpenAI format to Anthropic format

const convertPromptListToAnthropicFormat = (promptList) => {
	const result = {
		messages: [],
		system: null,
		tools: []
	};

	for (const prompt of promptList) {
		if (prompt.role === 'system') {
			// Anthropic uses separate system parameter
			result.system = prompt.content;
		} else if (prompt.role === 'user' || prompt.role === 'assistant') {
			// Convert user and assistant messages
			result.messages.push({
				role: prompt.role,
				content: prompt.content
			});
		} else if (prompt.role === 'tool') {
			// Handle tool responses (if any)
			result.messages.push({
				role: 'user',
				content: [
					{
						type: 'tool_result',
						tool_use_id: prompt.tool_call_id,
						content: prompt.content
					}
				]
			});
		}
	}

	// Handle tool definitions if present in the original prompt
	// This would need to be adapted based on how tools are defined in your system
	
	return result;
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;