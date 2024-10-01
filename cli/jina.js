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

	// Get target object name from command line parameters
	let targetObjectNameList = commandLineParameters.qtGetSurePath(
		'values.elements',
		[],
	);
	targetObjectNameList = targetObjectNameList.length
		? targetObjectNameList
		: commandLineParameters.qtGetSurePath('fileList', []);

	if (
		!targetObjectNameList.length &&
		!commandLineParameters.switches.listElements
	) {
		xLog.error(`Target element name is required. Try -help or -listElements`);
		process.exit(1);
	}

	// ===========================================================================
	// SET UP DIRECTORIES AND FILE PATHS

	// Set up batch-specific debug log directory
	const batchSpecificDebugLogDirPath = path.join(
		batchSpecificDebugLogParentDirPath,
		`${targetObjectNameList}_${Math.floor(Date.now() / 1000)
			.toString()
			.slice(-4)}`,
	);
	require('./lib/purge-cleanup-directory')().executePurging(
		batchSpecificDebugLogParentDirPath,
		batchSpecificDebugLogParentDirPurgeCount,
	);
	xLog.setProcessFilesDirectory(batchSpecificDebugLogDirPath); //sort of a log for stuff too big to put in a log

	// Determine output file path and temporary file path
	const outFile = commandLineParameters.qtGetSurePath('values.outFile[0]', '');
	if (outFile) {
		outputsPath = path.dirname(outFile);
		fs.mkdirSync(outputsPath, { recursive: true });
	}
	const outputFilePath = outFile
		? outFile
		: path.join(outputsPath, `${targetObjectNameList}.xml`);

	const baseName = path.basename(outputFilePath);
	const outputDir = path.dirname(outputFilePath);
	fs.mkdirSync(outputDir, { recursive: true });
	const extension = path.extname(baseName);
	

	// ===========================================================================
	// BUILD SMARTYPANTS AND THEIR EXECUTORS
const makeFacilitators=()=>{
	// Determine thought process and refiner names; default or command line spec
	const conversationOneThoughtProcessName = commandLineParameters
		.qtGetSurePath('values.conversationOneThoughtProcessName', [])
		.qtLast('unityGenerator');

	const conversationTwoThoughtProcessName = commandLineParameters
		.qtGetSurePath('values.conversationTwoThoughtProcessName', [])
		.qtLast('refiner');

	const jinaCore = require('./lib/jina-core');

	// Initialize Jina AI core and xmlGeneratingingFacilitator function
	const { facilitator: xmlGeneratingingFacilitator } =
		require('./facilitators/get-answer')({
			jinaCore,
			thoughtProcessName: conversationOneThoughtProcessName,
		}); // munges data and orchestrates this specific smartyPants process

	// Initialize Jina AI refiner and xmlRefiningFacilitator function
	const { facilitator: xmlRefiningFacilitator } =
		require('./facilitators/answer-until-valid')({
			jinaCore,
			thoughtProcessName: conversationTwoThoughtProcessName,
		}); // munges data and orchestrates this specific smartyPants process
		
		return [xmlGeneratingingFacilitator, xmlRefiningFacilitator];
		
		}

const askJina=async ({facilitators})=>{
	// ===========================================================================
	// COMBINE SMARTYPANTS EXECUTORS INTO THE MAIN EXECUTION OBJECT

	// Initialize runTask function
	const { runTask } = require('./lib/task-runner')({facilitators});

	// ===========================================================================
	// EXECUTE THE PROCESS FOR SOME OR ALL OF THE POSSIBLE ELEMENTS
	

	const startTime = performance.now();

	if (commandLineParameters.switches.showParseErrors) {
		await runTask({
			outputFilePath,
		})();
	} else {
		try {
			await runTask({
				outputFilePath,
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
