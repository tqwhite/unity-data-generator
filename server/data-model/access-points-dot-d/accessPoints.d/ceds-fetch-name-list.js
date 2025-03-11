#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const qt = require('qtools-functional-library');
const { pipeRunner, taskListPlus, mergeArgs, forwardArgs } = new require(
	'qtools-asynchronous-pipe-plus',
)();

//START OF moduleFunction() ============================================================

const moduleFunction = function ({ dotD, passThroughParameters }) {
	// ================================================================================
	// INITIALIZATION

	const { xLog, getConfig, rawConfig, commandLineParameters } = process.global;
	const localConfig = getConfig(moduleName); //moduleName is closure

	const { sqlDb, mapper, dataMapping } = passThroughParameters;

	// ================================================================================
	// SERVICE FUNCTION

	const serviceFunction = (callback) => {
		const taskList = new taskListPlus();

		// --------------------------------------------------------------------------------
		// TASK: Query database for CEDS element names

		taskList.push((args, next) => {
			const { sqlDb, dataMapping } = args;

			args.sqlDb.getTable('_CEDSElements', mergeArgs(args, next, 'cedsTable'));
		});

		taskList.push((args, next) => {
			const { cedsTable } = args;
			const cedsMapper = dataMapping['ceds-schema-main'];

			const localCallback = (err, rawResult = []) => {
				if (err) {
					next(err);
					return;
				}

				
				const nameList = cedsMapper.map(rawResult);

				next('', { ...args, nameList, cedsMapper });
			};

			const query = cedsMapper.getSql('nameList', args);
			cedsTable.getData(query, { suppressStatementLog: true, noTableNameOk:true }, localCallback);
		});

		// --------------------------------------------------------------------------------
		// INIT AND EXECUTE THE PIPELINE

		const initialData = { sqlDb, mapper, dataMapping };
		pipeRunner(taskList.getList(), initialData, (err, args) => {
			if (err) {
				xLog.error(
					`ceds-fetch-name-list FAILED: ${err} (${moduleName}.js)`,
				);
				callback(err);
				return;
			}

			callback('', args.nameList || []);
		});
	};

	// ================================================================================
	// Access Point Constructor

	const addEndpoint = ({ name, serviceFunction, dotD }) => {
		dotD.logList.push(name);
		dotD.library.add(name, serviceFunction);
	};

	// ================================================================================
	// Do the constructing

	const name = 'ceds-fetch-name-list';

	addEndpoint({ name, serviceFunction, dotD });

	return {};
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;