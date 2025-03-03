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
				{ showDetails: true },
				forwardArgs({ next, args }),
			),
		);

		taskList.push((args, next) => {
			const { accessTokenHeaderTools } = args;

			const localCallback = (err) => {
				if (err) {
					next(`${err.toString()}  (NAMODEL-fetchNameList-01)`, args);
					return;
				}
				next('', args);
			};

			accessTokenHeaderTools.refreshauthtoken(
				{
					xReq,
					xRes,
					payloadValues: {
						source: 'namodel-fetchNameList',
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
					next(`${err.toString()}  (NAMODEL-fetchNameList-02)`, args);
					return;
				}
				next(err, { ...args, nameList });
			};
			
			accessPointsDotD['namodel-fetch-name-list'](localCallback);
		});
		*/
		
		// Mock data task for testing UI flow
		taskList.push((args, next) => {
			const mockNameList = [
				{ refId: "nam001", name: "Student" },
				{ refId: "nam002", name: "Staff" },
				{ refId: "nam003", name: "Schedule" },
				{ refId: "nam004", name: "Enrollment" },
				{ refId: "nam005", name: "Attendance" },
				{ refId: "nam006", name: "Transcript" },
				{ refId: "nam007", name: "GradeBook" },
				{ refId: "nam008", name: "BusRoute" },
				{ refId: "nam009", name: "MealService" },
				{ refId: "nam010", name: "Discipline" },
				{ refId: "nam011", name: "SpecialEducation" },
				{ refId: "nam012", name: "Assessment" }
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
					next(`${err.toString()}  (NAMODEL-fetchData-01)`, args);
					return;
				}
				next('', args);
			};

			accessTokenHeaderTools.refreshauthtoken(
				{
					xReq,
					xRes,
					payloadValues: {
						source: 'namodel-fetchData',
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
				next("No refId provided (NAMODEL-fetchData-02)", args);
				return;
			}

			const localCallback = (err, data) => {
				if (err) {
					next(`${err.toString()}  (NAMODEL-fetchData-03)`, args);
					return;
				}
				next(err, { ...args, data });
			};
			
			accessPointsDotD['namodel-fetch-data'](refId, localCallback);
		});
		*/
		
		// Mock data task for testing UI flow
		taskList.push((args, next) => {
			const refId = xReq.query.refId;
			
			if (!refId) {
				next("No refId provided (NAMODEL-fetchData-02)", args);
				return;
			}
			
			// Generate detailed mock data based on refId
			const mockData = {
				refId: refId,
				name: `NA Model Element ${refId}`,
				technicalName: `namodel_element_${refId.slice(-3).toLowerCase()}`,
				xpath: `/SIF/XPress/LEA/${refId.includes('Student') ? 'Student' : 'School'}/${refId}`,
				description: `This is a detailed description for NA Model element ${refId}, which defines specific data elements for the SIF specification.`,
				dataType: ["String", "Integer", "Enumeration", "Date", "Time", "Duration", "Boolean"][Math.floor(Math.random() * 7)],
				mandatory: Math.random() > 0.6,
				repeatable: Math.random() > 0.8,
				version: "3.0",
				status: ["Active", "Proposed", "Deprecated"][Math.floor(Math.random() * 3)],
				characteristics: {
					minLength: Math.floor(Math.random() * 10),
					maxLength: Math.floor(Math.random() * 50) + 10,
					pattern: refId.includes("001") ? "^[A-Z0-9]{8}$" : null
				},
				enumeration: refId.includes("002") ? ["Value1", "Value2", "Value3"] : null,
				parentElement: refId.includes("001") ? "Student" : refId.includes("002") ? "Staff" : "School",
				relatedElements: ["nam001", "nam003", "nam005"].filter(r => r !== refId),
				lastModified: new Date().toISOString()
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
					next(`${err.toString()}  (NAMODEL-saveData-01)`, args);
					return;
				}
				next(err, { ...args, savedData });
			};
			
			const dataToSave = xReq.body.qtClone();
			accessPointsDotD['namodel-save-data'](dataToSave, localCallback);
		});
		*/
		
		// Mock data task for testing UI flow
		taskList.push((args, next) => {
			const dataToSave = xReq.body;
			
			if (!dataToSave || !dataToSave.refId) {
				next("Invalid data or missing refId (NAMODEL-saveData-01)", args);
				return;
			}
			
			// Return the data with saved confirmation and additional metadata
			const savedData = {
				...dataToSave,
				lastSaved: new Date().toISOString(),
				savedBy: xReq.appValueGetter('authclaims')?.username || "unknown",
				saveConfirmed: true,
				versionHistory: [
					{
						version: dataToSave.version || "1.0",
						date: new Date(Date.now() - 86400000).toISOString(),
						user: "previous_user"
					},
					{
						version: dataToSave.version ? 
							(parseFloat(dataToSave.version) + 0.1).toFixed(1) : 
							"1.1",
						date: new Date().toISOString(),
						user: xReq.appValueGetter('authclaims')?.username || "unknown"
					}
				],
				status: dataToSave.status || "Active"
			};
			
			next('', { ...args, savedData });
		});

		taskList.push((args, next) => {
			const { accessTokenHeaderTools } = args;

			const localCallback = (err) => {
				if (err) {
					next(`${err.toString()}  (NAMODEL-saveData-02)`, args);
					return;
				}
				next('', args);
			};

			accessTokenHeaderTools.refreshauthtoken(
				{
					xReq,
					xRes,
					payloadValues: {
						source: 'namodel-saveData',
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
	
	// Add all NA Model endpoints
	addEndpoint({
		name: 'namodelNameList',
		method: 'get',
		routePath: `${routingPrefix}namodel/fetchNameList`,
		serviceFunction: fetchNameListFunction,
		expressApp,
		endpointsDotD,
		permissionValidator,
		accessTokenHeaderTools,
	});

	addEndpoint({
		name: 'namodelFetchData',
		method: 'get',
		routePath: `${routingPrefix}namodel/fetchData`,
		serviceFunction: fetchDataFunction,
		expressApp,
		endpointsDotD,
		permissionValidator,
		accessTokenHeaderTools,
	});

	addEndpoint({
		name: 'namodelSaveData',
		method: 'post',
		routePath: `${routingPrefix}namodel/saveData`,
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