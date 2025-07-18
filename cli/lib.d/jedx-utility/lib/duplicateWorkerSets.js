#!/usr/bin/env node
'use strict';
// Suppress punycode deprecation warning
process.noDeprecation = true;

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

const qt = require('qtools-functional-library'); //also exposes qtLog(); qt.help({printOutput:true, queryString:'.*', sendJson:false});

const os = require('os');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

console.log(`HELLO FROM ${__dirname}/${moduleName}`);

//START OF moduleFunction() ============================================================
const moduleFunction = ({ moduleName } = {}) => ({ unused } = {}) => {
	const { xLog, getConfig, rawConfig, commandLineParameters, projectRoot } = process.global;
	const localConfig = getConfig(moduleName); //moduleName is closure

	// =====================================================================
	// MAIN EXECUTION FUNCTION
	// =====================================================================

	const execute = ({ count, addToDupeSet }) => {
		xLog.status(`duplicateWorkerSets starting with count=${count}, addToDupeSet=${addToDupeSet}`);
		
		// Get the target directory from command line or use default
		const targetDir = commandLineParameters.qtGetSurePath('values.dir.0', 
			'/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/outputFiles/JEDX_Thought_Process_5477');
		
		try {
			// ---------------------------------------------------------------------
			// 1. Analyze existing files and determine starting point
			const { startingNumber, templateSet } = analyzeExistingFiles(targetDir, addToDupeSet);
			
			// ---------------------------------------------------------------------
			// 2. Generate duplicates
			generateDuplicates(targetDir, templateSet, startingNumber, count);
			
			xLog.result(`Successfully created ${count} duplicate worker sets starting from ${startingNumber}`);
			return { success: true, count, startingNumber };
			
		} catch (error) {
			xLog.error(`Error in duplicateWorkerSets: ${error.message}`);
			return { success: false, error: error.message };
		}
	};

	// =====================================================================
	// FILE ANALYSIS FUNCTIONS
	// =====================================================================

	// ---------------------------------------------------------------------
	// analyzeExistingFiles - Check for existing duplicates and determine starting point
	
	const analyzeExistingFiles = (targetDir, addToDupeSet) => {
		const files = fs.readdirSync(targetDir);
		
		// Look for numbered worker files
		const workerFiles = files.filter(f => /^worker_\d+\.json$/.test(f));
		const compensationFiles = files.filter(f => /^worker_compensation_report_\d+\.json$/.test(f));
		const hoursFiles = files.filter(f => /^worker_paid_hours_report_\d+\.json$/.test(f));
		
		// Check for unnumbered duplicates
		const unnumberedDuplicates = files.filter(f => 
			f.startsWith('worker_') && f.endsWith('.json') && !/^worker_\d+\.json$/.test(f) && f !== 'worker.json'
		);
		
		if (workerFiles.length > 0 || compensationFiles.length > 0 || hoursFiles.length > 0 || unnumberedDuplicates.length > 0) {
			if (!addToDupeSet) {
				throw new Error('Duplicate files found. Use -addToDupeSet flag to add to existing duplicate set.');
			}
			
			// Find the highest numbered set
			if (workerFiles.length > 0) {
				const numbers = workerFiles.map(f => parseInt(f.match(/worker_(\d+)\.json/)[1]));
				const maxNumber = Math.max(...numbers);
				const templateSet = loadTemplateSet(targetDir, maxNumber);
				return { startingNumber: maxNumber + 1, templateSet };
			}
			
			// Handle unnumbered duplicates
			if (unnumberedDuplicates.length > 0) {
				const templateSet = findCompleteUnnumberedSet(targetDir);
				return { startingNumber: 2, templateSet };
			}
		}
		
		// No duplicates found, use original files as template
		const templateSet = loadOriginalTemplateSet(targetDir);
		return { startingNumber: 2, templateSet };
	};

	// ---------------------------------------------------------------------
	// loadTemplateSet - Load a numbered template set
	
	const loadTemplateSet = (targetDir, number) => {
		const workerPath = path.join(targetDir, `worker_${number}.json`);
		const compensationPath = path.join(targetDir, `worker_compensation_report_${number}.json`);
		const hoursPath = path.join(targetDir, `worker_paid_hours_report_${number}.json`);
		
		if (!fs.existsSync(workerPath) || !fs.existsSync(compensationPath) || !fs.existsSync(hoursPath)) {
			throw new Error(`Incomplete template set for number ${number}`);
		}
		
		return {
			worker: JSON.parse(fs.readFileSync(workerPath, 'utf8')),
			compensation: JSON.parse(fs.readFileSync(compensationPath, 'utf8')),
			hours: JSON.parse(fs.readFileSync(hoursPath, 'utf8'))
		};
	};

	// ---------------------------------------------------------------------
	// loadOriginalTemplateSet - Load original files as template
	
	const loadOriginalTemplateSet = (targetDir) => {
		const workerPath = path.join(targetDir, 'worker.json');
		const compensationPath = path.join(targetDir, 'worker_compensation_report.json');
		const hoursPath = path.join(targetDir, 'worker_paid_hours_report.json');
		
		if (!fs.existsSync(workerPath) || !fs.existsSync(compensationPath) || !fs.existsSync(hoursPath)) {
			throw new Error('Original template files not found');
		}
		
		return {
			worker: JSON.parse(fs.readFileSync(workerPath, 'utf8')),
			compensation: JSON.parse(fs.readFileSync(compensationPath, 'utf8')),
			hours: JSON.parse(fs.readFileSync(hoursPath, 'utf8'))
		};
	};

	// ---------------------------------------------------------------------
	// findCompleteUnnumberedSet - Find a complete set from unnumbered duplicates
	
	const findCompleteUnnumberedSet = (targetDir) => {
		// This is a simplified version - in practice, you'd analyze refId relationships
		// For now, assume we can find worker_copy.json, worker_compensation_report_copy.json, etc.
		const files = fs.readdirSync(targetDir);
		const workerDupes = files.filter(f => f.startsWith('worker_') && f.endsWith('.json') && f !== 'worker.json');
		
		if (workerDupes.length > 0) {
			// Use the first one we find and look for matching reports
			const baseName = workerDupes[0].replace('.json', '');
			const suffix = baseName.replace('worker_', '');
			
			const compensationFile = `worker_compensation_report_${suffix}.json`;
			const hoursFile = `worker_paid_hours_report_${suffix}.json`;
			
			if (files.includes(compensationFile) && files.includes(hoursFile)) {
				return {
					worker: JSON.parse(fs.readFileSync(path.join(targetDir, workerDupes[0]), 'utf8')),
					compensation: JSON.parse(fs.readFileSync(path.join(targetDir, compensationFile), 'utf8')),
					hours: JSON.parse(fs.readFileSync(path.join(targetDir, hoursFile), 'utf8'))
				};
			}
		}
		
		// Fallback to original files
		return loadOriginalTemplateSet(targetDir);
	};

	// =====================================================================
	// DUPLICATION FUNCTIONS
	// =====================================================================

	// ---------------------------------------------------------------------
	// generateDuplicates - Create the duplicate worker sets
	
	const generateDuplicates = (targetDir, templateSet, startingNumber, count) => {
		for (let i = 0; i < count; i++) {
			const currentNumber = startingNumber + i;
			
			// Create deep copies using JSON parse/stringify (avoiding broken qtClone)
			const newWorker = JSON.parse(JSON.stringify(templateSet.worker));
			const newCompensation = JSON.parse(JSON.stringify(templateSet.compensation));
			const newHours = JSON.parse(JSON.stringify(templateSet.hours));
			
			// Generate new RefIds
			const newWorkerRefId = uuidv4();
			const newCompensationRefId = uuidv4();
			const newHoursRefId = uuidv4();
			
			// Update worker
			newWorker.worker.RefId = newWorkerRefId;
			
			// Update firstName with number suffix
			const originalFirstName = newWorker.worker.qtGetSurePath('name.firstName', 'Worker');
			const baseFirstName = originalFirstName.replace(/\d+$/, ''); // Remove existing number
			newWorker.worker.name.firstName = `${baseFirstName}${currentNumber}`;
			
			// Update compensation report
			newCompensation.worker_compensation_report.RefId = newCompensationRefId;
			newCompensation.worker_compensation_report.workerRefId = newWorkerRefId;
			
			// Update hours report
			newHours.worker_paid_hours_report.RefId = newHoursRefId;
			newHours.worker_paid_hours_report.workerRefId = newWorkerRefId;
			
			// Write files
			fs.writeFileSync(
				path.join(targetDir, `worker_${currentNumber}.json`),
				JSON.stringify(newWorker, null, '\t')
			);
			
			fs.writeFileSync(
				path.join(targetDir, `worker_compensation_report_${currentNumber}.json`),
				JSON.stringify(newCompensation, null, '\t')
			);
			
			fs.writeFileSync(
				path.join(targetDir, `worker_paid_hours_report_${currentNumber}.json`),
				JSON.stringify(newHours, null, '\t')
			);
			
			xLog.status(`Created worker set ${currentNumber}`);
		}
	};

	xLog.status(`${moduleName} is initialized`);
	return { execute };
};

