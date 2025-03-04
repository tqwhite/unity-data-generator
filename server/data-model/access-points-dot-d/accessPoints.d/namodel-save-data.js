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
			const { refId, Name } = dataToSave;

			if (!refId) {
				next('Missing required field: refId');
				return;
			}

			if (!Name) {
				next('Missing required field: Name');
				return;
			}

			next('', args);
		});

		// --------------------------------------------------------------------------------
		// TASK: Get database table

		taskList.push((args, next) => {
			const { sqlDb } = args;
			args.sqlDb.getTable('naDataModel', mergeArgs(args, next, 'naModelTable'));
		});

		// --------------------------------------------------------------------------------
		// TASK: Handle update or insert

		taskList.push((args, next) => {
			const { naModelTable, dataMapping, dataToSave } = args;
			const naModelMapper = dataMapping['na-data-model'];

			// Check if element exists
			const checkCallback = (err, existingElements) => {
				if (err) {
					next(err);
					return;
				}

				// Prepare for update/insert
				const mappedData = naModelMapper.map(dataToSave, 'reverse');
				const { refId } = mappedData;
				const exists = existingElements && existingElements.length > 0;

				// Handle CEDS_ID back to "CEDS ID" for SQL
				if (mappedData.CEDS_ID !== undefined) {
					mappedData["CEDS ID"] = mappedData.CEDS_ID;
					delete mappedData.CEDS_ID;
				}

				// Build the query
				let query;
				if (exists) {
					// UPDATE - build update SQL with column=value pairs
					const setClauses = Object.keys(mappedData)
						.filter(key => key !== 'refId')
						.map(key => {
							if (key === 'CEDS ID') {
								return `\`CEDS ID\` = '${mappedData[key]}'`;
							}
							return `\`${key}\` = '${mappedData[key]}'`;
						})
						.join(', ');
					
					query = `UPDATE <!tableName!> SET ${setClauses} WHERE refId = '${refId}'`;
				} else {
					// INSERT - build insert SQL with columns and values
					const columns = Object.keys(mappedData).map(key => {
						if (key === 'CEDS ID') {
							return `\`CEDS ID\``;
						}
						return `\`${key}\``;
					}).join(', ');
					
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
							next(`Error retrieving saved NA Model element ${refId}`);
							return;
						}

						// Map the result back to output format
						const savedData = naModelMapper.map(savedElements[0]);
						next('', { ...args, savedData });
					};

					const getQuery = `
						SELECT refId, Name, Mandatory, Characteristics, Type,
						Description, XPath, "CEDS ID" as CEDS_ID, 
						Format, SheetName
						FROM <!tableName!> WHERE refId = '${refId}'
					`;
					naModelTable.getData(getQuery, { suppressStatementLog: true }, getCallback);
				};

				naModelTable.executeStatement(query, { suppressStatementLog: true }, updateCallback);
			};

			const checkQuery = `SELECT refId FROM <!tableName!> WHERE refId = '${dataToSave.refId}'`;
			naModelTable.getData(checkQuery, { suppressStatementLog: true }, checkCallback);
		});

		// --------------------------------------------------------------------------------
		// INIT AND EXECUTE THE PIPELINE

		const initialData = { sqlDb, mapper, dataMapping, dataToSave };
		pipeRunner(taskList.getList(), initialData, (err, args) => {
			if (err) {
				xLog.error(
					`namodel-save-data FAILED: ${err} (${moduleName}.js)`,
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

	const name = 'namodel-save-data';

	addEndpoint({ name, serviceFunction, dotD });

	return {};
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;