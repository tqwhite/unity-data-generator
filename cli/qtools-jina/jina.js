#!/usr/bin/env node
'use strict';
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
	// ===========================================================================
	// BUILD SMARTYPANTS AND THEIR EXECUTORS

	const jinaCore = require('./lib/jina-core');

	const makeFacilitators = ({ thoughtProcessSpecificationList }) =>
		thoughtProcessSpecificationList.map((thoughtProcessSpecification) =>
			require(
				`./lib/facilitators/${thoughtProcessSpecification.facilitatorModuleName}`,
			)({
				jinaCore,
				thoughtProcessName:
					thoughtProcessSpecification.thinkerListGroupName,
			}),
		);

	const askJina = async ({
		facilitators,
		targetObjectNameList,
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
		const { runTask } = require('./lib/task-runner')({ facilitators });

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

	return { askJina, makeFacilitators };
	

	
};

// END OF moduleFunction() ============================================================


process.global = {};
process.global.xLog = xLog;

require('./lib/assemble-configuration-show-help-maybe-exit')({
	configSegmentName: 'jina/system',
	terminationFunction: process.exit,
	callback: () => {},
}); //contributes to process.global

module.exports = moduleFunction;
