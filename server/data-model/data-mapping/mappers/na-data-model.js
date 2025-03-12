#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

const qt = require('qtools-functional-library'); //qt.help({printOutput:true, queryString:'.*', sendJson:false});

//START OF moduleFunction() ============================================================

const moduleFunction =
	({ moduleName }) =>
	({ baseMappingProcess }) => {
		process.global = process.global ? process.global : {};
		const xLog = process.global.xLog;
		

		// Map all columns from naDataModel table
		const inputNameMapping = {
			['refId']: 'refId',
			['Name']: 'Name',
			['Mandatory']: 'Mandatory',
			['Characteristics']: 'Characteristics',
			['Type']: 'Type',
			['Description']: 'Description',
			['XPath']: 'XPath',
			['CEDS ID']: 'CEDS_ID', // renamed to be code-friendly
			['Format']: 'Format',
			['SheetName']: 'SheetName',
			['cedsDefinition']:'cedsDefinition'
		};

		const basicMapper = baseMappingProcess(inputNameMapping);
		

		const recordMapper = (inObj, direction = 'forward') => {
			const outObj = inObj; //basicMapper(inObj, {direction});

			return outObj;
		};
		

		const mapper = (inData, direction = 'forward') => {
			if (Array.isArray(inData)) {
				return inData.map((inObj) => recordMapper(inObj, direction));
			}
			return recordMapper(inData, direction);
		};
		
		
		const getSql = (replaceObject = {}) => {
			const sql = `
				SELECT 
					refId, Name, Mandatory, Characteristics, Type,
					Description, XPath, "CEDS ID" as CEDS_ID, 
					Format, SheetName
				FROM naDataModel
				WHERE 1=1
				-- REPLACEMENTS GO HERE
			`;
			
			return sql.replace(/-- REPLACEMENTS GO HERE/, Object.keys(replaceObject).map(key => replaceObject[key]).join('\n'));
		};

		return { map: mapper, getSql };
	};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction({ moduleName }); //returns initialized moduleFunction