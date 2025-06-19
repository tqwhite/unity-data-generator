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

		alternateStringLib &&
			xLog.status(
				`using alternate string library '${alternateStringLib}' in ${moduleName}`,
			);
		

		const getgeneratedSynthData = (inString) => {
			const startDelimiter = '[START DATA SAMPLE]';
			const endDelimiter = '[END DATA SAMPLE]';

			function escapeRegExp(string) {
				return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escapes special characters for use in a regex
			}

			const escapedStartDelimiter = escapeRegExp(startDelimiter);
			const escapedEndDelimiter = escapeRegExp(endDelimiter);

			const regexString = `${escapedStartDelimiter}(.*?)${escapedEndDelimiter}`;
			const regex = new RegExp(regexString, 's');

			const match = inString.match(regex);

			if (match) {
				const result=match[1];
				const xmlContent = result.substring(result.indexOf('<'), result.lastIndexOf('>') + 1);
				return {generatedSynthData:xmlContent}
			} else {
				return {generatedSynthData:'XML Missing in Response'}
			}
		};

		const getExplanation = (inString) => {
			const startDelimiter = '[START EXPLANATIONS]';
			const endDelimiter = '[END EXPLANATIONS]';

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
				return {explanation:xmlContent}
			} else {
				return {explanation:'No explanation found.'}
			}
		};
		

		const extractionFunction = (extractionList=[])=>(inString) => {
			const outObject={};
			
			extractionList.forEach(extractionFunc=>{
				const result=extractionFunc(inString);
				Object.assign(outObject, result); //mutates outObject
			});
			return outObject;
		};
		

		const stringsVariation = alternateStringLib
			? alternateStringLib
			: `defaultStrings`;
		const workingFunction = () => {
			return {
				'xml-maker': {
					extractionFunction:extractionFunction([getgeneratedSynthData]),
					extractionParameters: {
						frontDelimiter: `[START DATA SAMPLE]`,
						backDelimiter: `[END DATA SAMPLE]`,
					},
					promptTemplate: require(`./stringsLib/${stringsVariation}/maker`)(),
				},
				'xml-review': {
					extractionFunction:extractionFunction([getgeneratedSynthData]),
					extractionParameters: {
						frontDelimiter: `[START DATA SAMPLE]`,
						backDelimiter: `[END DATA SAMPLE]`,
					},
					promptTemplate: require(`./stringsLib/${stringsVariation}/review`)(),
				},

				'fix-problems': {
					extractionFunction:extractionFunction([getgeneratedSynthData, getExplanation]),
					extractionParameters: {
						frontDelimiter: `[START DATA SAMPLE]`,
						backDelimiter: `[END DATA SAMPLE]`,
						explanationFrontDelimiter: `[START EXPLANATIONS]`,
						explanationBackDelimiter: `[END EXPLANATIONS]`,
					},
					promptTemplate: require(`./stringsLib/${stringsVariation}/fix`)(),
				},
			};
		};

		dotD.library.add(moduleName, workingFunction);

		return { workingFunction };
	};

//END OF moduleFunction() ============================================================


module.exports = moduleFunction({ moduleName });
