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

	const serviceFunction = (refId, callback) => {
		const taskList = new taskListPlus();

		// --------------------------------------------------------------------------------
		// TASK: Query database for CEDS element by refId

		taskList.push((args, next) => {
			const { sqlDb, mapper, refId } = args;

			if (!refId) {
				next('Missing refId parameter');
				return;
			}

			args.sqlDb.getTable('_CEDSElements', mergeArgs(args, next, 'cedsTable'));
		});

		taskList.push((args, next) => {
			const { cedsTable, dataMapping, refId } = args;
			const cedsMapper = dataMapping['ceds-elements'];

			const localCallback = (err, rawResult = []) => {
				if (err) {
					next(err);
					return;
				}

				if (!rawResult.length) {
					next(`CEDS element with refId ${refId} not found`);
					return;
				}

				// Map the result
				const element = cedsMapper.map(rawResult[0]);

				next('', { ...args, element });
			};

			const query = `SELECT *, GlobalID as refId FROM <!tableName!> WHERE GlobalID = '${refId}'`;
			cedsTable.getData(query, { suppressStatementLog: false }, localCallback);
		});

		// --------------------------------------------------------------------------------
		// INIT AND EXECUTE THE PIPELINE

		const initialData = { sqlDb, mapper, dataMapping, refId };
		pipeRunner(taskList.getList(), initialData, (err, args) => {
			if (err) {
				xLog.error(
					`ceds-fetch-data FAILED: ${err} (${moduleName}.js)`,
				);
				callback(err);
				return;
			}

			callback('', args.element);
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

	const name = 'ceds-fetch-data';

	addEndpoint({ name, serviceFunction, dotD });

	return {};
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;