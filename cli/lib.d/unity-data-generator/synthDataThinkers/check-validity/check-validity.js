#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot
//const projectRoot=fs.realpathSync(path.join(__dirname, '..', '..')); // adjust the number of '..' to fit reality

const qt = require('qtools-functional-library'); //qt.help({printOutput:true, queryString:'.*', sendJson:false});
const asynchronousPipePlus = new require('qtools-asynchronous-pipe-plus')();
const pipeRunner = asynchronousPipePlus.pipeRunner;
const taskListPlus = asynchronousPipePlus.taskListPlus;

const axios = require('axios');
const https = require('https');

//START OF moduleFunction() ============================================================

const moduleFunction = function (args = {}) {
	const { xLog, getConfig } = process.global;
	const { thinkerParameters={}, promptGenerator } = args; // Extract from args with default
	const localThinkerParameters = thinkerParameters.qtGetSurePath(moduleName, {});
	const allThinkersParameters = thinkerParameters.qtGetSurePath('allThinkers', {});
	
	// Priority: localThinkerParameters > allThinkersParameters > configFromSection
	const configFromSection = getConfig(moduleName);
	const finalConfig = { ...configFromSection, ...allThinkersParameters, ...localThinkerParameters };
	
	xLog.verbose(`Thinker Parameters (${moduleName})\n    `+Object.keys(finalConfig).map(name=>`${name}=${finalConfig[name]}`).join('\n    '));
	

	const { thinkerSpec, smartyPants } = args;

	// ================================================================================
	// UTILITIES

	const httpsAgent = new https.Agent({
		rejectUnauthorized: false,
	});

	// ================================================================================
	// TALK TO AI

	const accessSmartyPants = (synthData, callback) => {
		const localCallback = (err, validationMessage) => {
			let isValid = false;

			if (
				validationMessage
					.qtGetSurePath('error', '')
					.match(/Element 'identity' cannot have character/)
			) {
				isValid = true;
			}

			if (validationMessage.pass) {
				isValid = true;
			}
			xLog.verbose(
				`DATA VALIDATION RESULT: ${JSON.stringify(validationMessage, '', '\t')}`,
			);
			callback('', { validationMessage, isValid });
		};

		const url = finalConfig.validationUrl;
		xLog.progress(`validating with ${url}`);

		const axiosParms = {
			method: 'post',
			url,
			data: synthData,
			headers: {
				Accept: '*/*',
				'Content-Type': 'text/plain',
				'Accept-Language': 'en-US,en;q=0.5',
				'X-Requested-With': 'XMLHttpRequest',
				Connection: 'keep-alive',
				Referer: 'Unity Data Generator',
				Pragma: 'no-cache',
				'Cache-Control': 'no-cache',
			},
		};

		if (url.match(/^https/i)) {
			axiosParms.httpsAgent = httpsAgent;
		}

		axios(axiosParms)
			.then((response) => {
				const result = response.data;
				localCallback('', result);
			})
			.catch((err) => {
				localCallback(
					`${err.toString()} ${decodeURI(err.qtGetSurePath('response.data', 'no message'))}`,
				);
			});
	};

	// ================================================================================
	// ================================================================================
	// DO THE JOB

	const executeRequest = (args, callback) => {
		const { wisdomBus } = args;
		
		if (!wisdomBus) {
			return callback(new Error(`${moduleName}: wisdom-bus is required`));
		}

		// Read from wisdom-bus instead of latestWisdom
		const synthData = wisdomBus.get('generatedSynthData');

		if (!synthData) {
			const errorMsg = `CRITICAL ERROR in ${moduleName}: No generatedSynthData found in wisdom-bus. This is required input for check-validity processing.`;
			xLog.error(errorMsg);
			throw new Error(errorMsg);
		}

		const refinementReportPartialTemplate = wisdomBus.get('refinementReportPartialTemplate') ||
			'got nothing from previous process (fix-problems.js)';

		const { unused } = args;
		const taskList = new taskListPlus();

		// --------------------------------------------------------------------------------
		// TASKLIST ITEM TEMPLATE

		taskList.push((args, next) => {
			const { synthData, wisdomBus } = args;

			const localCallback = (err, result) => {
				const { validationMessage, isValid } = result;
				if (err) {
					next(err, args); //next('skipRestOfPipe', args);
					return;
				}

				const fileOutputString = refinementReportPartialTemplate
					? refinementReportPartialTemplate.replace(
							/<!validationMessage!>/,
							JSON.stringify(validationMessage, '', '\t'),
						)
					: `No refinement report was generated for inValid synthData error ${validationMessage}`;

				xLog.saveProcessFile(
					`${moduleName}_refinementReports.log`,
					fileOutputString,
					{ append: true },
				);

				xLog.saveProcessFile(`${moduleName}_lastOneChecked.synthData`, synthData, {
					append: false,
				});

				const errorDisplay = `\n${JSON.stringify(validationMessage, '', '\t')}\n--------------------\n`;
				xLog.saveProcessFile(`${moduleName}_responseList.log`, errorDisplay, {
					append: true,
				});

				// Write results to wisdom-bus
				wisdomBus.add('generatedSynthData', synthData);
				wisdomBus.add('validationMessage', validationMessage);
				wisdomBus.add('isValid', isValid);

				next('', { ...args, isValid });
			};

			accessSmartyPants(synthData, localCallback);
		});

		// --------------------------------------------------------------------------------
		// INIT AND EXECUTE THE PIPELINE

		const initialData = {
			...args,
			synthData,
			wisdomBus
		};
		pipeRunner(taskList.getList(), initialData, (err, args) => {
			const { isValid } = args;
			if (isValid) {
				xLog.progress(`synthData passed validation check`);
			} else {
				xLog.error(`synthData did NOT pass validation check`);
			}
			// Return success only (no wisdom)
			callback(err, { 
				success: true,
				message: `Validation ${isValid ? 'passed' : 'failed'}`
			});
		});
	};

	return { executeRequest };
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;
//module.exports = new moduleFunction();
//moduleFunction().workingFunction().qtDump();

