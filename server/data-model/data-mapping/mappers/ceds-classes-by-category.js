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

		// Map columns from CEDS_Classes joined with categorization data
		const inputNameMapping = {
			['refId']: 'refId',
			['uri']: 'uri',
			['name']: 'name',
			['label']: 'label',
			['comment']: 'comment',
			['prefLabel']: 'prefLabel',
			['notation']: 'notation',
			['definition']: 'definition',
			['description']: 'description',
			['classType']: 'classType',
			['jsonString']: 'jsonString',
			['confidence']: 'confidence',
			['isPrimary']: 'isPrimary',
			['otherDomains']: 'otherDomains',
			['propertyCount']: 'propertyCount'
		};

		const basicMapper = baseMappingProcess(inputNameMapping);

		const recordMapper = (inObj, direction = 'forward') => {
			const outObj = basicMapper(inObj, { direction });
			
			// Parse jsonString to extract superClasses and equivalentClasses
			if (outObj.jsonString) {
				try {
					const jsonData = JSON.parse(outObj.jsonString);
					outObj.superClasses = jsonData.superClasses || [];
					outObj.equivalentClasses = jsonData.equivalentClasses || [];
					delete outObj.jsonString; // Remove the raw JSON string from output
				} catch (e) {
					outObj.superClasses = [];
					outObj.equivalentClasses = [];
				}
			} else {
				outObj.superClasses = [];
				outObj.equivalentClasses = [];
			}
			
			// Parse otherDomains from comma-separated string
			if (outObj.otherDomains && typeof outObj.otherDomains === 'string') {
				outObj.otherDomains = outObj.otherDomains.split(',').filter(d => d);
			} else if (!outObj.otherDomains) {
				outObj.otherDomains = [];
			}
			
			// Ensure numeric fields
			if (outObj.confidence !== undefined) {
				outObj.confidence = parseFloat(outObj.confidence) || 0;
			}
			if (outObj.isPrimary !== undefined) {
				outObj.isPrimary = parseInt(outObj.isPrimary, 10) === 1;
			}
			if (outObj.propertyCount !== undefined) {
				outObj.propertyCount = parseInt(outObj.propertyCount, 10) || 0;
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
				byDomain: `
					SELECT 
						c.refId,
						c.uri,
						c.name,
						c.label,
						c.comment,
						c.prefLabel,
						c.notation,
						c.definition,
						c.description,
						c.classType,
						c.jsonString,
						cc.confidence,
						cc.isPrimary,
						(
							SELECT GROUP_CONCAT(other.domainRefId)
							FROM CEDS_ClassCategories other
							WHERE other.classRefId = c.refId 
								AND other.domainRefId != cc.domainRefId
						) as otherDomains,
						(
							SELECT COUNT(*)
							FROM CEDS_Properties p
							WHERE p.CEDS_ClassesRefId = c.refId
						) as propertyCount
					FROM CEDS_Classes c
					JOIN CEDS_ClassCategories cc ON c.refId = cc.classRefId
					WHERE cc.domainRefId = '<!domainRefId!>'
					ORDER BY c.label
				`,
				byDomainAndArea: `
					SELECT 
						c.refId,
						c.uri,
						c.name,
						c.label,
						c.comment,
						c.prefLabel,
						c.notation,
						c.definition,
						c.description,
						c.classType,
						c.jsonString,
						cc.confidence,
						cc.isPrimary,
						(
							SELECT GROUP_CONCAT(other.domainRefId)
							FROM CEDS_ClassCategories other
							WHERE other.classRefId = c.refId 
								AND other.domainRefId != cc.domainRefId
						) as otherDomains,
						(
							SELECT COUNT(*)
							FROM CEDS_Properties p
							WHERE p.CEDS_ClassesRefId = c.refId
						) as propertyCount
					FROM CEDS_Classes c
					JOIN CEDS_ClassCategories cc ON c.refId = cc.classRefId
					WHERE cc.domainRefId = '<!domainRefId!>'
						AND cc.functionalAreaRefId = '<!functionalAreaRefId!>'
					ORDER BY c.label
				`,
				getOne: `
					SELECT 
						c.*,
						cc.confidence,
						cc.isPrimary,
						cc.domainRefId,
						(
							SELECT GROUP_CONCAT(other.domainRefId)
							FROM CEDS_ClassCategories other
							WHERE other.classRefId = c.refId 
								AND other.domainRefId != cc.domainRefId
						) as otherDomains,
						(
							SELECT COUNT(*)
							FROM CEDS_Properties p
							WHERE p.CEDS_ClassesRefId = c.refId
						) as propertyCount
					FROM CEDS_Classes c
					LEFT JOIN CEDS_ClassCategories cc ON c.refId = cc.classRefId
					WHERE c.refId = '<!refId!>'
				`,
				all: `
					SELECT 
						c.*,
						cc.confidence,
						cc.isPrimary,
						cc.domainRefId,
						(
							SELECT COUNT(*)
							FROM CEDS_Properties p
							WHERE p.CEDS_ClassesRefId = c.refId
						) as propertyCount
					FROM CEDS_Classes c
					LEFT JOIN CEDS_ClassCategories cc ON c.refId = cc.classRefId
					ORDER BY c.label
				`
			};

			const query = queries[queryName] || queries.byDomain;
			return query.qtTemplateReplace(replaceObject);
		};

		return {
			map: mapper,
			getSql
		};
	};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction({ moduleName });