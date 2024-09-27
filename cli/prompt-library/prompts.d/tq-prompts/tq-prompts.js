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
		

		const extractionFunction = (inString) => {
			const startDelimiter = '[START XML SAMPLE]';
			const endDelimiter = '[END XML SAMPLE]';

			function escapeRegExp(string) {
				return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escapes special characters for use in a regex
			}

			const escapedStartDelimiter = escapeRegExp(startDelimiter);
			const escapedEndDelimiter = escapeRegExp(endDelimiter);

			const regexString = `${escapedStartDelimiter}(.*?)${escapedEndDelimiter}`;
			const regex = new RegExp(regexString, 's');

			const match = text.match(regex);

			if (match) {
				const xmlContent = match[1].trim();
				return {xml:xmlContent}
			} else {
				return {xml:'XML Missing in Response'}
			}
		};
		

		const stringsVariation = alternateStringLib
			? alternateStringLib
			: `defaultStrings`;
		const workingFunction = () => {
			return {
				'xml-maker': {
					extractionFunction,
					extractionParameters: {
						frontDelimiter: `[START XML SAMPLE]`,
						backDelimitter: `[END XML SAMPLE]`,
					},
					promptTemplate: require(`./stringsLib/${stringsVariation}/maker`)(),
				},
				'xml-review': {
					extractionParameters: {
						frontDelimiter: `[START XML SAMPLE]`,
						backDelimitter: `[END XML SAMPLE]`,
					},
					promptTemplate: require(`./stringsLib/${stringsVariation}/review`)(),
				},

				'fix-problems': {
					extractionParameters: {
						frontDelimiter: `[START XML SAMPLE]`,
						backDelimitter: `[END XML SAMPLE]`,
						explanationFrontDelimitter: `[START EXPLANATIONS]`,
						explanationBackDelimitter: `[END EXPLANATIONS]`,
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