//END OF moduleFunction() ============================================================

const partOfSystem = true;
if (partOfSystem) {
	module.exports = moduleFunction({ moduleName }); //returns initialized moduleFunction
} else {
	// find project root
	const findProjectRoot=({rootFolderName='system', closest=true}={})=>__dirname.replace(new RegExp(`^(.*${closest?'':'?'}\/${rootFolderName}).*$`), "$1");
	const projectRoot=findProjectRoot(); // call with {closest:false} if there are nested rootFolderName directories and you want the top level one
	
	// prettier-ignore
	{
	process.global = {};
	process.global.xLog = fs.existsSync('./lib/x-log')?require('./lib/x-log'):{ status: console.log, error: console.error, result: console.log };
	process.global.getConfig=typeof(getConfig)!='undefined' ? getConfig : (moduleName => ({[moduleName]:`no configuration data for ${moduleName}`}[moduleName]));
	process.global.commandLineParameters=typeof(commandLineParameters)!='undefined'?commandLineParameters:undefined;;
	process.global.projectRoot=projectRoot;
	process.global.rawConfig={}; //this should only be used for debugging, use getConfig(moduleName)
	}
	console.log(
		`running as standalone, WARNING: overwrites xLog() if this branch runs in a sustem`
	);
	module.exports = moduleFunction({ moduleName })({}); //runs it right now
}