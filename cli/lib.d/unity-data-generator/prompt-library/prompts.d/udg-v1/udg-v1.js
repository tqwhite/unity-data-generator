#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

// const qt = require('qtools-functional-library'); //also exposes qtLog(); qt.help({printOutput:true, queryString:'.*', sendJson:false});

const os = require('os');
const path = require('path');
const fs = require('fs');

//START OF moduleFunction() ============================================================
const moduleFunction =
	({ moduleName } = {}) =>
	({ passThroughParameters: inboundPassThrough }) => {
		const { selectedLibrary } = inboundPassThrough;

		const expectedDataType='XML';

		let start_dataTypeSpecificCleanupDelimiter;
		let end_dataTypeSpecificCleanupDelimiter;

		switch (expectedDataType) {
			case 'JSON':
				start_dataTypeSpecificCleanupDelimiter = '{';
				end_dataTypeSpecificCleanupDelimiter = '}';
				break;
			case 'XML':
				start_dataTypeSpecificCleanupDelimiter = '<';
				end_dataTypeSpecificCleanupDelimiter = '>';
				break;
		}

		const { xLog, getConfig, rawConfig, commandLineParameters } =
			process.global;
		const localConfig = getConfig(moduleName); //moduleName is closure
		
		const promptLibraryName = commandLineParameters
			.qtGetSurePath('values.promptVersion', [])
			.qtLast('defaultStrings');
			
		xLog.progress(`Using prompt library: ${promptLibraryName}`);

		const getgeneratedSynthData = (extractionParameters) => (inString) => {


			const { frontDelimiter: startDelimiter, backDelimiter: endDelimiter } =
				extractionParameters.getgeneratedSynthData;

			// 			const startDelimiter = '[START DATA SAMPLE]';
			// 			const endDelimiter = '[END DATA SAMPLE]';

			function escapeRegExp(string) {
				return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escapes special characters for use in a regex
			}

			const escapedStartDelimiter = escapeRegExp(startDelimiter);
			const escapedEndDelimiter = escapeRegExp(endDelimiter);

			const regexString = `${escapedStartDelimiter}(.*?)${escapedEndDelimiter}`;
			const regex = new RegExp(regexString, 's');

			const match = inString.match(regex);

			if (match) {
				const result = match[1];
				const xmlContent = result.substring(
					result.indexOf(start_dataTypeSpecificCleanupDelimiter),
					result.lastIndexOf(end_dataTypeSpecificCleanupDelimiter) + 1,
				);
				return { generatedSynthData: xmlContent };
			} else {
				return { generatedSynthData: 'XML Missing in Response' };
			}
		};

		const getExplanation = (extractionParameters) => (inString) => {
			const {
				frontDelimiter: startDelimiter,
				backDelimiter: endDelimiter,
			} = extractionParameters.getExplanation;

			// 			const startDelimiter = '[START EXPLANATIONS]';
			// 			const endDelimiter = '[END EXPLANATIONS]';

			function escapeRegExp(string) {
				return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escapes special characters for use in a regex
			}

			const escapedStartDelimiter = escapeRegExp(startDelimiter);
			const escapedEndDelimiter = escapeRegExp(endDelimiter);

			const regexString = `${escapedStartDelimiter}(.*?)${escapedEndDelimiter}`;
			const regex = new RegExp(regexString, 's');

			const match = inString.match(regex);

			if (match) {
				const xmlContent = match[1].trim();
				return { explanation: xmlContent };
			} else {
				return { explanation: 'No explanation found.' };
			}
		};

		const extractionFunction =
			({ extractionList }) =>
			(inString) => {
				const outObject = {};

				extractionList.forEach((extractionFunc) => {
					const result = extractionFunc(inString);
					Object.assign(outObject, result); //mutates outObject
				});
				return outObject;
			};

		// Tools will be collected from individual prompt modules
		const tools = {};

		const passThroughParameters = {
			extractionLibrary: {
				getgeneratedSynthData,
				getExplanation,
			},
			defaultExtractionFunction: extractionFunction,
			tools,
		};

		const stringMakers = require('qtools-library-dot-d')({
			libraryName: 'stringMakers',
		});

		const promptLibraryPath = path.join(
			__dirname,
			'stringsLib',
			promptLibraryName,
		);
		stringMakers.setLibraryPath(promptLibraryPath);
		stringMakers.loadModules({ passThroughParameters });
		stringMakers.seal();

		const workingFunction = () => {
			const result = Object.keys(stringMakers)
				.map((name) => stringMakers[name]())
				.filter((item) => typeof item == 'object' && item.thinker)
				.reduce((result, item) => {
					result[item.thinker] = item;
					return result;
				}, {});

			// Collect tools from all prompt modules that provide them
			const collectToolsFromModules = (moduleResults) => {
				const collectedTools = {};
				
				Object.keys(moduleResults).forEach(thinkerName => {
					const module = moduleResults[thinkerName];
					if (module && module.tools) {
						// Merge tools from this module
						Object.keys(module.tools).forEach(toolName => {
							const toolKey = toolName;
							if (collectedTools[toolKey]) {
								// If tool already exists, create a composite function
								const existingTool = collectedTools[toolKey];
								const newTool = module.tools[toolName];
								collectedTools[toolKey] = (data) => {
									// Chain the tools: first existing, then new
									const intermediateResult = existingTool(data);
									return newTool(intermediateResult);
								};
							} else {
								collectedTools[toolKey] = module.tools[toolName];
							}
						});
					}
				});
				
				return collectedTools;
			};

			// Collect all tools from modules
			const moduleTools = collectToolsFromModules(result);
			Object.assign(tools, moduleTools);

			// Add tools to the result object
			result.tools = tools;

			return result;
		};

		return workingFunction;
	};

//END OF moduleFunction() ============================================================


module.exports = moduleFunction({ moduleName });
