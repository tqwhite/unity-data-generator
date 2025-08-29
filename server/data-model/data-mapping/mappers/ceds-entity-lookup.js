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

		// Map columns from CEDS_RDF_UI_SUPPORT_INDEX table
		const inputNameMapping = {
			['refId']: 'refId',
			['entityType']: 'entityType',
			['code']: 'code',
			['uri']: 'uri',
			['label']: 'label',
			['prefLabel']: 'prefLabel',
			['notation']: 'notation',
			['domainRefId']: 'domainRefId',
			['functionalAreaRefId']: 'functionalAreaRefId',
			['parentRefId']: 'parentRefId',
			['isOptionSet']: 'isOptionSet',
			['displayOrder']: 'displayOrder',
			['crossDomainList']: 'crossDomainList',
			['createdAt']: 'createdAt',
			['updatedAt']: 'updatedAt'
		};

		const basicMapper = baseMappingProcess(inputNameMapping);

		const recordMapper = (inObj, direction = 'forward') => {
			const outObj = basicMapper(inObj, { direction });
			
			// Ensure isOptionSet is a boolean
			if (outObj.isOptionSet !== undefined) {
				outObj.isOptionSet = outObj.isOptionSet === 1;
			}
			
			// Ensure displayOrder is a number
			if (outObj.displayOrder !== undefined) {
				outObj.displayOrder = parseInt(outObj.displayOrder, 10) || 0;
			}
			
			// Parse crossDomainList into array if present
			if (outObj.crossDomainList && typeof outObj.crossDomainList === 'string') {
				outObj.crossDomainList = outObj.crossDomainList.split(',').filter(Boolean);
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
				// Get all entities (lightweight version)
				getAllEntities: `
					SELECT 
						refId, 
						entityType, 
						code,
						label, 
						domainRefId, 
						functionalAreaRefId,
						isOptionSet,
						displayOrder
					FROM CEDS_RDF_UI_SUPPORT_INDEX
					ORDER BY entityType, displayOrder, label
				`,
				
				// Get entities by domain
				getByDomain: `
					SELECT 
						refId, 
						entityType, 
						code,
						label, 
						functionalAreaRefId,
						isOptionSet,
						crossDomainList,
						displayOrder
					FROM CEDS_RDF_UI_SUPPORT_INDEX
					WHERE entityType IN ('class', 'functionalArea')
					AND (domainRefId = '<!domainRefId!>' 
					     OR crossDomainList LIKE '%<!domainRefId!>%'
					     OR entityType = 'functionalArea')
					ORDER BY entityType, displayOrder, label
				`,
				
				// Get functional areas with counts for a domain
				getFunctionalAreas: `
					SELECT 
						fa.refId as id,
						fa.label,
						fa.code,
						fa.displayOrder,
						COUNT(DISTINCT c.refId) as count
					FROM CEDS_RDF_UI_SUPPORT_INDEX fa
					LEFT JOIN CEDS_RDF_UI_SUPPORT_INDEX c 
						ON fa.refId = c.functionalAreaRefId 
						AND c.entityType = 'class'
						AND (c.domainRefId = '<!domainRefId!>' 
						     OR c.crossDomainList LIKE '%<!domainRefId!>%')
					WHERE fa.entityType = 'functionalArea'
					GROUP BY fa.refId
					HAVING count > 0
					ORDER BY fa.displayOrder, fa.label
				`,
				
				// Get full details for one entity
				getEntityDetails: `
					SELECT * 
					FROM CEDS_RDF_UI_SUPPORT_INDEX
					WHERE refId = '<!refId!>'
				`,
				
				// Get entities by functional area
				getByFunctionalArea: `
					SELECT 
						refId, 
						entityType, 
						code,
						label, 
						domainRefId,
						isOptionSet,
						crossDomainList,
						displayOrder
					FROM CEDS_RDF_UI_SUPPORT_INDEX
					WHERE functionalAreaRefId = '<!functionalAreaRefId!>'
					AND entityType = 'class'
					ORDER BY label
				`,
				
				// Default query (same as getAllEntities)
				default: `
					SELECT 
						refId, 
						entityType, 
						code,
						label, 
						domainRefId, 
						functionalAreaRefId,
						isOptionSet,
						displayOrder
					FROM CEDS_RDF_UI_SUPPORT_INDEX
					ORDER BY entityType, displayOrder, label
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