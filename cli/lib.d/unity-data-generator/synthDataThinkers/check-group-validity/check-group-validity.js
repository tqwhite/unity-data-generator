#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

//START OF moduleFunction() ============================================================
const moduleFunction = function (args = {}) {
	const { xLog, getConfig } = process.global;
	const { thinkerParameters = {}, promptGenerator } = args;
	const localThinkerParameters = thinkerParameters.qtGetSurePath(moduleName, {});
	const allThinkersParameters = thinkerParameters.qtGetSurePath('allThinkers', {});
	
	// Priority: localThinkerParameters > allThinkersParameters > configFromSection
	const configFromSection = getConfig(moduleName);
	const finalConfig = { ...configFromSection, ...allThinkersParameters, ...localThinkerParameters };
	
	xLog.verbose(`Thinker Parameters (${moduleName})\n    `+Object.keys(finalConfig).map(name=>`${name}=${finalConfig[name]}`).join('\n    '));

	const executeRequest = (args, callback) => {
		xLog.status(`\n===============   ${moduleName}  ========================= [conversation-generator.js.moduleFunction]\n`);

		const latestWisdom = args.qtGetSurePath('latestWisdom');
		
		// Debug: Let's see what we have in latestWisdom
		xLog.status(`check-group-validity: Received wisdom keys: ${Object.keys(latestWisdom).join(', ')}`);
		xLog.status(`check-group-validity: processedElements type: ${typeof latestWisdom.processedElements}`);
		if (latestWisdom.processedElements) {
			xLog.status(`check-group-validity: processedElements length: ${Array.isArray(latestWisdom.processedElements) ? latestWisdom.processedElements.length : 'not array'}`);
		}
		
		const { processedElements } = latestWisdom;
		
		if (!processedElements) {
			const wisdom = {
				...latestWisdom,
				isValid: false,
				validationMessage: {
					errorCount: 1,
					errors: [{
						type: "structuralError",
						severity: "critical",
						issue: "processedElements is missing",
						fix: "Ensure processedElements contains JSON data"
					}],
					summary: "Critical structural error - no processedElements to validate"
				}
			};
			callback('', { wisdom, args });
			return;
		}

		// Normalize processedElements to array format for validation
		const elementsArray = Array.isArray(processedElements) ? processedElements : [processedElements];
		xLog.status(`check-group-validity: Validating ${elementsArray.length} element(s)`);

		// Perform fast validation checks
		const validationResult = validateGroupData(elementsArray);
		
		if (validationResult.isValid) {
			xLog.status(`check-group-validity: PASSED - All validation checks successful`);
		} else {
			xLog.status(`check-group-validity: FAILED - Found ${validationResult.validationMessage.errorCount} validation errors`);
		}

		// Create detailed validation report in UDG style
		const timestamp = new Date().toLocaleString();
		const validationReportTemplate = `
====================================================================================================
JEDX Group VALIDATION PASS ${timestamp}

The processed elements below were evaluated for group coherence. Here are the details of the validation process...

------------------------
Element Count: ${elementsArray.length}
------------------------

------------------------
Processed Elements Summary:
${elementsArray.map((element, index) => {
	const elementKeys = Object.keys(element);
	return `Element ${index + 1}: ${elementKeys.join(', ')}`;
}).join('\n')}
------------------------

------------------------
Validation Checks Performed:
1. **Referential Integrity**: Checking that all foreign keys (fields ending in 'RefId') point to existing entities
2. **RefId Uniqueness**: Verifying that all primary RefIds are unique across the dataset
3. **Hierarchical Completeness**: Ensuring required parent entities exist for referenced children
4. **Distribution Balance**: Checking that child entities are distributed reasonably among parents
------------------------

------------------------
Validation Results:
${validationResult.isValid ? 'PASSED - All validation checks successful' : `FAILED - Found ${validationResult.validationMessage.errorCount} validation errors`}
------------------------

${validationResult.isValid ? '' : `
------------------------
Validation Errors Found:
${validationResult.validationMessage.errors.map((error, index) => 
	`${index + 1}. **${error.type}** (${error.severity}): ${error.issue}
   Fix: ${error.fix}`
).join('\n')}
------------------------
`}

The validation process completed with result:

${JSON.stringify(validationResult.validationMessage || { status: "All checks passed" }, '', '\t')}

------------------------
		
====================================================================================================`;

		xLog.saveProcessFile(
			`${moduleName}_validationReports.log`,
			validationReportTemplate,
			{ append: true }
		);

		// Save the last checked elements (following UDG pattern)
		xLog.saveProcessFile(
			`${moduleName}_lastElementsChecked.json`,
			JSON.stringify(elementsArray, null, 2),
			{ append: false }
		);

		// Save response list (following UDG pattern)  
		const responseDisplay = `\n${JSON.stringify(validationResult.validationMessage || { status: "All checks passed" }, '', '\t')}\n--------------------\n`;
		xLog.saveProcessFile(`${moduleName}_responseList.log`, responseDisplay, {
			append: true,
		});

		const wisdom = {
			...latestWisdom,
			isValid: validationResult.isValid,
			validationMessage: validationResult.validationMessage
		};

		callback('', { wisdom, args });
	};

	return { executeRequest };
};

