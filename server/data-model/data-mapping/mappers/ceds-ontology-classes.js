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
		

		// Map all columns from CEDS_Classes and CEDS_Properties tables, except jsonString
		const inputNameMapping = {
			// Class fields - mapper takes the SQL column name and maps to our JS property name
			['refId']: 'c.refId',
			['uri']: 'c.uri',
			['name']: 'c.name',
			['label']: 'c.label',
			['comment']: 'c.comment',
			['prefLabel']: 'c.prefLabel',
			['notation']: 'c.notation',
			['definition']: 'c.definition',
			['description']: 'c.description',
			['classType']: 'c.classType',
			['createdAt']: 'c.createdAt',
			['updatedAt']: 'c.updatedAt',
			
			// Property fields
			['propertyRefId']: 'p.refId',
			['propertyUri']: 'p.uri',
			['propertyName']: 'p.name',
			['propertyLabel']: 'p.label',
			['propertyComment']: 'p.comment',
			['propertyPrefLabel']: 'p.prefLabel',
			['propertyNotation']: 'p.notation',
			['propertyDefinition']: 'p.definition',
			['propertyDescription']: 'p.description',
			['propertyType']: 'p.propertyType',
			['propertyCreatedAt']: 'p.createdAt',
			['propertyUpdatedAt']: 'p.updatedAt',
		};

		const basicMapper = baseMappingProcess(inputNameMapping);
		

		const recordMapper = (inObj, direction = 'forward') => {

			const outObj = basicMapper(inObj, {direction});
			return outObj;
		};
		

		const mapper = (inData, direction = 'forward') => {
			if (Array.isArray(inData)) {
				// Process the data and group by class
				const classesMap = {};
				
				inData.forEach((item) => {
					const mappedItem = recordMapper(item, direction);
					const classId = mappedItem.refId;
					
					// Initialize class object if not exists
					if (!classesMap[classId]) {
						classesMap[classId] = {
							refId: mappedItem.refId,
							uri: mappedItem.uri,
							name: mappedItem.name,
							label: mappedItem.label,
							comment: mappedItem.comment,
							prefLabel: mappedItem.prefLabel,
							notation: mappedItem.notation,
							definition: mappedItem.definition,
							description: mappedItem.description,
							classType: mappedItem.classType,
							createdAt: mappedItem.createdAt,
							updatedAt: mappedItem.updatedAt,
							properties: []
						};
					}
					
					// Add property if it exists
					if (mappedItem.propertyRefId) {
						classesMap[classId].properties.push({
							refId: mappedItem.propertyRefId,
							uri: mappedItem.propertyUri,
							name: mappedItem.propertyName,
							label: mappedItem.propertyLabel,
							comment: mappedItem.propertyComment,
							prefLabel: mappedItem.propertyPrefLabel,
							notation: mappedItem.propertyNotation,
							definition: mappedItem.propertyDefinition,
							description: mappedItem.propertyDescription,
							propertyType: mappedItem.propertyType,
							createdAt: mappedItem.propertyCreatedAt,
							updatedAt: mappedItem.propertyUpdatedAt
						});
					}
				});
				
				// Convert map to array
				return Object.values(classesMap);
			}
			return recordMapper(inData, direction);
		};
		
		
		const getSql = (queryName, replaceObject = {}) => {
			if (typeof(queryName)=='object'){
				replaceObject=queryName;
				queryName='default'
			}
			const queries={
				default: `
					SELECT
						c.refId as 'c.refId',
						c.uri as 'c.uri',
						c.name as 'c.name',
						c.label as 'c.label',
						c.comment as 'c.comment',
						c.prefLabel as 'c.prefLabel',
						c.notation as 'c.notation',
						c.definition as 'c.definition',
						c.description as 'c.description',
						c.classType as 'c.classType',
						c.createdAt as 'c.createdAt',
						c.updatedAt as 'c.updatedAt',
						c.jsonString as 'c.jsonString',
						
						p.refId as 'p.refId',
						p.CEDS_ClassesRefId as 'p.CEDS_ClassesRefId',
						p.uri as 'p.uri',
						p.name as 'p.name',
						p.label as 'p.label',
						p.comment as 'p.comment',
						p.prefLabel as 'p.prefLabel',
						p.notation as 'p.notation',
						p.definition as 'p.definition',
						p.description as 'p.description',
						p.propertyType as 'p.propertyType',
						p.createdAt as 'p.createdAt',
						p.updatedAt as 'p.updatedAt',
						p.jsonString as 'p.jsonString'
					FROM
						CEDS_Classes c
					LEFT JOIN
						CEDS_Properties p ON c.refId = p.CEDS_ClassesRefId
				`
			}
			const sql = queries[queryName];
			
			return sql.qtTemplateReplace(replaceObject);
		};

		return { map: mapper, getSql };
	};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction({ moduleName }); //returns initialized moduleFunction