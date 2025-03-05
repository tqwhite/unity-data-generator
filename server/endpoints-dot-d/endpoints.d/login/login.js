#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot
const qt = require('qtools-functional-library');
const { pipeRunner, taskListPlus, mergeArgs, forwardArgs } = new require(
	'qtools-asynchronous-pipe-plus',
)();

//START OF moduleFunction() ============================================================

const moduleFunction = function ({
	dotD: endpointsDotD,
	passThroughParameters,
}) {
	// ================================================================================
	// INITIALIZATION

	const { xLog, getConfig, rawConfig, commandLineParameters } = process.global;
	const localConfig = getConfig(moduleName); //moduleName is closure

	const {
		expressApp,
		accessTokenHeaderTools,
		accessPointsDotD,
		routingPrefix,
	} = passThroughParameters;

	// ================================================================================
	// SERVICE FUNCTION

	const serviceFunction = (xReq, xRes, next) => {
		const taskList = new taskListPlus();

		// --------------------------------------------------------------------------------
		// TASKLIST ITEM TEMPLATE

		taskList.push((args, next) => {
			const { accessPointsDotD } = args;

			const localCallback = (err, { hostname }) => {
				next(err, { ...args, hostname });
			};

			accessPointsDotD['host-params']({}, localCallback);
		});

		// --------------------------------------------------------------------------------
		// TASKLIST ITEM TEMPLATE

		taskList.push((args, next) => {
			const { accessPointsDotD } = args;

			const localCallback = (err, { user }) => {
				next(err, { ...args, user });
			};

			accessPointsDotD['user-login'](xReq.query, localCallback);
		});

		// --------------------------------------------------------------------------------
		// TASKLIST ITEM TEMPLATE

		taskList.push((args, next) => {
			const { user, accessTokenHeaderTools } = args;

			if (!user) {
				next('Invalid username or password', args);
				return;
			}

			if (user.inactive) {
				next('Invalid user parameters', args);
				return;
			}

			const localCallback = (err) => {
				if (err) {
					next(err, args); //next('skipRestOfPipe', args);
					return;
				}
				next('', args); //next('', {...args, NAME:result});
			};

			let revisedUser=user;
			if (user.legacy){
				revisedUser.role='firstTime';
			}
			accessTokenHeaderTools.refreshauthtoken(
				{
					xReq,
					xRes,
					payloadValues: {
						source: 'login',
						user: revisedUser,
					},
				},
				localCallback,
			);
		});

		// --------------------------------------------------------------------------------
		// INIT AND EXECUTE THE PIPELINE

		const initialData = { accessTokenHeaderTools, accessPointsDotD };
		pipeRunner(taskList.getList(), initialData, (err, args) => {
			const { user, accessTokenHeaderTools } = args;
			if (err) {
				xRes.status(404).send(err.toString());
				next(err.toString());
				return;
			}
			xRes.send([user]);
		});
	};

	// ================================================================================
	// Endpoint Constructor

	const addEndpoint = ({
		name,
		method,
		routePath,
		serviceFunction,
		expressApp,
		endpointsDotD,
	}) => {
		expressApp[method](routePath, serviceFunction); //uaw expressApp instead of dotD.library
		endpointsDotD.logList.push(name);
	};

	// ================================================================================
	// Do the constructing

	const method = 'get';
	const thisEndpointName = 'login';
	const routePath = `${routingPrefix}${thisEndpointName}`;
	const name = routePath;

	const permissionValidator = accessTokenHeaderTools.getValidator(['public']);
	addEndpoint({
		name,
		method,
		routePath,
		serviceFunction,
		expressApp,
		endpointsDotD,
		permissionValidator,
	});

	return {};
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;
