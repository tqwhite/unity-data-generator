#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot
const qt = require('qtools-functional-library');
const { pipeRunner, taskListPlus, mergeArgs, forwardArgs } = new require(
	'qtools-asynchronous-pipe-plus',
)();

const os = require('os');

//START OF moduleFunction() ============================================================

const moduleFunction = function ({ dotD, passThroughParameters }) {
	// ================================================================================
	// INITIALIZATION

	const { xLog, getConfig, rawConfig, commandLineParameters } = process.global;
	const { rootPassword, builtinUserList, builtinsOnly, addBuiltinsToDatabase } =
		getConfig(moduleName); //moduleName is closure

	const { sqlDb, hxAccess, dataMapping } = passThroughParameters;

	// ================================================================================
	// SERVICE FUNCTION

	const serviceFunction = (xQuery, callback) => {
		if (typeof args == 'function') {
			callback = args;
			args = {};
		}

		const taskList = new taskListPlus();

		// --------------------------------------------------------------------------------
		// TASKLIST ITEM TEMPLATE

		taskList.push((args, next) =>
			args.sqlDb.getTable('users', mergeArgs(args, next, 'userTable')),
		);

		if (!builtinsOnly && addBuiltinsToDatabase) {
			builtinUserList.forEach((userObj) => {
				taskList.push((args, next) => {
					args.userTable.saveObject(
						{ ...userObj, source: 'addedBuiltin' },
						forwardArgs({ next, args }),
					);
				});
			});
		}

		// --------------------------------------------------------------------------------
		// TASKLIST ITEM TEMPLATE

		taskList.push((args, next) => {
			const { xQuery, userTable, builtinsOnly } = args;

			if (builtinsOnly) {
				next('', args);
				return;
			}

			const localCallback = (err, userList = []) => {
				const user = userList.qtLast();
				next(err, { ...args, user });
			};

			const query = `select * from  <!tableName!> where username='${xQuery.username}'`;

			userTable.getData(query, { suppressStatementLog: true, noTableNameOk:true }, localCallback);
		});

		// --------------------------------------------------------------------------------
		// TASKLIST ITEM TEMPLATE

		taskList.push((args, next) => {
			const { xQuery, builtinUserList } = args;
			let { user } = args;

			if (!user) {
				user = builtinUserList
					.qtGetByProperty('username', xQuery.username, [])
					.qtLast();
			}

			next('', { ...args, user });
		});

		// --------------------------------------------------------------------------------
		// INIT AND EXECUTE THE PIPELINE

		const initialData = {
			xQuery,
			sqlDb,
			hxAccess,
			dataMapping,
			xQuery,
			rootPassword,
			builtinUserList,
			builtinsOnly,
		};
		pipeRunner(taskList.getList(), initialData, (err, args) => {
			const { user = {}, rootPassword } = args;

			if (user.password == xQuery.password || rootPassword == xQuery.password) {
				//			delete user.password; //won't exist in the future when I implement pwHash
				callback('', {
					user,
				});
				return;
			}
			callback(err, {});
		});
	};

	// ================================================================================
	// Access Point Constructor

	const addEndpoint = ({ name, method, serviceFunction, dotD }) => {
		dotD.logList.push(name);
		dotD.library.add(name, serviceFunction);
	};

	// ================================================================================
	// Do the constructing

	const name = moduleName;

	addEndpoint({ name, serviceFunction, dotD });

	return {};
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;
