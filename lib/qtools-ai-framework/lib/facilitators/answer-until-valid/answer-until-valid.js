#!/usr/bin/env node
'use strict';

/*
 * ANSWER-UNTIL-VALID FACILITATOR
 * ==============================
 * 
 * This facilitator implements a validation loop that repeatedly runs a conversation
 * until the output passes validation, supporting error correction workflows.
 * 
 * KEY DATA FLOW CONCEPTS:
 * ----------------------
 * 1. VALIDATION LOOP:
 *    - Runs the configured conversation (e.g., 'refiner')
 *    - Checks if output is valid (via isValid field)
 *    - If invalid, adds validationMessage to wisdom and repeats
 *    - Continues until valid or limit reached
 * 
 * 2. WISDOM ACCUMULATION:
 *    - Initial wisdom flows into first attempt
 *    - Each iteration adds: validationMessage, temperature adjustment
 *    - Final valid result preserves all accumulated wisdom
 * 
 * 3. TEMPERATURE ESCALATION:
 *    - Starts at base temperature (0)
 *    - Increases with each retry to encourage variation
 *    - Temperature factors: [0, 0.2, 0.4, 0.6, 0.8, 1, 1.2, 1.4, 1.6]
 * 
 * 4. CRITICAL DATA FLOW PATTERNS:
 *    - passThroughObject.latestWisdom → conversation → validation check
 *    - Invalid: wisdom + validationMessage → next iteration
 *    - Valid: return final wisdom with generatedSynthData
 * 
 * COMMON INTEGRATION PATTERNS:
 * ---------------------------
 * - UDG: refinerUntilValid → answer-until-valid → refiner → [fix-problems, check-validity]
 * - Nested in arrays: ['unityGenerator', 'refinerUntilValid']
 * 
 * DATA FLOW ISSUES TO WATCH:
 * -------------------------
 * - Must preserve ALL wisdom fields from passThroughObject
 * - validationMessage must flow to fix-problems thinker
 * - Temperature adjustments must propagate to AI calls
 * - generatedSynthData must be preserved through iterations
 */

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot
//const projectRoot=fs.realpathSync(path.join(__dirname, '..', '..')); // adjust the number of '..' to fit reality

const qt = require('qtools-functional-library'); //qt.help({printOutput:true, queryString:'.*', sendJson:false});
const asynchronousPipePlus = new require('qtools-asynchronous-pipe-plus')();
const pipeRunner = asynchronousPipePlus.pipeRunner;
const taskListPlus = asynchronousPipePlus.taskListPlus;

//START OF moduleFunction() ============================================================

const moduleFunction = function ({
	jinaCore,
	conversationName,
	thinkerParameters, // Add this parameter
	thoughtProcessName, // Add this parameter
	commandLineParameters,
}) {
	const { xLog, getConfig } = process.global;
	const localConfig = getConfig(`jina/${moduleName}`); //getConfig(`${moduleName}`);
	xLog.progress(
		`using conversation '${conversationName}' in [${moduleName}]`,
	);


	let wisdomAccessor;
	const facilitatorAccessor = {
		wisdomAccessor: (value) => {
			wisdomAccessor = value;
		},
	};
	// Create the conversation that will be run in the validation loop
	// This conversation typically includes validation and correction thinkers
	const jinaConversation = jinaCore.conversationGenerator({
		conversationName,    // e.g., 'refiner' which runs fix-problems → check-validity
		thinkerParameters,   // Pass configuration to thinkers
		thoughtProcessName,  // Pass thought process context
		facilitatorAccessor
	}); // provides .getResponse()

	async function facilitator(passThroughObject) {
		// =====================================================================
		// VALIDATION LOOP SETUP
		// =====================================================================
		let isValid = false;
		let validationMessage = '';
		
		const limit = localConfig.validationRepairCycleLimit?localConfig.validationRepairCycleLimit:2;
		
		let count = 0;
		let wisdom = '';
		const tempList = [0, 0.2, 0.4, 0.6, 0.8, 1, 1.2, 1.4, 1.6]; // Temperature escalation
		
		let resultWisdom;
		let resultArgs;

		// CRITICAL DATA FLOW: Extract wisdom from passThroughObject
		// This wisdom must flow through all validation iterations
		const { latestWisdom, args } = passThroughObject;
		

		// =====================================================================
		// VALIDATION LOOP EXECUTION
		// =====================================================================
		do {
			const temperatureFactor = tempList[count];
			const options = {
				temperatureFactor,
			};

			// CRITICAL DATA FLOW: Execute conversation with accumulated wisdom
			// NOTE: This appears to be using an older API - should pass wisdom in passThroughObject
			const { latestWisdom: tmpWisdom, args: tmpArgs } =
				await jinaConversation.getResponse(passThroughObject, temperatureFactor, options);
				
			// CRITICAL DATA FLOW: Extract validation results
			// The conversation must set these fields for the loop to work
			resultWisdom=tmpWisdom;
			resultArgs=tmpArgs;
			
			isValid = resultWisdom.isValid;                // Set by check-validity thinker
			validationMessage = resultWisdom.validationMessage; // Error details from validator

			// Update passThroughObject for next iteration
			// This ensures validationMessage flows to fix-problems thinker
			passThroughObject.latestWisdom = resultWisdom;
			passThroughObject.isValid = isValid;

			if (!isValid) {
				// Log validation failure details
				xLog.error('----------------------------------------');
				xLog.error(wisdom);
				xLog.error(`XML Validation Failed: `);
				xLog.error(validationMessage);
				xLog.error(`Tries remaining: ${limit + 1 - count}`);
				xLog.error('----------------------------------------');
			}

			count++;
		} while (!isValid && count < limit + 1);

		// =====================================================================
		// VALIDATION LOOP RESULTS
		// =====================================================================
		if (!isValid) {
			// Failed to validate after all retries - throw error
			validationMessage.thrownBy=moduleName;
			throw validationMessage;
			// throw `Jina 'answer-until-valid.js' never became valid. xPath: ${validationMessage.xpath?validationMessage.xpath:'none given'} Reason: ${validationMessage.error}`;
		}
		
		// CRITICAL DATA FLOW: Return final wisdom with all accumulated data
		// This includes generatedSynthData, isValid, and any other fields added during validation
		return {latestWisdom:resultWisdom, args:resultArgs};
	}

	// Return the facilitator interface
	// The facilitator function is called by conversation-generator when this is a facilitator-managed conversation
	return { facilitator };
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;
//module.exports = new moduleFunction();
//moduleFunction().workingFunction().qtDump();

