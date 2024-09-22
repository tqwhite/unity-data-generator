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

		const workingFunction = () => {
			return {
				'xml-maker': {
					extractionParameters: {
						frontDelimiter: '[START XML SAMPLE]',
						backDelimitter: '[END XML SAMPLE]',
					},
					promptTemplate: require('./stringsLib/tq-maker-string1')(),
				},
				'xml-review': {
					extractionParameters: {
						frontDelimiter: '[START XML SAMPLE]',
						backDelimitter: '[END XML SAMPLE]',
					},
					promptTemplate: require('./stringsLib/tq-maker-string2')(),
				},

				'fix-problems': {
					extractionParameters: {
						frontDelimiter: '[START XML SAMPLE]',
						backDelimitter: '[END XML SAMPLE]',
						explanationFrontDelimitter: '[START EXPLANATIONS]',
						explanationBackDelimitter: '[END EXPLANATIONS]',
					},
					promptTemplate: require('./stringsLib/tq-maker-string3')(),
				},
			};
		};

		dotD.library.add(moduleName, workingFunction);

		return { workingFunction };
	};

//END OF moduleFunction() ============================================================


module.exports = moduleFunction({ moduleName });
