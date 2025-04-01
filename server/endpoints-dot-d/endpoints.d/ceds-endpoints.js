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
	// SERVICE FUNCTIONS
	
	const fetchOntologyClassesFunction = (permissionValidator) => (xReq, xRes, next) => {
		const taskList = new taskListPlus();

		taskList.push((args, next) =>
			args.permissionValidator(
				xReq.appValueGetter('authclaims'),
				{ showDetails: false },
				forwardArgs({ next, args }),
			),
		);

		taskList.push((args, next) => {
			const { accessTokenHeaderTools } = args;

			const localCallback = (err) => {
				if (err) {
					next(`${err.toString()}  (CEDS-fetchOntologyClasses-01)`, args);
					return;
				}
				next('', args);
			};

			accessTokenHeaderTools.refreshauthtoken(
				{
					xReq,
					xRes,
					payloadValues: {
						source: 'ceds-fetchOntologyClasses',
					},
				},
				localCallback,
			);
		});

		taskList.push((args, next) => {
			const { accessPointsDotD } = args;

			const localCallback = (err, ontologyData) => {
				if (err) {
					next(`${err.toString()}  (CEDS-fetchOntologyClasses-02)`, args);
					return;
				}
				next(err, { ...args, ontologyData });
			};
			
			accessPointsDotD['fetch-ceds-ontology-classes'](localCallback);
		});

		// INIT AND EXECUTE THE PIPELINE
		const initialData = {
			accessPointsDotD,
			permissionValidator,
			accessTokenHeaderTools,
		};
		
		pipeRunner(taskList.getList(), initialData, (err, args) => {
			if (err) {
				xRes.status(500).send(`${err.toString()}`);
				return;
			}

			xRes.json(args.ontologyData);
		});
	};
	
	const fetchNameListFunction = (permissionValidator) => (xReq, xRes, next) => {
		const taskList = new taskListPlus();

		taskList.push((args, next) =>
			args.permissionValidator(
				xReq.appValueGetter('authclaims'),
				{ showDetails: false },
				forwardArgs({ next, args }),
			),
		);

		taskList.push((args, next) => {
			const { accessTokenHeaderTools } = args;

			const localCallback = (err) => {
				if (err) {
					next(`${err.toString()}  (CEDS-fetchNameList-01)`, args);
					return;
				}
				next('', args);
			};

			accessTokenHeaderTools.refreshauthtoken(
				{
					xReq,
					xRes,
					payloadValues: {
						source: 'ceds-fetchNameList',
					},
				},
				localCallback,
			);
		});

		taskList.push((args, next) => {
			const { accessPointsDotD, xReq } = args;

			const localCallback = (err, nameList) => {
				if (err) {
					next(`${err.toString()}  (CEDS-fetchNameList-02)`, args);
					return;
				}
				next(err, { ...args, nameList });
			};
			
			accessPointsDotD['ceds-fetch-name-list'](localCallback);
		});

		// INIT AND EXECUTE THE PIPELINE
		const initialData = {
			accessPointsDotD,
			permissionValidator,
			accessTokenHeaderTools,
		};
		
		pipeRunner(taskList.getList(), initialData, (err, args) => {
			if (err) {
				xRes.status(500).send(`${err.toString()}`);
				return;
			}

			xRes.send(args.nameList);
		});
	};

	const fetchDataFunction = (permissionValidator) => (xReq, xRes, next) => {
		const taskList = new taskListPlus();
		
		taskList.push((args, next) =>
			args.permissionValidator(
				xReq.appValueGetter('authclaims'),
				{ showDetails: false },
				forwardArgs({ next, args }),
			),
		);

		taskList.push((args, next) => {
			const { accessTokenHeaderTools } = args;

			const localCallback = (err) => {
				if (err) {
					next(`${err.toString()}  (CEDS-fetchData-01)`, args);
					return;
				}
				next('', args);
			};

			accessTokenHeaderTools.refreshauthtoken(
				{
					xReq,
					xRes,
					payloadValues: {
						source: 'ceds-fetchData',
					},
				},
				localCallback,
			);
		});

		taskList.push((args, next) => {
			const { accessPointsDotD } = args;
			const refId = xReq.query.refId;
			
			if (!refId) {
				next("No refId provided (CEDS-fetchData-02)", args);
				return;
			}

			const localCallback = (err, data) => {
				if (err) {
					next(`${err.toString()}  (CEDS-fetchData-03)`, args);
					return;
				}
				next(err, { ...args, data });
			};
			
			accessPointsDotD['ceds-fetch-object-data'](refId, localCallback);
		});

		// INIT AND EXECUTE THE PIPELINE
		const initialData = {
			accessPointsDotD,
			permissionValidator,
			accessTokenHeaderTools,
			refId: xReq.query.refId,
		};
		
		pipeRunner(taskList.getList(), initialData, (err, args) => {
			if (err) {
				xRes.status(500).send(`${err.toString()}`);
				return;
			}

			xRes.send(args.data);
		});
	};

	const saveDataFunction = (permissionValidator) => (xReq, xRes, next) => {
		const taskList = new taskListPlus();

		taskList.push((args, next) =>
			args.permissionValidator(
				xReq.appValueGetter('authclaims'),
				{ showDetails: false },
				forwardArgs({ next, args }),
			),
		);

		taskList.push((args, next) => {
			const { accessPointsDotD } = args;

			const localCallback = (err, savedData) => {
				if (err) {
					next(`${err.toString()}  (CEDS-saveData-01)`, args);
					return;
				}
				next(err, { ...args, savedData });
			};
			
			const dataToSave = xReq.body.qtClone ? xReq.body.qtClone() : xReq.body;
			accessPointsDotD['ceds-save-data'](dataToSave, localCallback);
		});

		taskList.push((args, next) => {
			const { accessTokenHeaderTools } = args;

			const localCallback = (err) => {
				if (err) {
					next(`${err.toString()}  (CEDS-saveData-02)`, args);
					return;
				}
				next('', args);
			};

			accessTokenHeaderTools.refreshauthtoken(
				{
					xReq,
					xRes,
					payloadValues: {
						source: 'ceds-saveData',
					},
				},
				localCallback,
			);
		});

		// INIT AND EXECUTE THE PIPELINE
		const initialData = {
			accessPointsDotD,
			permissionValidator,
			accessTokenHeaderTools,
			requestData: xReq.body,
		};
		
		pipeRunner(taskList.getList(), initialData, (err, args) => {
			if (err) {
				xRes.status(500).send(`${err.toString()}`);
				return;
			}

			xRes.send(args.savedData);
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
		permissionValidator,
		accessTokenHeaderTools,
	}) => {
		expressApp[method](routePath, serviceFunction(permissionValidator)); //use expressApp instead of dotD.library
		endpointsDotD.logList.push(name); // notify the outside world that this endpoint exists
	};

	// ================================================================================
	// Do the constructing

	const permissionValidator = accessTokenHeaderTools.getValidator([
		'public',
	]);
	
	// Add all CEDS endpoints
	addEndpoint({
		name: 'ceds/NameList',
		method: 'get',
		routePath: `${routingPrefix}ceds/fetchNameList`,
		serviceFunction: fetchNameListFunction,
		expressApp,
		endpointsDotD,
		permissionValidator,
		accessTokenHeaderTools,
	});

	addEndpoint({
		name: 'ceds/FetchData',
		method: 'get',
		routePath: `${routingPrefix}ceds/fetchData`,
		serviceFunction: fetchDataFunction,
		expressApp,
		endpointsDotD,
		permissionValidator,
		accessTokenHeaderTools,
	});
	
	addEndpoint({
		name: 'ceds/FetchOntologyClasses',
		method: 'get',
		routePath: `${routingPrefix}ceds/fetchOntologyClasses`,
		serviceFunction: fetchOntologyClassesFunction,
		expressApp,
		endpointsDotD,
		permissionValidator,
		accessTokenHeaderTools,
	});


	return {};
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;