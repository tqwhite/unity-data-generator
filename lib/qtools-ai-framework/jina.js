#!/usr/bin/env node
'use strict';

/**
 * Copyright 2023 Access for Learning
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Authors: TQ White II (Justkidding, Inc.) and John Lovell (Access for Learning, LLC)
 */

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');
// Module to generate Unity Data using Jina AI

const fs = require('fs');
const path = require('path');
const xLog = require('./lib/x-log');
const { performance } = require('perf_hooks');

// START OF moduleFunction() ============================================================

const moduleFunction = function ({ UNUSED } = {}) {
	const { xLog, getConfig, commandLineParameters } = process.global;

	// Set global configurations

	const localConfig = getConfig('jina/system');
	const {
		batchSpecificDebugLogParentDirPath,
		batchSpecificDebugLogParentDirPurgeCount,
	} = localConfig;
	let { outputsPath } = localConfig;

	xLog.status(
		`\n===============   INITIALIZING  ========================= [${moduleName}]\n`,
	);

	// ===========================================================================
	// BUILD SMARTYPANTS AND THEIR EXECUTORS

	const jinaCore = require('./lib/jina-core');

	const makeFacilitators = ({ thoughtProcessConversationList, thinkerParameters }) =>
		thoughtProcessConversationList.map((thoughtProcessSpecification) =>
			require(
				`./lib/facilitators/${thoughtProcessSpecification.facilitatorModuleName}`,
			)({
				jinaCore,
				conversationName:
					thoughtProcessSpecification.conversationThinkerListName,
				thinkerParameters, // Pass through to facilitators
			}),
		);

	const findTheAnswer = async ({
		facilitators,
		initialThinkerData,
		debugLogName,
	}) => {
		// ===========================================================================
		// SET UP DIRECTORIES AND FILE PATHS

		// Set up batch-specific debug log directory
		const batchSpecificDebugLogDirPath = path.join(
			batchSpecificDebugLogParentDirPath,
			`${debugLogName}_${Math.floor(Date.now() / 1000)
				.toString()
				.slice(-4)}`,
		);
		require('./lib/purge-cleanup-directory')().executePurging(
			batchSpecificDebugLogParentDirPath,
			batchSpecificDebugLogParentDirPurgeCount,
		);
		xLog.setProcessFilesDirectory(batchSpecificDebugLogDirPath); //sort of a log for stuff too big to put in a log

		// ===========================================================================
		// COMBINE SMARTYPANTS EXECUTORS INTO THE MAIN EXECUTION OBJECT

		// Initialize runTask function
		const { runTask } = require('./lib/task-runner')({
			facilitators,
			initialThinkerData,
		});

		// ===========================================================================
		// EXECUTE THE PROCESS FOR SOME OR ALL OF THE POSSIBLE ELEMENTS

		const startTime = performance.now();
		let wisdom;
		if (commandLineParameters.switches.showParseErrors) {
			wisdom = await runTask({})();
		} else {
			try {
				wisdom = await runTask({})();
			} catch (error) {
				xLog.error(`Error: ${error.toString()} [${moduleName}]`);
				if (commandLineParameters.switches.debug) {
					console.trace();
				}
				throw error;
			}
		}
		const endTime = performance.now();
		const duration = ((endTime - startTime) / 1000).toFixed(2);
		return wisdom;
	};

	return { findTheAnswer, makeFacilitators };

};

// END OF moduleFunction() ============================================================

process.global = {};
process.global.xLog = xLog;

const initFunc = ({
	configFileBaseName,
	applicationBasePath,
	applicationControls,
} = {}) => {
	if (applicationBasePath) {
		process.global.applicationBasePath = applicationBasePath;
	}
	require('./lib/assemble-configuration-show-help-maybe-exit')({
		configSegmentName: 'jina/system',
		configFileBaseName,
		applicationControls,
		terminationFunction: process.exit,
		callback: () => {},
	}); //contributes to process.global
	return moduleFunction;
};

module.exports = (args) => initFunc(args);
