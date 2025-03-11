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
			['name']: 'ElementName', //UI uses name for selectionList and therefore generally
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
		
		
		const getSql = (queryName, replaceObject = {}) => {
			if (typeof(queryName)=='object'){
				replaceObject=queryName;
				queryName='default'
			}
			const queries={
			default:`SELECT *, GlobalID as refId FROM _CEDSElements WHERE GlobalID = '<!refId!>'`,
			getOne:`SELECT *, GlobalID as refId FROM _CEDSElements WHERE GlobalID = '<!refId!>'`,
			nameList:`SELECT GlobalID, ElementName, GlobalID as refId FROM _CEDSElements ORDER BY ElementName`
			}
			const sql = queries[queryName];
			
			return sql.qtTemplateReplace(replaceObject);;
		};

		return { map: mapper, getSql };
	};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction({ moduleName }); //returns initialized moduleFunction