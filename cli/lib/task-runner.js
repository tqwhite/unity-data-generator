#!/usr/bin/env node
'use strict';
const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

const path = require('path');
const fs = require('fs');

// START OF moduleFunction() ============================================================
const moduleFunction =
	() =>
	({ facilitators }) => {
		const [xmlRefiningFacilitator, xmlGeneratingingFacilitator] = facilitators;

		const { xLog, commandLineParameters, getConfig } = process.global;
		const { conversations } = getConfig(moduleName);

		// Callback function to handle the parsed XML
		const runTask =
			({ outputFilePath }) =>
			async (err, xmlCollection) => {
				// =========================================================
				// EXECUTE THE CONVERSATIONS
				let latestWisdom={latestXml:'first pass. no XML yet. replace with top-level object.'};
				let args={};
				for (var i = 0, len = facilitators.length; i < len; i++) {
					const tmp = await facilitators[i]({
						latestWisdom,
						args,
					});
					latestWisdom = tmp.latestWisdom;
					args = tmp.args;
				}

				return latestWisdom;
			};

		return { runTask };
	};

// END OF moduleFunction() ============================================================

module.exports = moduleFunction();
