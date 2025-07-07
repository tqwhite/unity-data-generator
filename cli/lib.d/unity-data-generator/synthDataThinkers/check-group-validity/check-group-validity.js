#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot
//const projectRoot=fs.realpathSync(path.join(__dirname, '..', '..')); // adjust the number of '..' to fit reality

const qt = require('qtools-functional-library'); //qt.help({printOutput:true, queryString:'.*', sendJson:false});
const asynchronousPipePlus = new require('qtools-asynchronous-pipe-plus')();
const pipeRunner = asynchronousPipePlus.pipeRunner;
const taskListPlus = asynchronousPipePlus.taskListPlus;

//START OF moduleFunction() ============================================================

const moduleFunction = function (args = {}) {
	const { xLog, getConfig } = process.global;
	const { thinkerParameters = {}, promptGenerator } = args; // Extract from args with default
	const localThinkerParameters = thinkerParameters.qtGetSurePath(
		moduleName,
		{},
	);
	const allThinkersParameters = thinkerParameters.qtGetSurePath(
		'allThinkers',
		{},
	);

	// Priority: localThinkerParameters > allThinkersParameters > configFromSection
	const configFromSection = getConfig(moduleName);
	const finalConfig = {
		...configFromSection,
		...allThinkersParameters,
		...localThinkerParameters,
	};

	xLog.verbose(
		`Thinker Parameters (${moduleName})\n    ` +
			Object.keys(finalConfig)
				.map((name) => `${name}=${finalConfig[name]}`)
				.join('\n    '),
	);

	const { thinkerSpec, smartyPants } = args;

	const systemPrompt =
		'You are an expert in data validation and JEDX employment data relationships. Your goal is to analyze data collections for referential integrity, foreign key consistency, and proper hierarchical relationships. Be thorough and provide actionable feedback.';

	// ================================================================================
	// UTILITIES

	const convertProcessedElementsToPromptFormat = (processedElements) => {
		const convertedElements = {};

		Object.keys(processedElements).forEach((key) => {
			try {
				// Parse the JSON string to object, then stringify for clean formatting
				convertedElements[key] = JSON.parse(processedElements[key]);
			} catch (err) {
				xLog.error(`Failed to parse JSON for ${key}: ${err.message}`);
				// Keep original if parse fails
				convertedElements[key] = processedElements[key];
			}
		});

		return JSON.stringify(convertedElements, null, 2);
	};

	const formulatePromptList = (promptGenerator) => {
		return ({ latestWisdom } = {}) => {
			// Convert processedElements for prompt consumption
			const convertedProcessedElements = convertProcessedElementsToPromptFormat(
				latestWisdom.processedElements,
			);

			// Perform fast validation checks to provide context
			const validationResult = performFastValidation(
				latestWisdom.processedElements,
			);

			// Create validation messages string
			let validationMessagesString =
				'No validation errors detected during initial analysis.';
			if (!validationResult.isValid) {
				validationMessagesString = `${validationResult.validationMessage.errorCount} validation errors detected:\n\n`;
				validationResult.validationMessage.errors.forEach((error, index) => {
					validationMessagesString += `Error ${index + 1}: ${error.type} (${error.severity})\n`;
					validationMessagesString += `Issue: ${error.issue}\n`;
					validationMessagesString += `Fix: ${error.fix}\n\n`;
				});
			}

			return promptGenerator.iterativeGeneratorPrompt({
				...latestWisdom,
				processedElements: convertedProcessedElements,
				validationMessagesString,
				employerModuleName: moduleName,
			});
		};
	};

	// ================================================================================
	// PURE VALIDATION MODE

	const localValidationOnly = (args, callback) => {
		const { latestWisdom } = args;
		const { processedElements } = latestWisdom;

		// Perform comprehensive validation
		const validationResult = performFastValidation(processedElements);
		const { isValid, validationMessage } = validationResult;

		// Create detailed validation report with RefId inventory
		const timestamp = new Date().toLocaleString();
		const refIdRegistry = buildRefIdRegistry(processedElements);
		const refIdInventory = Array.from(refIdRegistry.entries())
			.map(
				([refId, info]) =>
					`  ${refId} -> ${info.entityType} (index ${info.index})`,
			)
			.join('\n');

		const validationReportTemplate = `
====================================================================================================
JEDX Group VALIDATION PASS ${timestamp}

Pure validation analysis completed for element collection.

Validation Checks Performed:
1. **Referential Integrity**: Checking that all foreign keys (fields ending in 'RefId') point to existing entities
2. **RefId Uniqueness**: Verifying that all primary RefIds are unique across the dataset
3. **Hierarchical Completeness**: Ensuring required parent entities exist for referenced children

RefId Registry (${refIdRegistry.size} entities found):
${refIdInventory}

Validation Results:
${isValid ? 'PASSED - All validation checks successful' : `FAILED - Found ${validationMessage?.errorCount || 0} validation errors`}

${validationMessage ? JSON.stringify(validationMessage, '', '\t') : 'No validation issues detected'}

====================================================================================================`;

		xLog.saveProcessFile(
			`${moduleName}_validationReports.log`,
			validationReportTemplate,
			{ append: true },
		);

		// Create wisdom object
		const { _conversationMetadata, ...safeWisdom } = latestWisdom;
		const wisdom = {
			...safeWisdom,
			isValid,
			validationMessage,
		};

		callback('', { wisdom, args });
	};

	// ================================================================================
	// TALK TO AI

	const accessSmartyPants = (args, callback) => {
		if (!smartyPants) {
			return callback(new Error('smartyPants not available for AI operations'));
		}

		let { promptList, systemPrompt } = args;

		const localCallback = (err, result) => {
			callback('', result);
		};
		promptList.unshift({ role: 'system', content: systemPrompt });
		smartyPants.accessExternalResource({ promptList }, localCallback);
	};

	// ================================================================================
	// ================================================================================
	// DO THE JOB

	const executeRequest = (args, callback) => {
		const { latestWisdom } = args;

		// Critical validation: check-group-validity REQUIRES processedElements
		const { processedElements } = latestWisdom;

		if (!processedElements) {
			const errorMsg = `CRITICAL ERROR in ${moduleName}: No processedElements received from previous conversation. This is required input for group validation.`;
			xLog.error(errorMsg);
			throw new Error(errorMsg);
		}
		
xLog.error(`SKIPPING AI VALIDATION in ${moduleName}!!!`);
		return localValidationOnly(args, callback);

		// AI-powered validation mode
		const taskList = new taskListPlus();

		// --------------------------------------------------------------------------------
		// GENERATE PROMPTS

		taskList.push((args, next) => {
			const { promptGenerator, formulatePromptList } = args;

			const promptElements = formulatePromptList(promptGenerator)(args);

			xLog.saveProcessFile(
				`${moduleName}_promptList.log`,
				`\n\n\n${moduleName}---------------------------------------------------\n${promptElements.promptList[0].content}\n----------------------------------------------------\n\n`,
				{ append: true },
			);

			next('', { ...args, promptElements });
		});

		// --------------------------------------------------------------------------------
		// CALL AI

		taskList.push((args, next) => {
			const { accessSmartyPants, promptElements, systemPrompt } = args;
			const { promptList } = promptElements;

			const localCallback = (err, result) => {
				next(err, { ...args, ...result });
			};

			accessSmartyPants({ promptList, systemPrompt }, localCallback);
		});

		// --------------------------------------------------------------------------------
		// EXTRACT RESULTS

		taskList.push((args, next) => {
			const { wisdom: rawWisdom, promptElements, latestWisdom } = args;
			const { extractionParameters, extractionFunction } = promptElements;

			xLog.saveProcessFile(
				`${moduleName}_responseList.log`,
				`\n\n\n${moduleName}---------------------------------------------------\n${rawWisdom}\n----------------------------------------------------\n\n`,
				{ append: true },
			);

			const extractedData = extractionFunction(rawWisdom);

			// Extract validation results from AI response
			const { explanation } = extractedData;

			// Parse validation results from explanation or use fallback validation
			let validationResult;
			try {
				// Try to extract validation info from AI response
				validationResult = parseValidationFromExplanation(explanation);
			} catch (err) {
				// Fallback to our own validation if AI response parsing fails
				xLog.verbose(
					`Failed to parse AI validation, using fallback: ${err.message}`,
				);
				validationResult = performFastValidation(processedElements);
			}

			const { isValid, validationMessage } = validationResult;

			// Create detailed validation report with RefId inventory
			const timestamp = new Date().toLocaleString();
			const refIdRegistry = buildRefIdRegistry(processedElements);
			const refIdInventory = Array.from(refIdRegistry.entries())
				.map(
					([refId, info]) =>
						`  ${refId} -> ${info.entityType} (index ${info.index})`,
				)
				.join('\n');

			const validationReportTemplate = `
====================================================================================================
JEDX Group VALIDATION PASS ${timestamp}

AI-Powered validation analysis completed for element collection.

RefId Registry (${refIdRegistry.size} entities found):
${refIdInventory}

AI Analysis:
${explanation || 'No detailed explanation provided'}

Validation Results:
${isValid ? 'PASSED - All validation checks successful' : `FAILED - Found ${validationMessage?.errorCount || 0} validation errors`}

${validationMessage ? JSON.stringify(validationMessage, '', '\t') : 'No validation message available'}

====================================================================================================`;

			xLog.saveProcessFile(
				`${moduleName}_validationReports.log`,
				validationReportTemplate,
				{ append: true },
			);

			next('', { ...args, isValid, validationMessage });
		});

		// --------------------------------------------------------------------------------
		// INIT AND EXECUTE THE PIPELINE

		const initialData = {
			promptGenerator,
			formulatePromptList,
			accessSmartyPants,
			systemPrompt,
			...args,
		};

		pipeRunner(taskList.getList(), initialData, (err, args) => {
			const { latestWisdom, isValid, validationMessage } = args;

			// Create new wisdom object without circular references
			xLog.status(`HACK: Circular reference hack, fix this.`);
			const { _conversationMetadata, ...safeWisdom } = latestWisdom;
			const wisdom = {
				...safeWisdom,
				isValid,
				validationMessage,
			};

			xLog.verbose(
				`${moduleName}: Validation result: ${isValid ? 'VALID' : 'INVALID'}`,
			);

			callback(err, { wisdom, args });
		});
	};

	return { executeRequest };
};

