#!/usr/bin/env node
'use strict';
const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

const path = require('path');
const fs = require('fs');
const util=require('util');

// START OF moduleFunction() ============================================================
const moduleFunction =
	() =>
	({ facilitators }) => {

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
					const tmp = await facilitators[i].facilitator({
						latestWisdom,
						args,
					})
					  .catch(err=>{
						if (err){
							xLog.error(`\nError [${moduleName}/7Z3EooaJdjFLjsHu3in7]: \n${util.inspect(err, { showHidden: false, depth: null, colors: true })}`);
							throw err;
						}
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
