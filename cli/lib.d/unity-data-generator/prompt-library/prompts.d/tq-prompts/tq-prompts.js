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
	({ dotD }) => {
		const { xLog, getConfig, rawConfig, commandLineParameters } =
			process.global;
		const localConfig = getConfig(moduleName); //moduleName is closure
		const alternateStringLib = commandLineParameters
			.qtGetSurePath('values.alternateStringLib', [])
			.qtLast();

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
					result.indexOf('<'),
					result.lastIndexOf('>') + 1,
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

		// identify the library to use
		const stringsVariation = alternateStringLib
			? alternateStringLib
			: `defaultStrings`;

		// Log which string library is being used
		xLog.status(`Using string library: ${stringsVariation}`);

		alternateStringLib &&
			xLog.status(
				`using alternate string library '${alternateStringLib}' in ${moduleName}`,
			);

		const passThroughParameters = {
			extractionLibrary: {
				getgeneratedSynthData,
				getExplanation,
			},
			defaultExtractionFunction: extractionFunction,
		};

		const stringMakers = require('qtools-library-dot-d')({
			libraryName: 'stringMakers',
		});

		const promptLibraryName = commandLineParameters
			.qtGetSurePath('values.promptLibrary', [])
			.qtLast('defaultStrings');
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

			return result;
		};

		dotD.library.add(moduleName, workingFunction);

		return { workingFunction };
	};

//END OF moduleFunction() ============================================================


module.exports = moduleFunction({ moduleName });
