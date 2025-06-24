#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

const qt = require('qtools-functional-library'); //also exposes qtLog(); qt.help({printOutput:true, queryString:'.*', sendJson:false});

const os = require('os');
const path = require('path');
const fs = require('fs');

const { pipeRunner, taskListPlus, mergeArgs, forwardArgs } = new require(
	'qtools-asynchronous-pipe-plus',
)();

//START OF moduleFunction() ============================================================
const moduleFunction =
	({ moduleName } = {}) =>
	({ unused }, callback) => {
		const { xLog, getConfig, rawConfig, commandLineParameters } =
			process.global;
		const {
			databaseFileName,
			databaseContainerDirPath,
			databaseTypeName,
			syncDataSourceName,
		} = getConfig(moduleName); //moduleName is closure
		

		const { pwHash } = require('./lib/password-hash')();
		

		const taskList = new taskListPlus();

		// --------------------------------------------------------------------------------
		// TASKLIST ITEM TEMPLATE

		taskList.push((args, next) => {
			const { previousValue } = args;
			

			let sqlDbGen = require(`./lib/${databaseTypeName}`)({ getConfig }); //not visible to the rest of the system, hence, ./lib
			let syncDataGen = require(`./lib/${syncDataSourceName}`)({ getConfig }); //not visible to the rest of the system, hence, ./lib
			let dataMapping = require(`./data-mapping`)({});
			

			next('', { ...args, sqlDbGen, dataMapping, syncDataGen });
		});

		// --------------------------------------------------------------------------------
		// TASKLIST ITEM TEMPLATE

		taskList.push((args, next) => {
			const { sqlDbGen, databaseFileName, dataModelLogInfoList } = args;

			const localCallback = (databaseFilePath) => (err, sqlDb) => {
				dataModelLogInfoList.push(`Database File Path: ${databaseFilePath}`);
				next('', { ...args, sqlDb, dataModelLogInfoList });
			};

			const dbFileName = databaseFileName;
			const databaseFilePath = path.join(databaseContainerDirPath, dbFileName);
			fs.mkdirSync(databaseContainerDirPath, { recursive: true });

			sqlDbGen.initDatabaseInstance(
				databaseFilePath,
				localCallback(databaseFilePath),
			);
		});
		

		// --------------------------------------------------------------------------------
		// TASKLIST ITEM TEMPLATE

		taskList.push((args, next) => {
			const { dataModelLogInfoList, syncDataGen } = args;
			

			const localCallback = (err, { hxcLogInfoList, hxAccess }) => {
				dataModelLogInfoList.push(...hxcLogInfoList);
				next(err, { ...args, dataModelLogInfoList, hxAccess });
			};

			syncDataGen.hxInit({}, localCallback);
		});
		

		// --------------------------------------------------------------------------------
		// TASKLIST ITEM TEMPLATE

// 		taskList.push((args, next) => {
// 			const { dataModelLogInfoList, hxAccess } = args;
// 			
// 
// 			const localCallback = (err, result) => {
// 				console.log(
// 					`\n=-=============   result  ========================= [data-model.js.]\n`,
// 				);
// 
// 				console.dir(
// 					{ ['result']: result.length },
// 					{ showHidden: false, depth: 4, colors: true },
// 				);
// 
// 				console.log(
// 					`\n=-=============   result  ========================= [data-model.js.]\n`,
// 				);
// 
// 				next(err, { ...args, result });
// 			};
// 
// 			hxAccess.hxGet({ endpointName: 'WorkOrders' }, localCallback);
// 		});
		

		// --------------------------------------------------------------------------------
		// TASKLIST ITEM TEMPLATE

		taskList.push((args, next) => {
			const localCallback = (err, accessPointsDotD) => {
				if (err) {
console.log(`\n=-=============   err  ========================= [data-model.js.]\n`);


console.dir({['err']:err}, { showHidden: false, depth: 4, colors: true });
console.trace();
console.log(`\n=-=============   err  ========================= [data-model.js.]\n`);


					next(err, args); //next('skipRestOfPipe', args);
					return;
				}

				next('', { ...args, accessPointsDotD });
			};

			require('./access-points-dot-d')(
				args.qtSelectProperties(['sqlDb', 'hxAccess', 'syncData', 'dataMapping']),
				localCallback,
			);
		});

		// --------------------------------------------------------------------------------
		// INIT AND EXECUTE THE PIPELINE

		const initialData = {
			databaseFileName,
			databaseContainerDirPath,
			databaseTypeName,
			dataModelLogInfoList: [],
		};
		pipeRunner(taskList.getList(), initialData, (err, args) => {
			const { endpointsDotD, accessPointsDotD, dataModelLogInfoList } = args;
			callback(err, { accessPointsDotD, dataModelLogInfoList });
		});
	};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction({ moduleName });

