#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');
const qt = require('qtools-functional-library');
const { pipeRunner, taskListPlus, mergeArgs, forwardArgs } = new require(
	'qtools-asynchronous-pipe-plus',
)();

const moduleFunction = function ({
	dotD: endpointsDotD,
	passThroughParameters,
}) {
	const { xLog, getConfig, rawConfig, commandLineParameters } = process.global;
	const localConfig = getConfig(moduleName);

	const {
		expressApp,
		accessTokenHeaderTools,
		accessPointsDotD,
		routingPrefix,
	} = passThroughParameters;

	// Debug Auth Status - Returns information about the user's auth status
	const debugAuthFunction = (permissionValidator) => (xReq, xRes, next) => {
		const taskList = new taskListPlus();

		taskList.push((args, next) => {
			const authClaims = xReq.appValueGetter('authclaims');
			
			// Get the raw Authorization header
			const authHeader = xReq.headers['authorization'] || 'none';
			
			// Don't refresh the token for this diagnostic endpoint
			
			const authInfo = {
				authHeader: authHeader.substring(0, 15) + '...',
				hasToken: !authClaims.noToken,
				user: authClaims.user || {},
				roles: typeof authClaims.user?.role === 'string' 
					? authClaims.user.role.split(',').map(r => r.trim())
					: Array.isArray(authClaims.user?.role) 
						? authClaims.user.role 
						: ['unknown'],
				tokenExpiry: authClaims.exp ? new Date(authClaims.exp * 1000).toISOString() : 'unknown',
				rawClaims: { ...authClaims }
			};
			
			next('', { ...args, authInfo });
		});

		// INIT AND EXECUTE THE PIPELINE
		const initialData = {
			accessPointsDotD,
			permissionValidator
		};
		
		pipeRunner(taskList.getList(), initialData, (err, args) => {
			if (err) {
				xRes.status(500).send(`${err.toString()}`);
				return;
			}

			xRes.send(args.authInfo);
		});
	};

	const addEndpoint = ({
		name,
		method,
		routePath,
		serviceFunction,
		expressApp,
		endpointsDotD,
		permissionValidator,
		accessTokenHeaderTools,
	}) => {
		expressApp[method](routePath, serviceFunction(permissionValidator));
		endpointsDotD.logList.push(name);
	};

	// Debug endpoint accessible by all (including public)
	const permissionValidator = accessTokenHeaderTools.getValidator([
		'public', 'client', 'admin', 'super'
	]);
	
	addEndpoint({
		name: 'debugAuth',
		method: 'get',
		routePath: `${routingPrefix}debug/auth`,
		serviceFunction: debugAuthFunction,
		expressApp,
		endpointsDotD,
		permissionValidator,
		accessTokenHeaderTools,
	});

	return {};
};

module.exports = moduleFunction;