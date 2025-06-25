#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot
//const projectRoot=fs.realpathSync(path.join(__dirname, '..', '..')); // adjust the number of '..' to fit reality


const qt = require('qtools-functional-library'); //qt.help({printOutput:true, queryString:'.*', sendJson:false});
const asynchronousPipePlus = new require('qtools-asynchronous-pipe-plus')();
const pipeRunner = asynchronousPipePlus.pipeRunner;
const taskListPlus = asynchronousPipePlus.taskListPlus;

const xlsx = require('xlsx');
const fs=require('fs');

//START OF moduleFunction() ============================================================

const moduleFunction = function (args = {}) {
	const { xLog, getConfig, commandLineParameters } = process.global;

	const { spreadsheetPath } = getConfig(moduleName); //ignoring thinker specs included in args
	
	let targetObjectName = commandLineParameters.qtGetSurePath('values.elements', []).qtLast();
	targetObjectName=targetObjectName?targetObjectName:commandLineParameters.qtGetSurePath('fileList', []).qtLast();

	// ================================================================================
	// UTILITIES
	

	

	// ================================================================================
	// ================================================================================
	// DO THE JOB

	const executeRequest = (args, callback) => {
		const { UNUSED } = args;
		const taskList = new taskListPlus();
		

		// --------------------------------------------------------------------------------
		// TASKLIST ITEM TEMPLATE

		taskList.push((args, next) => {
			const { spreadsheetPath } = args;
		
			if (!fs.existsSync(spreadsheetPath)) {
				xLog.error(`No specifications found. ${spreadsheetPath} does not exist`);
				throw `No specifications found. ${spreadsheetPath} does not exist`;
			}
			
			xLog.status(`Found specification data ${spreadsheetPath}`);

			const workbook = xlsx.readFile(spreadsheetPath);
			const worksheetNames = workbook.SheetNames;

			if (commandLineParameters.switches.listElements) {
				xLog.status(worksheetNames.join('\n'));
				process.exit();
			}
			
			commandLineParameters.switches.showElements && xLog.status(`Spreadsheet elements: ${worksheetNames.join(', ').replace(/, $/)}`);
			
			let elementSpecWorksheetJson;
			for (let index = 0; index < worksheetNames.length; index++) {
				const name = worksheetNames[index];

				if (targetObjectName!=name) {
					continue;
				}

				xLog.status(`Found element definition for ${name}`);

				const sheet = workbook.Sheets[name];
				const elementSpecWorksheet = xlsx.utils.sheet_to_json(sheet);
				elementSpecWorksheetJson = JSON.stringify(
					elementSpecWorksheet,
					'',
					'\t',
				);
			}
			
			if (!elementSpecWorksheetJson){
				xLog.error(`MISSING ELEMENT '${targetObjectName}' was not found in specification data source`);
				throw `MISSING ELEMENT '${targetObjectName}' was not found in specification data source`;
				//next(`MISSING ELEMENT '${targetObjectName}' was not found in specification data source`, { ...args, wisdom:{elementSpecWorksheetJson} });
				//return;
			}

			next('', { ...args, wisdom:{elementSpecWorksheetJson} });
		});

		// --------------------------------------------------------------------------------
		// INIT AND EXECUTE THE PIPELINE

		const initialData = {
			...args,
			spreadsheetPath
		};
		pipeRunner(taskList.getList(), initialData, (err, args) => {
			const { wisdom } = args;
			callback(err, { wisdom, args });
		});
	};

	return { executeRequest };
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;
//module.exports = new moduleFunction();
//moduleFunction().workingFunction().qtDump();

