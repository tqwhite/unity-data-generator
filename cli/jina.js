#!/usr/bin/env node
'use strict';
const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');
// Module to generate Unity Data using Jina AI

const fs = require('fs');
const xlsx = require('xlsx');
const path = require('path');
const xLog = require('./lib/x-log');
const { performance } = require('perf_hooks');

// START OF moduleFunction() ============================================================

const moduleFunction = function (
	{UNUSED}={},
) {

	const { xLog, getConfig, commandLineParameters }=process.global


	// Set global configurations

	const localConfig = getConfig('SYSTEM');
	const {
		spreadsheetPath,
		batchSpecificDebugLogParentDirPath,
		batchSpecificDebugLogParentDirPurgeCount,
	} = localConfig;
	let { outputsPath } = localConfig;
	// ===========================================================================
	// BUILD SMARTYPANTS AND THEIR EXECUTORS

const jinaCore = require('./lib/jina-core');

const makeFacilitators=({thoughtProcessNameList})=>{

	// Initialize Jina AI core and xmlGeneratingingFacilitator function
	const { facilitator: xmlGeneratingingFacilitator } =
		require('./facilitators/get-answer')({
			jinaCore,
			thoughtProcessName: thoughtProcessNameList[0],
		}); // munges data and orchestrates this specific smartyPants process

	// Initialize Jina AI refiner and xmlRefiningFacilitator function
	const { facilitator: xmlRefiningFacilitator } =
		require('./facilitators/answer-until-valid')({
			jinaCore,
			thoughtProcessName: thoughtProcessNameList[1],
		}); // munges data and orchestrates this specific smartyPants process
		
		return [xmlGeneratingingFacilitator, xmlRefiningFacilitator];
		
		}

const askJina=async ({facilitators, targetObjectNameList, debugLogName})=>{
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
	const { runTask } = require('./lib/task-runner')({facilitators});

	// ===========================================================================
	// EXECUTE THE PROCESS FOR SOME OR ALL OF THE POSSIBLE ELEMENTS
	

	const startTime = performance.now();
	let wisdom;
	if (commandLineParameters.switches.showParseErrors) {
		wisdom=await runTask({
		})();
	} else {
		try {
			wisdom=await runTask({
			})();
		} catch (error) {
			xLog.error(`Error: ${error} [${moduleName}]`);
			if (commandLineParameters.switches.debug) {
				console.trace();
			}
			process.exit(1);
		}
	}
	const endTime = performance.now();
	const duration = ((endTime - startTime) / 1000).toFixed(2);
	return wisdom;
}

return {askJina, makeFacilitators}



};

// END OF moduleFunction() ============================================================

process.global = {};
process.global.applicationBasePath = path.join(
	path.dirname(__filename),
	'..',
	'..',
);
process.global.xLog = xLog;

require('./lib/assemble-configuration-show-help-maybe-exit')({
	configSegmentName: 'SYSTEM',
	terminationFunction: process.exit,
	callback: ()=>{},
}); //contributes to process.global

module.exports=moduleFunction;
