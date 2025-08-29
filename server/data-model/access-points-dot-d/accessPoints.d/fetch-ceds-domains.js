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
		// TASK: Get CEDS_RDF_UI_SUPPORT_INDEX table reference

		taskList.push((args, next) => {
			const { sqlDb } = args;
			sqlDb.getTable('CEDS_RDF_UI_SUPPORT_INDEX', mergeArgs(args, next, 'entityTable'));
		});

		// --------------------------------------------------------------------------------
		// TASK: Query database for CEDS domains with class counts

		taskList.push((args, next) => {
			const { entityTable } = args;

			const localCallback = (err, rawResult = []) => {
				if (err) {
					next(err);
					return;
				}

				// Map the raw results to domain objects
				const domainsData = rawResult.map(row => ({
					refId: row.refId,
					domainCode: row.code,
					domainName: row.label,
					description: row.notation || '',
					displayOrder: row.displayOrder || 0,
					classCount: row.classCount || 0
				}));
				
				next('', { ...args, domainsData });
			};

			const query = `
				SELECT DISTINCT
					d.refId,
					d.code,
					d.label,
					d.notation,
					d.displayOrder,
					(SELECT COUNT(*) FROM <!tableName!> c 
					 WHERE c.entityType = 'class' 
					 AND c.domainRefId = d.refId) as classCount
				FROM <!tableName!> d
				WHERE d.entityType = 'domain'
				ORDER BY d.displayOrder, d.label
			`;
			
			entityTable.getData(
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