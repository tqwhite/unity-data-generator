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
		const { domainRefId, functionalAreaRefId, classRefId } = data;

		// Validate required parameters
		if (!domainRefId && !classRefId) {
			callback('domainRefId or classRefId is required');
			return;
		}

		// --------------------------------------------------------------------------------
		// TASK: Get CEDS_Classes table reference

		taskList.push((args, next) => {
			const { sqlDb } = args;
			sqlDb.getTable('CEDS_Classes', mergeArgs(args, next, 'classesTable'));
		});

		// --------------------------------------------------------------------------------
		// TASK: Query database for classes by category

		taskList.push((args, next) => {
			const { classesTable, dataMapping, domainRefId, functionalAreaRefId, classRefId } = args;
			const classesMapper = dataMapping['ceds-classes-by-category'];

			const localCallback = (err, rawResult = []) => {
				if (err) {
					next(err);
					return;
				}

				const classesData = classesMapper.map(rawResult);
				next('', { ...args, classesData });
			};

			// Determine which query to use
			let queryName;
			let queryParams = {};
			
			if (classRefId) {
				queryName = 'getOne';
				queryParams = { refId: classRefId };
			} else if (functionalAreaRefId) {
				queryName = 'byDomainAndArea';
				queryParams = { domainRefId, functionalAreaRefId };
			} else {
				queryName = 'byDomain';
				queryParams = { domainRefId };
			}
			
			const query = classesMapper.getSql(queryName, queryParams);
			
			classesTable.getData(
				query,
				{ suppressStatementLog: true, noTableNameOk: true },
				localCallback
			);
		});

		// --------------------------------------------------------------------------------
		// TASK: Fetch properties for each class (if requested)

		taskList.push((args, next) => {
			const { classesData, includeProperties } = args;
			
			// Skip if properties not requested
			if (!includeProperties) {
				next('', args);
				return;
			}

			// Get properties table
			args.sqlDb.getTable('CEDS_Properties', (err, propertiesTable) => {
				if (err) {
					// Properties table might not exist, continue without properties
					next('', args);
					return;
				}

				// For each class, fetch its properties
				let completedCount = 0;
				const totalCount = classesData.length;

				if (totalCount === 0) {
					next('', args);
					return;
				}

				classesData.forEach((classObj, index) => {
					const query = `SELECT * FROM CEDS_Properties WHERE CEDS_ClassesRefId = '${classObj.refId}'`;
					
					propertiesTable.getData(
						query,
						{ suppressStatementLog: true, noTableNameOk: true },
						(err, properties) => {
							if (!err && properties) {
								classesData[index].properties = properties;
							} else {
								classesData[index].properties = [];
							}

							completedCount++;
							if (completedCount === totalCount) {
								next('', args);
							}
						}
					);
				});
			});
		});

		// --------------------------------------------------------------------------------
		// INIT AND EXECUTE THE PIPELINE

		const initialData = { sqlDb, mapper, dataMapping, ...data };
		pipeRunner(taskList.getList(), initialData, (err, args) => {
			if (err) {
				xLog.error(`fetch-ceds-classes-by-category FAILED: ${err} (${moduleName}.js)`);
				callback(err);
				return;
			}

			// Return single object if fetching by ID, array otherwise
			const result = args.classRefId && args.classesData.length > 0
				? args.classesData[0]
				: args.classesData || [];
				
			callback('', result);
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

	const name = 'fetch-ceds-classes-by-category';
	addEndpoint({ name, serviceFunction, dotD });

	// ================================================================================
	// RETURN EMPTY OBJECT (required pattern)

	return {};
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;