//============================================================
// Core validation functions
//============================================================

const validateGroupData = (processedElements) => {
	const errors = [];
	
	try {
		// Build RefId registry for fast lookup
		const refIdRegistry = buildRefIdRegistry(processedElements);
		
		// Critical validation checks (fail fast)
		errors.push(...checkReferentialIntegrity(processedElements, refIdRegistry));
		errors.push(...checkRefIdUniqueness(processedElements));
		errors.push(...checkHierarchicalCompleteness(processedElements));
		
		// Important validation checks
		errors.push(...checkDistributionBalance(processedElements));
		
		return {
			isValid: errors.length === 0,
			validationMessage: errors.length > 0 ? {
				errorCount: errors.length,
				errors: errors,
				summary: summarizeErrors(errors)
			} : null
		};
		
	} catch (error) {
		return {
			isValid: false,
			validationMessage: {
				errorCount: 1,
				errors: [{
					type: "validationError",
					severity: "critical",
					issue: `Validation process failed: ${error.message}`,
					fix: "Review data structure and try again"
				}],
				summary: "Critical validation process error"
			}
		};
	}
};

const buildRefIdRegistry = (processedElements) => {
	const registry = new Map();
	
	processedElements.forEach((element, index) => {
		// Handle both direct objects and wrapped objects
		const data = element.data || element;
		
		// Find the entity object (job, worker, organization, etc.)
		Object.keys(data).forEach(key => {
			if (typeof data[key] === 'object' && data[key].RefId) {
				const refId = data[key].RefId;
				const entityType = key;
				
				if (registry.has(refId)) {
					// Track duplicates
					const existing = registry.get(refId);
					existing.duplicateLocations.push({ entityType, index });
				} else {
					registry.set(refId, {
						entityType,
						index,
						duplicateLocations: []
					});
				}
			}
		});
	});
	
	return registry;
};

const checkReferentialIntegrity = (processedElements, refIdRegistry) => {
	const errors = [];
	
	processedElements.forEach((element, index) => {
		const data = element.data || element;
		
		Object.keys(data).forEach(entityKey => {
			const entity = data[entityKey];
			if (typeof entity === 'object' && entity) {
				
				// Check all foreign key fields (ending in RefId)
				Object.keys(entity).forEach(fieldKey => {
					if (fieldKey.endsWith('RefId') && fieldKey !== 'RefId') {
						const foreignKeyValue = entity[fieldKey];
						
						if (foreignKeyValue && !refIdRegistry.has(foreignKeyValue)) {
							// Suggest available RefIds of the expected type
							const expectedType = fieldKey.replace('RefId', '');
							const availableRefs = Array.from(refIdRegistry.entries())
								.filter(([refId, info]) => info.entityType.toLowerCase().includes(expectedType.toLowerCase()))
								.map(([refId]) => refId)
								.slice(0, 3); // Limit suggestions
							
							errors.push({
								type: "referentialIntegrity",
								severity: "critical",
								entity: `${entityKey} (index ${index})`,
								field: fieldKey,
								issue: `Points to non-existent ${expectedType} RefId`,
								current: foreignKeyValue,
								available: availableRefs.length > 0 ? availableRefs : ["No matching entities found"],
								fix: `Change ${fieldKey} to one of the available ${expectedType} RefIds`
							});
						}
					}
				});
			}
		});
	});
	
	return errors;
};

