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

	const serviceFunction = (dataToSave, callback) => {
		const taskList = new taskListPlus();

		// --------------------------------------------------------------------------------
		// VALIDATION: Check required fields

		taskList.push((args, next) => {
			const { dataToSave } = args;
			const { refId, GlobalID, ElementName } = dataToSave;

			if (!refId || !GlobalID) {
				next('Missing required field: refId or GlobalID');
				return;
			}

			if (!ElementName) {
				next('Missing required field: ElementName');
				return;
			}

			next('', args);
		});

		// --------------------------------------------------------------------------------
		// TASK: Get database table

		taskList.push((args, next) => {
			const { sqlDb } = args;
			args.sqlDb.getTable('_CEDSElements', mergeArgs(args, next, 'cedsTable'));
		});

		// --------------------------------------------------------------------------------
		// TASK: Handle update or insert

		taskList.push((args, next) => {
			const { cedsTable, dataMapping, dataToSave } = args;
			const cedsMapper = dataMapping['ceds-elements'];

			// Check if element exists
			const checkCallback = (err, existingElements) => {
				if (err) {
					next(err);
					return;
				}

				// Prepare for update/insert
				const mappedData = cedsMapper.map(dataToSave, 'reverse');
				const { GlobalID } = mappedData;
				const exists = existingElements && existingElements.length > 0;

				// Build the query
				let query;
				if (exists) {
					// UPDATE - build update SQL with column=value pairs
					const setClauses = Object.keys(mappedData)
						.filter(key => key !== 'GlobalID')
						.map(key => `\`${key}\` = '${mappedData[key]}'`)
						.join(', ');
					
					query = `UPDATE <!tableName!> SET ${setClauses} WHERE GlobalID = '${GlobalID}'`;
				} else {
					// INSERT - build insert SQL with columns and values
					const columns = Object.keys(mappedData).map(key => `\`${key}\``).join(', ');
					const values = Object.values(mappedData).map(val => `'${val}'`).join(', ');
					
					query = `INSERT INTO <!tableName!> (${columns}) VALUES (${values})`;
				}

				// Execute the update/insert
				const updateCallback = (err, updateResult) => {
					if (err) {
						next(err);
						return;
					}

					// Fetch the updated/inserted row
					const getCallback = (err, savedElements = []) => {
						if (err) {
							next(err);
							return;
						}

						if (!savedElements.length) {
							next(`Error retrieving saved CEDS element ${GlobalID}`);
							return;
						}

						// Map the result back to output format
						const savedData = cedsMapper.map(savedElements[0]);
						next('', { ...args, savedData });
					};

					const getQuery = `SELECT * FROM <!tableName!> WHERE GlobalID = '${GlobalID}'`;
					cedsTable.getData(getQuery, { suppressStatementLog: true }, getCallback);
				};

				cedsTable.executeStatement(query, { suppressStatementLog: true }, updateCallback);
			};

			const checkQuery = `SELECT GlobalID FROM <!tableName!> WHERE GlobalID = '${dataToSave.GlobalID}'`;
			cedsTable.getData(checkQuery, { suppressStatementLog: true }, checkCallback);
		});

		// --------------------------------------------------------------------------------
		// INIT AND EXECUTE THE PIPELINE

		const initialData = { sqlDb, mapper, dataMapping, dataToSave };
		pipeRunner(taskList.getList(), initialData, (err, args) => {
			if (err) {
				xLog.error(
					`ceds-save-data FAILED: ${err} (${moduleName}.js)`,
				);
				callback(err);
				return;
			}

			callback('', args.savedData);
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

	const name = 'ceds-save-data';

	addEndpoint({ name, serviceFunction, dotD });

	return {};
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;