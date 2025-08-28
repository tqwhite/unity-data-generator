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

		// Map columns from CEDS_FunctionalAreas table
		const inputNameMapping = {
			['refId']: 'refId',
			['domainRefId']: 'domainRefId',
			['areaName']: 'areaName',
			['areaDescription']: 'areaDescription',
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
						fa.refId, 
						fa.domainRefId,
						fa.areaName, 
						fa.areaDescription,
						fa.displayOrder,
						fa.createdAt,
						fa.updatedAt,
						COUNT(DISTINCT cc.classRefId) as classCount
					FROM CEDS_FunctionalAreas fa
					LEFT JOIN CEDS_ClassCategories cc ON fa.refId = cc.functionalAreaRefId
					GROUP BY fa.refId
					ORDER BY fa.displayOrder
				`,
				byDomain: `
					SELECT 
						fa.refId, 
						fa.domainRefId,
						fa.areaName, 
						fa.areaDescription,
						fa.displayOrder,
						fa.createdAt,
						fa.updatedAt,
						COUNT(DISTINCT cc.classRefId) as classCount
					FROM CEDS_FunctionalAreas fa
					LEFT JOIN CEDS_ClassCategories cc ON fa.refId = cc.functionalAreaRefId
					WHERE fa.domainRefId = '<!domainRefId!>'
					GROUP BY fa.refId
					ORDER BY fa.displayOrder
				`,
				getOne: `
					SELECT * FROM CEDS_FunctionalAreas 
					WHERE refId = '<!refId!>'
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