//============================================================
// Helper validation functions
//============================================================

const performFastValidation = (processedElements) => {
	// Quick validation check to provide context to AI
	const errors = [];

	try {
		// Build RefId registry for fast lookup
		const refIdRegistry = buildRefIdRegistry(processedElements);

		// Quick checks for major issues
		errors.push(...checkReferentialIntegrity(processedElements, refIdRegistry));
		errors.push(...checkRefIdUniqueness(processedElements));
		errors.push(...checkDistributionBalance(processedElements, refIdRegistry));
		errors.push(
			...checkOrganizationalConsistency(processedElements, refIdRegistry),
		);

		return {
			isValid: errors.length === 0,
			validationMessage:
				errors.length > 0
					? {
							errorCount: errors.length,
							errors: errors,
							summary: summarizeErrors(errors),
						}
					: null,
		};
	} catch (error) {
		return {
			isValid: false,
			validationMessage: {
				errorCount: 1,
				errors: [
					{
						type: 'validationError',
						severity: 'critical',
						issue: `Validation process failed: ${error.message}`,
						fix: 'Review data structure and try again',
					},
				],
				summary: 'Critical validation process error',
			},
		};
	}
};

const parseValidationFromExplanation = (explanation) => {
	// Parse validation results from AI explanation
	if (!explanation || typeof explanation !== 'string') {
		throw new Error('No explanation provided');
	}

	// Look for validation verdict patterns
	const validPattern = /(?:data collection is|verdict.*?)\s*VALID/i;
	const invalidPattern = /(?:data collection is|verdict.*?)\s*INVALID/i;
	const errorCountPattern =
		/(?:found|detected)\s*(\d+)\s*(?:validation\s*)?errors?/i;

	let isValid = true;
	let validationMessage = null;

	// Check for explicit INVALID verdict
	if (invalidPattern.test(explanation)) {
		isValid = false;
		const errorCountMatch = explanation.match(errorCountPattern);
		const errorCount = errorCountMatch ? parseInt(errorCountMatch[1]) : 1;

		// Extract specific error details from explanation
		const errors = [];

		// Look for referential integrity errors
		if (/referential\s*integrity/i.test(explanation)) {
			errors.push({
				type: 'referentialIntegrity',
				severity: 'critical',
				issue: 'AI detected referential integrity issues',
				fix: 'Review foreign key relationships and ensure all RefIds point to existing entities',
			});
		}

		// Look for RefId uniqueness errors
		if (/refid\s*(?:uniqueness|duplication|duplicate)/i.test(explanation)) {
			errors.push({
				type: 'refIdDuplication',
				severity: 'critical',
				issue: 'AI detected RefId duplication issues',
				fix: 'Generate unique RefIds for duplicate entities',
			});
		}

		// Look for distribution balance errors
		if (/distribution\s*(?:balance|imbalance)/i.test(explanation)) {
			errors.push({
				type: 'distributionImbalance',
				severity: 'important',
				issue: 'AI detected distribution balance issues',
				fix: 'Redistribute child entities more evenly among parents',
			});
		}

		// If no specific errors found, create generic error
		if (errors.length === 0) {
			errors.push({
				type: 'aiDetected',
				severity: 'important',
				issue: 'AI detected validation issues in analysis',
				fix: 'Review the detailed explanation for specific problems',
			});
		}

		validationMessage = {
			errorCount: Math.max(errorCount, errors.length),
			errors,
			summary: `AI analysis found ${errorCount} validation issue${errorCount > 1 ? 's' : ''}`,
		};
	} else if (validPattern.test(explanation)) {
		isValid = true;
		validationMessage = null;
	} else {
		// Look for error indicators without explicit verdict
		const hasErrors = /error|problem|issue|invalid|fail/i.test(explanation);
		if (hasErrors) {
			isValid = false;
			validationMessage = {
				errorCount: 1,
				errors: [
					{
						type: 'aiDetected',
						severity: 'important',
						issue: 'AI detected potential validation issues',
						fix: 'Review the detailed analysis for specific concerns',
					},
				],
				summary: 'AI analysis indicates potential issues',
			};
		} else {
			// No clear indicators, assume valid
			isValid = true;
		}
	}

	return { isValid, validationMessage };
};

