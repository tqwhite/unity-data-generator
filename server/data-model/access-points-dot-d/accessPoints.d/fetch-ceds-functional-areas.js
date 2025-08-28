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

	const serviceFunction = (data = {}, callback) => {
		const taskList = new taskListPlus();
		const { domainRefId } = data;

		// --------------------------------------------------------------------------------
		// TASK: Get CEDS_FunctionalAreas table reference

		taskList.push((args, next) => {
			const { sqlDb } = args;
			sqlDb.getTable('CEDS_FunctionalAreas', mergeArgs(args, next, 'areasTable'));
		});

		// --------------------------------------------------------------------------------
		// TASK: Query database for functional areas

		taskList.push((args, next) => {
			const { areasTable, dataMapping, domainRefId } = args;
			const areasMapper = dataMapping['ceds-functional-areas'];

			const localCallback = (err, rawResult = []) => {
				if (err) {
					next(err);
					return;
				}

				const areasData = areasMapper.map(rawResult);
				next('', { ...args, areasData });
			};

			// Use byDomain query if domainRefId provided, otherwise get all
			const queryName = domainRefId ? 'byDomain' : 'default';
			const query = areasMapper.getSql(queryName, { domainRefId });
			
			areasTable.getData(
				query,
				{ suppressStatementLog: true, noTableNameOk: true },
				localCallback
			);
		});

		// --------------------------------------------------------------------------------
		// INIT AND EXECUTE THE PIPELINE

		const initialData = { sqlDb, mapper, dataMapping, ...data };
		pipeRunner(taskList.getList(), initialData, (err, args) => {
			if (err) {
				xLog.error(`fetch-ceds-functional-areas FAILED: ${err} (${moduleName}.js)`);
				callback(err);
				return;
			}

			callback('', args.areasData || []);
		});
	};

	// ================================================================================
	// Access Point Constructor

	const addEndpoint = ({ name, serviceFunction, dotD }) => {
		dotD.logList.push(name);
		dotD.library.add(name, serviceFunction);
	};

	// ================================================================================
	// ENDPOINT REGISTRATION

	const name = 'fetch-ceds-functional-areas';
	addEndpoint({ name, serviceFunction, dotD });

	// ================================================================================
	// RETURN EMPTY OBJECT (required pattern)

	return {};
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;