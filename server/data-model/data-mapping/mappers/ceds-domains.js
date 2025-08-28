#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const qt = require('qtools-functional-library');

//START OF moduleFunction() ============================================================

const moduleFunction =
	({ moduleName }) =>
	({ baseMappingProcess }) => {
		process.global = process.global ? process.global : {};
		const xLog = process.global.xLog;

		// Map columns from CEDS_Domains table
		const inputNameMapping = {
			['refId']: 'refId',
			['domainName']: 'domainName',
			['domainDescription']: 'domainDescription',
			['displayOrder']: 'displayOrder',
			['classCount']: 'classCount',
			['createdAt']: 'createdAt',
			['updatedAt']: 'updatedAt'
		};

		const basicMapper = baseMappingProcess(inputNameMapping);

		const recordMapper = (inObj, direction = 'forward') => {
			const outObj = basicMapper(inObj, { direction });
			// Ensure classCount is a number
			if (outObj.classCount !== undefined) {
				outObj.classCount = parseInt(outObj.classCount, 10) || 0;
			}
			return outObj;
		};

		const mapper = (inData, direction = 'forward') => {
			if (Array.isArray(inData)) {
				return inData.map((inObj) => recordMapper(inObj, direction));
			}
			return recordMapper(inData, direction);
		};

		const getSql = (queryName, replaceObject = {}) => {
			if (typeof queryName == 'object') {
				replaceObject = queryName;
				queryName = 'default';
			}
			
			const queries = {
				default: `
					SELECT 
						d.refId, 
						d.domainName, 
						d.domainDescription,
						d.displayOrder,
						d.createdAt,
						d.updatedAt,
						COUNT(DISTINCT cc.classRefId) as classCount
					FROM CEDS_Domains d
					LEFT JOIN CEDS_ClassCategories cc ON d.refId = cc.domainRefId
					GROUP BY d.refId
					ORDER BY d.displayOrder
				`,
				getOne: `
					SELECT 
						d.refId, 
						d.domainName, 
						d.domainDescription,
						d.displayOrder,
						d.createdAt,
						d.updatedAt,
						COUNT(DISTINCT cc.classRefId) as classCount
					FROM CEDS_Domains d
					LEFT JOIN CEDS_ClassCategories cc ON d.refId = cc.domainRefId
					WHERE d.refId = '<!refId!>'
					GROUP BY d.refId
				`,
				nameList: `
					SELECT refId, domainName 
					FROM CEDS_Domains 
					ORDER BY displayOrder
				`
			};

			const query = queries[queryName] || queries.default;
			return query.qtTemplateReplace(replaceObject);
		};

		return {
			map: mapper,
			getSql
		};
	};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction({ moduleName });