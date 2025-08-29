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
	// SERVICE FUNCTION - fetchAllEntities

	const fetchAllEntities = (data = {}, callback) => {
		const taskList = new taskListPlus();

		// --------------------------------------------------------------------------------
		// TASK: Get CEDS_RDF_UI_SUPPORT_INDEX table reference

		taskList.push((args, next) => {
			const { sqlDb } = args;
			sqlDb.getTable('CEDS_RDF_UI_SUPPORT_INDEX', mergeArgs(args, next, 'entityTable'));
		});

		// --------------------------------------------------------------------------------
		// TASK: Query database for all entities

		taskList.push((args, next) => {
			const { entityTable, dataMapping } = args;
			const entityMapper = dataMapping['ceds-entity-lookup'];

			const localCallback = (err, rawResult = []) => {
				if (err) {
					next(err);
					return;
				}

				const entitiesData = entityMapper.map(rawResult);
				next('', { ...args, entitiesData });
			};

			const query = entityMapper.getSql('getAllEntities');
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
				xLog.error(`fetchAllEntities FAILED: ${err} (${moduleName}.js)`);
				callback(err);
				return;
			}

			callback('', args.entitiesData || []);
		});
	};

	// ================================================================================
	// SERVICE FUNCTION - fetchEntitiesByDomain

	const fetchEntitiesByDomain = (data = {}, callback) => {
		const { domainRefId } = data;
		
		if (!domainRefId) {
			callback('domainRefId is required');
			return;
		}

		const taskList = new taskListPlus();

		// --------------------------------------------------------------------------------
		// TASK: Get CEDS_RDF_UI_SUPPORT_INDEX table reference

		taskList.push((args, next) => {
			const { sqlDb } = args;
			sqlDb.getTable('CEDS_RDF_UI_SUPPORT_INDEX', mergeArgs(args, next, 'entityTable'));
		});

		// --------------------------------------------------------------------------------
		// TASK: Query database for entities by domain

		taskList.push((args, next) => {
			const { entityTable, dataMapping, domainRefId } = args;
			const entityMapper = dataMapping['ceds-entity-lookup'];

			const localCallback = (err, rawResult = []) => {
				if (err) {
					next(err);
					return;
				}

				const entitiesData = entityMapper.map(rawResult);
				next('', { ...args, entitiesData });
			};

			const query = entityMapper.getSql('getByDomain', { domainRefId });
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
				xLog.error(`fetchEntitiesByDomain FAILED: ${err} (${moduleName}.js)`);
				callback(err);
				return;
			}

			callback('', args.entitiesData || []);
		});
	};

	// ================================================================================
	// SERVICE FUNCTION - fetchEntityDetails

	const fetchEntityDetails = (data = {}, callback) => {
		const { refId } = data;
		
		if (!refId) {
			callback('refId is required');
			return;
		}

		const taskList = new taskListPlus();

		// --------------------------------------------------------------------------------
		// TASK: Get CEDS_RDF_UI_SUPPORT_INDEX table reference

		taskList.push((args, next) => {
			const { sqlDb } = args;
			sqlDb.getTable('CEDS_RDF_UI_SUPPORT_INDEX', mergeArgs(args, next, 'entityTable'));
		});

		// --------------------------------------------------------------------------------
		// TASK: Query database for entity details

		taskList.push((args, next) => {
			const { entityTable, dataMapping, refId } = args;
			const entityMapper = dataMapping['ceds-entity-lookup'];

			const localCallback = (err, rawResult = []) => {
				if (err) {
					next(err);
					return;
				}

				const entityData = entityMapper.map(rawResult);
				// Return single object for single entity, not array
				const result = entityData.length > 0 ? entityData[0] : null;
				next('', { ...args, entityData: result });
			};

			const query = entityMapper.getSql('getEntityDetails', { refId });
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
				xLog.error(`fetchEntityDetails FAILED: ${err} (${moduleName}.js)`);
				callback(err);
				return;
			}

			callback('', args.entityData);
		});
	};

	// ================================================================================
	// SERVICE FUNCTION - fetchFunctionalAreasByDomain

	const fetchFunctionalAreasByDomain = (data = {}, callback) => {
		const { domainRefId } = data;
		
		if (!domainRefId) {
			callback('domainRefId is required');
			return;
		}

		const taskList = new taskListPlus();

		// --------------------------------------------------------------------------------
		// TASK: Get CEDS_RDF_UI_SUPPORT_INDEX table reference

		taskList.push((args, next) => {
			const { sqlDb } = args;
			sqlDb.getTable('CEDS_RDF_UI_SUPPORT_INDEX', mergeArgs(args, next, 'entityTable'));
		});

		// --------------------------------------------------------------------------------
		// TASK: Query database for functional areas with counts

		taskList.push((args, next) => {
			const { entityTable, dataMapping, domainRefId } = args;
			const entityMapper = dataMapping['ceds-entity-lookup'];

			const localCallback = (err, rawResult = []) => {
				if (err) {
					next(err);
					return;
				}

				// Map and ensure count is a number
				const functionalAreas = rawResult.map(fa => ({
					...fa,
					count: parseInt(fa.count, 10) || 0
				}));
				
				next('', { ...args, functionalAreas });
			};

			const query = entityMapper.getSql('getFunctionalAreas', { domainRefId });
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
				xLog.error(`fetchFunctionalAreasByDomain FAILED: ${err} (${moduleName}.js)`);
				callback(err);
				return;
			}

			callback('', args.functionalAreas || []);
		});
	};

	// ================================================================================
	// SERVICE FUNCTION - fetchFullClassDetails

	const fetchFullClassDetails = (data = {}, callback) => {
		const taskList = new taskListPlus();
		const { refId } = data;

		if (!refId) {
			callback('refId is required');
			return;
		}

		// Get the class details from CEDS_Classes
		taskList.push((args, next) => {
			const { sqlDb } = args;
			sqlDb.getTable('CEDS_Classes', mergeArgs(args, next, 'classesTable'));
		});

		taskList.push((args, next) => {
			const { classesTable, refId } = args;
			
			const query = `SELECT * FROM <!tableName!> WHERE refId = '${refId}' OR name = '${refId}'`;
			
			classesTable.getData(
				query,
				{ suppressStatementLog: true, noTableNameOk: true },
				(err, result) => {
					if (err || !result || result.length === 0) {
						next(err || 'Class not found', args);
						return;
					}
					next(err, { ...args, classData: result[0] });
				}
			);
		});

		// Get properties table reference
		taskList.push((args, next) => {
			const { sqlDb } = args;
			sqlDb.getTable('CEDS_Properties', mergeArgs(args, next, 'propertiesTable'));
		});

		// Get properties where this class is domain
		taskList.push((args, next) => {
			const { propertiesTable, classData } = args;
			
			const query = `SELECT * FROM <!tableName!> WHERE CEDS_ClassesRefId = '${classData.refId}'`;
			
			propertiesTable.getData(
				query,
				{ suppressStatementLog: true, noTableNameOk: true },
				(err, result) => {
					if (err) {
						next(err, args);
						return;
					}
					next(err, { ...args, properties: result || [] });
				}
			);
		});

		// Get incoming properties (where this class appears as range)
		taskList.push((args, next) => {
			const { propertiesTable, classData } = args;
			const classUri = classData.uri || `http://ceds.ed.gov/terms#${classData.name}`;
			
			const query = `SELECT * FROM <!tableName!> WHERE jsonString LIKE '%"${classUri}"%' AND jsonString LIKE '%rangeIncludes%'`;
			
			propertiesTable.getData(
				query,
				{ suppressStatementLog: true, noTableNameOk: true },
				(err, result) => {
					if (err) {
						next(err, args);
						return;
					}
					next(err, { ...args, incomingProperties: result || [] });
				}
			);
		});

		// Execute pipeline and return combined result
		const initialData = { sqlDb, mapper, dataMapping, refId };
		pipeRunner(taskList.getList(), initialData, (err, args) => {
			if (err) {
				xLog.error(`fetchFullClassDetails FAILED: ${err} (${moduleName}.js)`);
				callback(err);
				return;
			}

			// Combine all data
			const fullDetails = {
				...args.classData,
				properties: args.properties,
				incomingProperties: args.incomingProperties
			};

			callback('', fullDetails);
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

	addEndpoint({ name: 'fetch-all-entities', serviceFunction: fetchAllEntities, dotD });
	addEndpoint({ name: 'fetch-entities-by-domain', serviceFunction: fetchEntitiesByDomain, dotD });
	addEndpoint({ name: 'fetch-entity-details', serviceFunction: fetchEntityDetails, dotD });
	addEndpoint({ name: 'fetch-functional-areas-by-domain', serviceFunction: fetchFunctionalAreasByDomain, dotD });
	addEndpoint({ name: 'fetch-full-class-details', serviceFunction: fetchFullClassDetails, dotD });

	// ================================================================================
	// RETURN EMPTY OBJECT (required pattern)

	return {};
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;