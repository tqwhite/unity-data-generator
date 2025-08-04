#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

//START OF moduleFunction() ============================================================

const moduleFunction = function (args = {}) {
	const { xLog, getConfig } = process.global;
	
	// Import parameter mapper and feature flags
	const parameterMapperGen = require('./parameter-mapper');
	const parameterMapper = parameterMapperGen({});
	
	const featureFlagsGen = require('./feature-flags');
	const featureFlags = featureFlagsGen({});

	// ================================================================================
	// OPERATION TYPE DETECTION

	const determineOperationType = (commandLineParameters) => {
		const { switches, values } = commandLineParameters;

		// First determine the operation type based on command line parameters
		let operation;
		let thoughtProcess;

		if (values.queryString) {
			operation = 'query';
			thoughtProcess = values.thoughtProcess?.[0] || 'Vector_Query_Thought_Process';
		} else if (switches.writeVectorDatabase || values.writeVectorDatabase) {
			operation = 'generateVectors';
			// Determine vector generation type based on semanticAnalysisMode
			const semanticMode = values.semanticAnalysisMode?.[0] || 'simpleVector';
			thoughtProcess = semanticMode === 'atomicVector' ? 'Vector_Atomic_Thought_Process' : 'Vector_Simple_Thought_Process';
		} else if (switches.showStats) {
			operation = 'showStats';
		} else if (switches.dropTable) {
			operation = 'dropTable';
		} else if (switches.rebuildDatabase) {
			operation = 'rebuildDatabase';
		} else if (values.query) {
			operation = 'directQuery';
		} else {
			operation = 'help';
		}

		// Use feature flags to determine routing (framework vs legacy)
		const routingDecision = featureFlags.shouldUseFramework(operation, commandLineParameters);
		
		xLog.verbose(`${moduleName}: Feature flag decision: ${JSON.stringify(routingDecision)}`);

		if (routingDecision.useFramework) {
			return {
				route: 'framework',
				operation,
				thoughtProcess: thoughtProcess || 'Vector_Tools_Thought_Process',
				routingReason: routingDecision.reason
			};
		} else {
			return {
				route: 'legacy',
				operation,
				routingReason: routingDecision.reason
			};
		}
	};

	// ================================================================================
	// FRAMEWORK ROUTE EXECUTION

	const executeFrameworkRoute = async (operationInfo, initAtp, commandLineParameters, legacyOperations) => {
		const { operation, thoughtProcess, routingReason } = operationInfo;
		const { switches, values } = commandLineParameters;
		const startTime = Date.now();

		xLog.status(`=== FRAMEWORK ROUTE: ${operation.toUpperCase()} ===`);
		xLog.status(`Using thought process: ${thoughtProcess}`);
		xLog.status(`Routing reason: ${routingReason}`);

		try {
			// Get configuration for the thought process
			const { thoughtProcessConversationList, thinkerParameters } = getConfig(thoughtProcess);

			if (!thoughtProcessConversationList) {
				throw new Error(`Thought process '${thoughtProcess}' is not in the configuration file`);
			}

			// Map CLI parameters to framework format
			const mappedParameters = parameterMapper.mapCliParametersToFramework(commandLineParameters, operation);
			
			// Validate required parameters
			parameterMapper.validateRequiredParameters(operation, mappedParameters);
			
			xLog.verbose(`Mapped parameters: ${JSON.stringify(mappedParameters, null, 2)}`);

			// Initialize framework facilitators
			const { findTheAnswer, makeFacilitators } = initAtp({
				configName: 'vectorTools',
			});

			let facilitators = makeFacilitators({
				thoughtProcessConversationList,
				thinkerParameters,
				thoughtProcessName: thoughtProcess,
			});

			// Inject parameters into facilitators
			facilitators = parameterMapper.injectParametersIntoFacilitators(facilitators, mappedParameters);

			// Prepare parameters for framework with mapped CLI parameters
			const frameworkParams = {
				facilitators,
				debugLogName: `vectorTools-${operation}-${Date.now()}`,
				...mappedParameters
			};

			// Execute framework-based processing
			xLog.status('Starting framework processing...');
			const wisdom = await findTheAnswer(frameworkParams);
			xLog.status('Framework processing complete');

			// Validate framework result
			const validation = featureFlags.validateFrameworkResult(wisdom, operation);
			if (!validation.valid) {
				throw new Error(`Framework result validation failed: ${validation.reason}`);
			}

			// Extract original parameters for result formatting
			const originalParams = parameterMapper.extractParametersFromOriginalCall 
				? parameterMapper.extractParametersFromOriginalCall(commandLineParameters)
				: { queryString: values.queryString?.[0], dataProfile: values.dataProfile?.[0] };

			// Map framework result back to CLI format with original parameters
			const mappedResult = parameterMapper.mapFrameworkResultToCli(wisdom, operation, originalParams);
			
			// Display formatted output to console (like legacy system does)
			if (mappedResult && mappedResult._legacyFormatOutput) {
				console.log(mappedResult._legacyFormatOutput);
			} else if (mappedResult) {
				// Fallback: If no formatted output, show basic results
				console.log('Framework results (unformatted):');
				if (mappedResult.results && Array.isArray(mappedResult.results)) {
					mappedResult.results.forEach((result, index) => {
						const score = result.score || result.distance || 'N/A';
						const refId = result.refId || result.record?.GlobalID || `result${index + 1}`;
						const definition = result.record?.Definition || result.definition || 'No description';
						console.log(`${index + 1}. [score: ${score}] ${refId} ${definition}`);
					});
				} else {
					console.log('No results found or results format unrecognized');
				}
			} else {
				xLog.error('No mapped result returned from framework processing');
			}

			// Record successful framework metrics
			const endTime = Date.now();
			featureFlags.recordFrameworkMetrics(operation, startTime, endTime, true);
			
			return mappedResult;

		} catch (error) {
			// Record framework failure metrics
			const endTime = Date.now();
			featureFlags.recordFrameworkMetrics(operation, startTime, endTime, false, error);

			// Handle framework failure with fallback if enabled
			if (legacyOperations) {
				return featureFlags.handleFrameworkFailure(error, operation, commandLineParameters, legacyOperations);
			} else {
				// Re-throw error if no fallback available
				throw error;
			}
		}
	};

	// ================================================================================
	// LEGACY ROUTE EXECUTION

	const executeLegacyRoute = async (operationInfo, legacyOperations, commandLineParameters) => {
		const { operation, routingReason } = operationInfo;
		const { switches, values } = commandLineParameters;

		xLog.status(`=== LEGACY ROUTE: ${operation.toUpperCase()} ===`);
		xLog.status(`Routing reason: ${routingReason}`);

		// Route to appropriate legacy operation
		switch (operation) {
			case 'query':
				return await legacyOperations.queryVectorDatabase();

			case 'generateVectors':
				return await legacyOperations.createVectorDatabase();

			case 'showStats':
				return await legacyOperations.showDatabaseStats();

			case 'dropTable':
				return await legacyOperations.dropVectorTable();

			case 'rebuildDatabase':
				return await legacyOperations.rebuildVectorDatabase();

			case 'directQuery':
				return await legacyOperations.directQueryTool();

			case 'help':
			default:
				legacyOperations.showHelp();
				return null;
		}
	};

	// ================================================================================
	// MAIN ROUTER FUNCTION

	const routeOperation = async (args) => {
		const { commandLineParameters, initAtp, legacyOperations } = args;

		try {
			// Determine which route and operation to use
			const operationInfo = determineOperationType(commandLineParameters);
			
			xLog.verbose(`Operation routing: ${JSON.stringify(operationInfo)}`);

			// Validate route requirements
			if (operationInfo.route === 'framework' && !initAtp) {
				throw new Error('Framework route requested but initAtp not provided');
			}
			if (operationInfo.route === 'legacy' && !legacyOperations) {
				throw new Error('Legacy route requested but legacyOperations not provided');
			}

			// Execute the appropriate route
			if (operationInfo.route === 'framework') {
				return await executeFrameworkRoute(operationInfo, initAtp, commandLineParameters, legacyOperations);
			} else {
				return await executeLegacyRoute(operationInfo, legacyOperations, commandLineParameters);
			}

		} catch (error) {
			xLog.error(`Operation routing error: ${error.message}`);
			throw error;
		}
	};

	// ================================================================================
	// PUBLIC API

	return {
		routeOperation,
		determineOperationType,
		executeFrameworkRoute,
		executeLegacyRoute
	};
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;