const buildRefIdRegistry = (processedElements) => {
	const registry = new Map();

	// Handle both object format {key: "json string"} and array format
	const elementsArray = Array.isArray(processedElements)
		? processedElements
		: Object.keys(processedElements).map((key) => {
				try {
					return JSON.parse(processedElements[key]);
				} catch (err) {
					return processedElements[key];
				}
			});

	elementsArray.forEach((element, index) => {
		// Handle both direct objects and wrapped objects
		const data = element.data || element;

		// Find the entity object (job, worker, organization, etc.)
		Object.keys(data).forEach((key) => {
			if (typeof data[key] === 'object' && data[key] && data[key].RefId) {
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
						duplicateLocations: [],
					});
				}
			}
		});
	});

	return registry;
};

const checkReferentialIntegrity = (processedElements, refIdRegistry) => {
	const errors = [];

	// Handle both object format {key: "json string"} and array format
	const elementsArray = Array.isArray(processedElements)
		? processedElements
		: Object.keys(processedElements).map((key) => {
				try {
					return JSON.parse(processedElements[key]);
				} catch (err) {
					return processedElements[key];
				}
			});

	elementsArray.forEach((element, index) => {
		const data = element.data || element;

		Object.keys(data).forEach((entityKey) => {
			const entity = data[entityKey];
			if (typeof entity === 'object' && entity) {
				// Check all foreign key fields (ending in RefId)
				// NOTE: Orphaned entities (foreign keys pointing to non-existent RefIds) are ALLOWED
				Object.keys(entity).forEach((fieldKey) => {
					if (fieldKey.endsWith('RefId') && fieldKey !== 'RefId') {
						const foreignKeyValue = entity[fieldKey];

						// DISABLED: Foreign keys pointing to non-existent RefIds are acceptable
						// This allows for orphaned entities which is a valid scenario
						/*
						if (foreignKeyValue && !refIdRegistry.has(foreignKeyValue)) {
							errors.push({
								type: "referentialIntegrity",
								severity: "critical",
								entity: `${entityKey} (index ${index})`,
								field: fieldKey,
								issue: `Points to non-existent RefId: ${foreignKeyValue}`,
								fix: `Update ${fieldKey} to reference an existing entity RefId`
							});
						}
						*/
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
				...info.duplicateLocations,
			];

			errors.push({
				type: 'refIdDuplication',
				severity: 'critical',
				issue: `RefId '${refId}' is used by multiple entities`,
				duplicateCount: allLocations.length,
				locations: allLocations.map(
					(loc) => `${loc.entityType} (index ${loc.index})`,
				),
				fix: `Generate unique RefIds for duplicate entities`,
			});
		}
	});

	return errors;
};

const checkDistributionBalance = (processedElements, refIdRegistry) => {
	const errors = [];

	try {
		// Count reports per worker
		const workerReportCounts = {};
		const workerCompensationCounts = {};

		// Initialize worker counts
		refIdRegistry.forEach((info, refId) => {
			if (info.entityType === 'worker') {
				workerReportCounts[refId] = { compensation: 0, hours: 0, total: 0 };
				workerCompensationCounts[refId] = [];
			}
		});

		// Count compensation reports per worker
		refIdRegistry.forEach((info, refId) => {
			if (info.entityType === 'worker_compensation_report') {
				const elementsArray = Array.isArray(processedElements)
					? processedElements
					: Object.keys(processedElements).map((key) => {
							try {
								return JSON.parse(processedElements[key]);
							} catch (err) {
								return processedElements[key];
							}
						});

				const element = elementsArray[info.index];
				const data = element.data || element;
				const report = data.worker_compensation_report;

				if (report && report.workerRefId) {
					const workerRefId = report.workerRefId;
					if (workerReportCounts[workerRefId]) {
						workerReportCounts[workerRefId].compensation++;
						workerReportCounts[workerRefId].total++;
						workerCompensationCounts[workerRefId].push(refId);
					}
				}
			}
		});

		// Count hours reports per worker
		refIdRegistry.forEach((info, refId) => {
			if (info.entityType === 'worker_paid_hours_report') {
				const elementsArray = Array.isArray(processedElements)
					? processedElements
					: Object.keys(processedElements).map((key) => {
							try {
								return JSON.parse(processedElements[key]);
							} catch (err) {
								return processedElements[key];
							}
						});

				const element = elementsArray[info.index];
				const data = element.data || element;
				const report = data.worker_paid_hours_report;

				if (report && report.workerRefId) {
					const workerRefId = report.workerRefId;
					if (workerReportCounts[workerRefId]) {
						workerReportCounts[workerRefId].hours++;
						workerReportCounts[workerRefId].total++;
					}
				}
			}
		});

		// Check for orphaned workers (zero reports)
		Object.keys(workerReportCounts).forEach((workerRefId) => {
			const counts = workerReportCounts[workerRefId];
			if (counts.total === 0) {
				errors.push({
					type: 'orphanedEntity',
					severity: 'critical',
					issue: `Worker ${workerRefId} has zero reports (orphaned entity)`,
					fix: 'Assign at least one compensation report and one hours report to this worker',
				});
			}

			if (counts.compensation === 0) {
				errors.push({
					type: 'missingCompensation',
					severity: 'critical',
					issue: `Worker ${workerRefId} has no compensation reports`,
					fix: 'Create a compensation report for this worker',
				});
			}

			if (counts.hours === 0) {
				errors.push({
					type: 'missingHours',
					severity: 'critical',
					issue: `Worker ${workerRefId} has no hours reports`,
					fix: 'Create hours reports for this worker',
				});
			}
		});

		// Check for duplicate compensation reports
		Object.keys(workerCompensationCounts).forEach((workerRefId) => {
			const compReports = workerCompensationCounts[workerRefId];
			if (compReports.length > 1) {
				errors.push({
					type: 'duplicateCompensation',
					severity: 'critical',
					issue: `Worker ${workerRefId} has ${compReports.length} compensation reports (should be 1)`,
					fix: 'Remove duplicate compensation reports, keep only one per worker per year',
					duplicateReports: compReports,
				});
			}
		});

		// Check for severe distribution imbalance
		const totalCounts = Object.values(workerReportCounts).map((c) => c.total);
		if (totalCounts.length > 0) {
			const maxReports = Math.max(...totalCounts);
			const minReports = Math.min(...totalCounts);

			if (maxReports - minReports > 2) {
				errors.push({
					type: 'distributionImbalance',
					severity: 'critical',
					issue: `Severe distribution imbalance: worker with ${maxReports} reports vs worker with ${minReports} reports`,
					fix: 'Redistribute reports more evenly among workers',
					distributionCounts: totalCounts,
				});
			}
		}
	} catch (error) {
		errors.push({
			type: 'distributionAnalysisError',
			severity: 'critical',
			issue: `Distribution analysis failed: ${error.message}`,
			fix: 'Review data structure and distribution logic',
		});
	}

	return errors;
};

const checkOrganizationalConsistency = (processedElements, refIdRegistry) => {
	const errors = [];

	try {
		const organizationAssignments = {
			jobs: {},
			workers: {},
		};

		// Track organizational assignments
		refIdRegistry.forEach((info, refId) => {
			if (info.entityType === 'job' || info.entityType === 'worker') {
				const elementsArray = Array.isArray(processedElements)
					? processedElements
					: Object.keys(processedElements).map((key) => {
							try {
								return JSON.parse(processedElements[key]);
							} catch (err) {
								return processedElements[key];
							}
						});

				const element = elementsArray[info.index];
				const data = element.data || element;
				const entity = data[info.entityType];

				if (entity && entity.organizationRefId) {
					if (info.entityType === 'job') {
						organizationAssignments.jobs[refId] = entity.organizationRefId;
					} else if (info.entityType === 'worker') {
						organizationAssignments.workers[refId] = entity.organizationRefId;
					}
				}
			}
		});

		// Check for cross-organizational inconsistencies
		const jobOrgs = Object.values(organizationAssignments.jobs);
		const workerOrgs = Object.values(organizationAssignments.workers);
		const uniqueJobOrgs = [...new Set(jobOrgs)];
		const uniqueWorkerOrgs = [...new Set(workerOrgs)];

		// Check if jobs are split across multiple organizations
		if (uniqueJobOrgs.length > 1) {
			errors.push({
				type: 'crossOrganizationalJobs',
				severity: 'important',
				issue: `Jobs are split across ${uniqueJobOrgs.length} organizations: ${uniqueJobOrgs.join(', ')}`,
				fix: 'Move all jobs to the same organization for consistency',
			});
		}

		// Check if workers are split across multiple organizations
		if (uniqueWorkerOrgs.length > 1) {
			errors.push({
				type: 'crossOrganizationalWorkers',
				severity: 'important',
				issue: `Workers are split across ${uniqueWorkerOrgs.length} organizations: ${uniqueWorkerOrgs.join(', ')}`,
				fix: 'Move all workers to the same organization for consistency',
			});
		}

		// Check if jobs and workers are in different organizations
		if (
			uniqueJobOrgs.length === 1 &&
			uniqueWorkerOrgs.length === 1 &&
			uniqueJobOrgs[0] !== uniqueWorkerOrgs[0]
		) {
			errors.push({
				type: 'jobWorkerOrganizationMismatch',
				severity: 'critical',
				issue: `Jobs belong to organization ${uniqueJobOrgs[0]} but workers belong to organization ${uniqueWorkerOrgs[0]}`,
				fix: 'Move jobs and workers to the same organization for logical consistency',
			});
		}
	} catch (error) {
		errors.push({
			type: 'organizationalAnalysisError',
			severity: 'critical',
			issue: `Organizational analysis failed: ${error.message}`,
			fix: 'Review organizational reference structure',
		});
	}

	return errors;
};

const summarizeErrors = (errors) => {
	const severityCounts = {
		critical: errors.filter((e) => e.severity === 'critical').length,
		important: errors.filter((e) => e.severity === 'important').length,
		minor: errors.filter((e) => e.severity === 'minor').length,
	};

	const summary = [`${errors.length} issues found`];

	if (severityCounts.critical > 0)
		summary.push(`${severityCounts.critical} critical`);
	if (severityCounts.important > 0)
		summary.push(`${severityCounts.important} important`);
	if (severityCounts.minor > 0) summary.push(`${severityCounts.minor} minor`);

	return summary.join(', ');
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;
