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

const moduleFunction = async function (
	error,
	{ getConfig, commandLineParameters },
) {
	// Handle initial error
	if (error) {
		xLog.error(error);
		process.exit(1);
	}

	// Set global configurations
	process.global.getConfig = getConfig;
	process.global.commandLineParameters = commandLineParameters;

	const localConfig = getConfig('SYSTEM');
	const { spreadsheetPath, batchSpecificDebugLogParentDirPath, batchSpecificDebugLogParentDirPurgeCount, } = localConfig;
	let { outputsPath } = localConfig;

	// Get target object name from command line parameters
	let targetObjectNameList = commandLineParameters.qtGetSurePath('values.elements', []);
	targetObjectNameList=targetObjectNameList.length?targetObjectNameList:commandLineParameters.qtGetSurePath('fileList', []);

	if (!targetObjectNameList.length && !commandLineParameters.switches.listElements) {
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
	require('./lib/purge-cleanup-directory')().executePurging(batchSpecificDebugLogParentDirPath, batchSpecificDebugLogParentDirPurgeCount);
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

	// Determine thought process and refiner names; default or command line spec
	const xmlGeneratingingFacilitatorName = commandLineParameters
		.qtGetSurePath('values.xmlGeneratingingFacilitatorName', [])
		.qtLast('unityGenerator');

	const refinerName = commandLineParameters
		.qtGetSurePath('values.refinerName', [])
		.qtLast('refiner');

	const jinaCore = require('./lib/jina-core');

	// Initialize Jina AI core and xmlGeneratingingFacilitator function
	const { facilitator: xmlGeneratingingFacilitator } = require('./facilitators/get-answer')({
		jinaCore,
		thoughtProcessName: xmlGeneratingingFacilitatorName,
	}); // munges data and orchestrates this specific smartyPants process

	// Initialize Jina AI refiner and xmlRefiningFacilitator function
	const { facilitator: xmlRefiningFacilitator } = require('./facilitators/answer-until-valid')({
		jinaCore,
		thoughtProcessName: refinerName,
	}); // munges data and orchestrates this specific smartyPants process

	// ===========================================================================
	// COMBINE SMARTYPANTS EXECUTORS INTO THE MAIN EXECUTION OBJECT

	// Initialize runTask function
	const { runTask } = require('./lib/task-runner')({
		xmlRefiningFacilitator,
		xmlGeneratingingFacilitator,
	});

	// ===========================================================================
	// CHECK INPUT FILES AND PREPARE FOR PROCESSING

	// Check if spreadsheet exists
	if (!fs.existsSync(spreadsheetPath)) {
		xLog.error(`No specifications found. ${spreadsheetPath} does not exist`);
		process.exit(1);
	}

	// ===========================================================================
	// EXECUTE THE PROCESS FOR SOME OR ALL OF THE POSSIBLE ELEMENTS

	const executeProcess = async ({
		performance,
		xlsx,
		spreadsheetPath,
		xLog,
		targetObjectNameList,
		runTask,
		outputFilePath,
		commandLineParameters,
	}) => {
		const startTime = performance.now();
		const workbook = xlsx.readFile(spreadsheetPath);
		const worksheetNames = workbook.SheetNames;
		xLog.status(`Using data model spec file: ${spreadsheetPath}`);
		
		if (commandLineParameters.switches.listElements) {
			xLog.status(worksheetNames.join('\n'));
			process.exit();
		}

		for (let index = 0; index < worksheetNames.length; index++) {
			const name = worksheetNames[index];

			if (!targetObjectNameList.includes(name)) {
				continue;
			}
			
			xLog.status(`Found element definition for ${name}`);
			
			const sheet = workbook.Sheets[name];
			const elementSpecWorksheet = xlsx.utils.sheet_to_json(sheet);
			const elementSpecWorksheetJson = JSON.stringify(
				elementSpecWorksheet,
				'',
				'\t',
			);

			await runTask({
				outputFilePath,
				elementSpecWorksheetJson,
			})();
		}

		const endTime = performance.now();
		const duration = ((endTime - startTime) / 1000).toFixed(2);

		xLog.debug(`Processing time: ${duration} seconds`);
	};
	const executionDependencies = {
		performance,
		xlsx,
		spreadsheetPath,
		xLog,
		targetObjectNameList,
		runTask,
		outputFilePath,
		commandLineParameters,
	};
	if (commandLineParameters.switches.showParseErrors) {
		executeProcess(executionDependencies);
	} else {
		try {
			await executeProcess(executionDependencies);
		} catch (error) {
			xLog.error(`Error: ${error.message} [${moduleName}]`);
			if (commandLineParameters.switches.debug) {
				console.trace();
			}
			process.exit(1);
		}
	}
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
	callback: moduleFunction,
});
