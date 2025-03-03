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

		/* Task for actual data access - commented out until accessPoints are created
		taskList.push((args, next) => {
			const { accessPointsDotD } = args;

			const localCallback = (err, nameList) => {
				if (err) {
					next(`${err.toString()}  (CEDS-fetchNameList-02)`, args);
					return;
				}
				next(err, { ...args, nameList });
			};
			
			accessPointsDotD['ceds-fetch-name-list'](localCallback);
		});
		*/
		
		// Mock data task for testing UI flow
		taskList.push((args, next) => {
			const mockNameList = [
				{ refId: "ceds001", name: "Student" },
				{ refId: "ceds002", name: "Teacher" },
				{ refId: "ceds003", name: "School" },
				{ refId: "ceds004", name: "District" },
				{ refId: "ceds005", name: "Address" },
				{ refId: "ceds006", name: "Section" },
				{ refId: "ceds007", name: "Course" },
				{ refId: "ceds008", name: "Assessment" },
				{ refId: "ceds009", name: "Attendance" },
				{ refId: "ceds010", name: "Calendar" }
			];
			next('', { ...args, nameList: mockNameList });
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
				{ showDetails: true },
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

		/* Task for actual data access - commented out until accessPoints are created
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
			
			accessPointsDotD['ceds-fetch-data'](refId, localCallback);
		});
		*/
		
		// Mock data task for testing UI flow
		taskList.push((args, next) => {
			const refId = xReq.query.refId;
			
			if (!refId) {
				next("No refId provided (CEDS-fetchData-02)", args);
				return;
			}
			
			// Generate detailed mock data based on refId
			const mockData = {
				refId: refId,
				name: `CEDS Element ${refId}`,
				elementName: `CEDS Element ${refId.slice(-3)}`,
				definition: `This is a detailed definition for CEDS element ${refId}. It includes information about the purpose, usage, and constraints of this data element.`,
				dataType: ["String", "Integer", "Date", "Boolean"][Math.floor(Math.random() * 4)],
				required: Math.random() > 0.5,
				multipleValues: Math.random() > 0.7,
				technicalName: `ceds_element_${refId.toLowerCase()}`,
				version: "1.0.0",
				status: ["Active", "Draft", "Deprecated"][Math.floor(Math.random() * 3)],
				lastUpdated: new Date().toISOString(),
				examples: [
					"Example value 1",
					"Example value 2",
					"Example value 3"
				],
				notes: "Additional implementation notes and guidelines go here."
			};
			
			next('', { ...args, data: mockData });
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
				{ showDetails: true },
				forwardArgs({ next, args }),
			),
		);

		/* Task for actual data access - commented out until accessPoints are created
		taskList.push((args, next) => {
			const { accessPointsDotD } = args;

			const localCallback = (err, savedData) => {
				if (err) {
					next(`${err.toString()}  (CEDS-saveData-01)`, args);
					return;
				}
				next(err, { ...args, savedData });
			};
			
			const dataToSave = xReq.body.qtClone();
			accessPointsDotD['ceds-save-data'](dataToSave, localCallback);
		});
		*/
		
		// Mock data task for testing UI flow
		taskList.push((args, next) => {
			const dataToSave = xReq.body;
			
			if (!dataToSave || !dataToSave.refId) {
				next("Invalid data or missing refId (CEDS-saveData-01)", args);
				return;
			}
			
			// Return the data with saved confirmation
			const savedData = {
				...dataToSave,
				lastSaved: new Date().toISOString(),
				savedBy: xReq.appValueGetter('authclaims')?.username || "unknown",
				saveConfirmed: true,
				version: dataToSave.version ? 
					(parseFloat(dataToSave.version) + 0.1).toFixed(1) : 
					"1.1"
			};
			
			next('', { ...args, savedData });
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
		endpointsDotD.logList.push(name);
	};

	// ================================================================================
	// Do the constructing

	const permissionValidator = accessTokenHeaderTools.getValidator([
		'client',
		'admin',
		'super',
	]);
	
	// Add all CEDS endpoints
	addEndpoint({
		name: 'cedsNameList',
		method: 'get',
		routePath: `${routingPrefix}ceds/fetchNameList`,
		serviceFunction: fetchNameListFunction,
		expressApp,
		endpointsDotD,
		permissionValidator,
		accessTokenHeaderTools,
	});

	addEndpoint({
		name: 'cedsFetchData',
		method: 'get',
		routePath: `${routingPrefix}ceds/fetchData`,
		serviceFunction: fetchDataFunction,
		expressApp,
		endpointsDotD,
		permissionValidator,
		accessTokenHeaderTools,
	});

	addEndpoint({
		name: 'cedsSaveData',
		method: 'post',
		routePath: `${routingPrefix}ceds/saveData`,
		serviceFunction: saveDataFunction,
		expressApp,
		endpointsDotD,
		permissionValidator,
		accessTokenHeaderTools,
	});

	return {};
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;