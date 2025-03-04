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
		

		// Map all columns from _CEDSElements table
		const inputNameMapping = {
			['GlobalID']: 'GlobalID',
			['ElementName']: 'ElementName',
			['AltName']: 'AltName',
			['Definition']: 'Definition',
			['Format']: 'Format',
			['HasOptionSet']: 'HasOptionSet',
			['UsageNotes']: 'UsageNotes',
			['URL']: 'URL',
			['Version']: 'Version',
			['TermID']: 'TermID',
			['ChangedInThisVersionInd']: 'ChangedInThisVersionInd',
			['ChangeNotes']: 'ChangeNotes',
			['refId']: 'refId'
		};

		const basicMapper = baseMappingProcess(inputNameMapping);
		

		const recordMapper = (inObj, direction = 'forward') => {
			const outObj = basicMapper(inObj, {direction});
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
					GlobalID, ElementName, AltName, Definition, 
					Format, HasOptionSet, UsageNotes, URL, 
					Version, TermID, ChangedInThisVersionInd, ChangeNotes, refId
				FROM _CEDSElements
				WHERE 1=1
				-- REPLACEMENTS GO HERE
			`;
			
			return sql.replace(/-- REPLACEMENTS GO HERE/, Object.keys(replaceObject).map(key => replaceObject[key]).join('\n'));
		};

		return { map: mapper, getSql };
	};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction({ moduleName }); //returns initialized moduleFunction