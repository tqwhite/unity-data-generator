#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

//START OF moduleFunction() ============================================================

const moduleFunction = function (args = {}) {
	const { xLog, getConfig } = process.global;
	
	// Import parameter mapper
	const parameterMapperGen = require('./parameter-mapper');
	const parameterMapper = parameterMapperGen({});

	// ================================================================================
	// OPERATION TYPE DETECTION

	const determineOperationType = (commandLineParameters) => {
		const { switches, values } = commandLineParameters;

		// Framework route detection
		if (switches.useFramework) {
			// Determine specific framework operation based on other flags
			if (values.queryString) {
				return {
					route: 'framework',
					operation: 'query',
					thoughtProcess: values.thoughtProcess?.[0] || 'Vector_Query_Thought_Process'
				};
			}
			if (switches.writeVectorDatabase || values.writeVectorDatabase) {
				// Determine vector generation type based on semanticAnalysisMode
				const semanticMode = values.semanticAnalysisMode?.[0] || 'simpleVector';
				return {
					route: 'framework',
					operation: 'generateVectors',
					thoughtProcess: semanticMode === 'atomicVector' ? 'Vector_Atomic_Thought_Process' : 'Vector_Simple_Thought_Process'
				};
			}
			// Default framework operation
			return {
				route: 'framework',
				operation: 'query',
				thoughtProcess: 'Vector_Tools_Thought_Process'
			};
		}

		// Legacy route detection
		if (values.queryString) {
			return { route: 'legacy', operation: 'query' };
		}
		if (switches.writeVectorDatabase || values.writeVectorDatabase) {
			return { route: 'legacy', operation: 'generateVectors' };
		}
		if (switches.showStats) {
			return { route: 'legacy', operation: 'showStats' };
		}
		if (switches.dropTable) {
			return { route: 'legacy', operation: 'dropTable' };
		}
		if (switches.rebuildDatabase) {
			return { route: 'legacy', operation: 'rebuildDatabase' };
		}
		if (values.query) {
			return { route: 'legacy', operation: 'directQuery' };
		}

		// Default to legacy if no specific operation detected
		return { route: 'legacy', operation: 'help' };
	};

	// ================================================================================
	// FRAMEWORK ROUTE EXECUTION

	const executeFrameworkRoute = async (operationInfo, initAtp, commandLineParameters) => {
		const { operation, thoughtProcess } = operationInfo;
		const { switches, values } = commandLineParameters;

		xLog.status(`=== FRAMEWORK ROUTE: ${operation.toUpperCase()} ===`);
		xLog.status(`Using thought process: ${thoughtProcess}`);

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

		// Extract original parameters for result formatting
		const originalParams = parameterMapper.extractParametersFromOriginalCall 
			? parameterMapper.extractParametersFromOriginalCall(commandLineParameters)
			: { queryString: values.queryString?.[0], dataProfile: values.dataProfile?.[0] };

		// Map framework result back to CLI format with original parameters
		const mappedResult = parameterMapper.mapFrameworkResultToCli(wisdom, operation, originalParams);
		
		// Display formatted output to console (like legacy system does)
		if (mappedResult && mappedResult._legacyFormatOutput) {
			console.log(mappedResult._legacyFormatOutput);
		}
		
		return mappedResult;
	};

	// ================================================================================
	// LEGACY ROUTE EXECUTION

	const executeLegacyRoute = async (operationInfo, legacyOperations, commandLineParameters) => {
		const { operation } = operationInfo;
		const { switches, values } = commandLineParameters;

		xLog.status(`=== LEGACY ROUTE: ${operation.toUpperCase()} ===`);

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
				return await executeFrameworkRoute(operationInfo, initAtp, commandLineParameters);
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