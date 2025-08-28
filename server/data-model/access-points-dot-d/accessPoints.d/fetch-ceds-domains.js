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

		// --------------------------------------------------------------------------------
		// TASK: Get CEDS_Domains table reference

		taskList.push((args, next) => {
			const { sqlDb } = args;
			sqlDb.getTable('CEDS_Domains', mergeArgs(args, next, 'domainsTable'));
		});

		// --------------------------------------------------------------------------------
		// TASK: Query database for CEDS domains with class counts

		taskList.push((args, next) => {
			const { domainsTable, dataMapping } = args;
			const domainsMapper = dataMapping['ceds-domains'];

			const localCallback = (err, rawResult = []) => {
				if (err) {
					next(err);
					return;
				}

				const domainsData = domainsMapper.map(rawResult);
				next('', { ...args, domainsData });
			};

			const query = domainsMapper.getSql('default');
			domainsTable.getData(
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
				xLog.error(`fetch-ceds-domains FAILED: ${err} (${moduleName}.js)`);
				callback(err);
				return;
			}

			callback('', args.domainsData || []);
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

	const name = 'fetch-ceds-domains';
	addEndpoint({ name, serviceFunction, dotD });

	// ================================================================================
	// RETURN EMPTY OBJECT (required pattern)

	return {};
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;