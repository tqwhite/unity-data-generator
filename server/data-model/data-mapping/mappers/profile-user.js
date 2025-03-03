#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

const qt = require('qtools-functional-library'); //qt.help({printOutput:true, queryString:'.*', sendJson:false});

//START OF moduleFunction() ============================================================

const moduleFunction =
	({ moduleName }) =>
	({ baseMappingProcess, pwHash }) => {
		process.global = process.global ? process.global : {};
		const xLog = process.global.xLog;
		

		const inputNameMapping = {
			['refId']: 'refId',
			['username']: 'username',
			['password']: 'password',
			['first']: 'first',
			['last']: 'last',
			['emailAdr']: 'emailAdr',
			['phone']: 'phone',
			['source']: 'source',
			['role']: 'role'
		}; // {reverseName:'forwardName'}, result name XXX forces removed from output

		const basicMapper = baseMappingProcess(inputNameMapping);
		

		const recordMapper = (inObj, direction = 'forward') => {
			const outObj = basicMapper(inObj, {direction});


			delete outObj.XXX; //inputs that are not wanted by the rest of the app are removed

			return outObj;
		};
		

		const mapper = (inData, direction = 'forward') => {
			if (Array.isArray(inData)) {
				return inData.map((inObj) => recordMapper(inObj, direction));
			}
			return recordMapper(inData, direction);
		};
		
		
		const getSql=(replaceObject={})=>{
			xLog.error(`No getSql() in ${moduleName}`);
			return undefined;
		
		}

		return {map:mapper};
	};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction(moduleName); //returns initialized moduleFunction