const checkRefIdUniqueness = (processedElements) => {
	const errors = [];
	const refIdRegistry = buildRefIdRegistry(processedElements);
	
	refIdRegistry.forEach((info, refId) => {
		if (info.duplicateLocations.length > 0) {
			const allLocations = [
				{ entityType: info.entityType, index: info.index },
				...info.duplicateLocations
			];
			
			errors.push({
				type: "refIdDuplication",
				severity: "critical",
				issue: `RefId '${refId}' is used by multiple entities`,
				duplicateCount: allLocations.length,
				locations: allLocations.map(loc => `${loc.entityType} (index ${loc.index})`),
				fix: `Generate unique RefIds for duplicate entities, keeping one original`
			});
		}
	});
	
	return errors;
};

const checkHierarchicalCompleteness = (processedElements) => {
	const errors = [];
	const refIdRegistry = buildRefIdRegistry(processedElements);
	
	// Check for required organization entities
	const hasOrganization = Array.from(refIdRegistry.values())
		.some(info => info.entityType.toLowerCase().includes('organization'));
	
	// Find entities that reference organizations
	const organizationRefs = new Set();
	processedElements.forEach(element => {
		const data = element.data || element;
		Object.values(data).forEach(entity => {
			if (entity && entity.organizationRefId) {
				organizationRefs.add(entity.organizationRefId);
			}
		});
	});
	
	if (organizationRefs.size > 0 && !hasOrganization) {
		errors.push({
			type: "hierarchicalCompleteness",
			severity: "critical",
			issue: "Entities reference organizations but no organization entities exist",
			referencedOrganizations: Array.from(organizationRefs),
			fix: "Create organization entities with the referenced RefIds"
		});
	}
	
	return errors;
};

const checkDistributionBalance = (processedElements) => {
	const errors = [];
	const entityCounts = {};
	const relationships = {};
	
	// Count entity types and their relationships
	processedElements.forEach(element => {
		const data = element.data || element;
		Object.keys(data).forEach(entityType => {
			const entity = data[entityType];
			if (entity && entity.RefId) {
				// Count entity types
				entityCounts[entityType] = (entityCounts[entityType] || 0) + 1;
				
				// Track parent-child relationships
				Object.keys(entity).forEach(field => {
					if (field.endsWith('RefId') && field !== 'RefId') {
						const parentType = field.replace('RefId', '');
						const parentRefId = entity[field];
						
						if (!relationships[parentRefId]) {
							relationships[parentRefId] = { children: [], parentType };
						}
						relationships[parentRefId].children.push({
							childType: entityType,
							childRefId: entity.RefId
						});
					}
				});
			}
		});
	});
	
	// Check for uneven distribution among parents
	Object.entries(relationships).forEach(([parentRefId, info]) => {
		const childCounts = {};
		info.children.forEach(child => {
			childCounts[child.childType] = (childCounts[child.childType] || 0) + 1;
		});
		
		// For each child type, check if distribution could be more balanced
		Object.entries(childCounts).forEach(([childType, count]) => {
			const totalChildren = count;
			const totalParents = Object.keys(relationships).filter(id => 
				relationships[id].children.some(c => c.childType === childType)
			).length;
			
			if (totalParents > 1 && totalChildren > totalParents) {
				const idealDistribution = Math.floor(totalChildren / totalParents);
				if (count > idealDistribution + 1) {
					errors.push({
						type: "distributionImbalance",
						severity: "important",
						issue: `Uneven distribution of ${childType} entities`,
						current: `${info.parentType} '${parentRefId}' has ${count} ${childType} entities`,
						totalParents,
						totalChildren,
						idealRange: `${idealDistribution} to ${idealDistribution + 1} per parent`,
						fix: `Redistribute ${childType} entities more evenly among ${info.parentType} entities`
					});
				}
			}
		});
	});
	
	return errors;
};

const summarizeErrors = (errors) => {
	const severityCounts = {
		critical: errors.filter(e => e.severity === 'critical').length,
		important: errors.filter(e => e.severity === 'important').length,
		minor: errors.filter(e => e.severity === 'minor').length
	};
	
	const typeCounts = {};
	errors.forEach(error => {
		typeCounts[error.type] = (typeCounts[error.type] || 0) + 1;
	});
	
	const summary = [`${errors.length} issues found`];
	
	if (severityCounts.critical > 0) summary.push(`${severityCounts.critical} critical`);
	if (severityCounts.important > 0) summary.push(`${severityCounts.important} important`);
	if (severityCounts.minor > 0) summary.push(`${severityCounts.minor} minor`);
	
	const typeList = Object.entries(typeCounts)
		.map(([type, count]) => `${count} ${type}`)
		.join(', ');
	
	return `${summary.join(', ')} (${typeList})`;
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;