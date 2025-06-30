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

	// ================================================================================
	// ================================================================================
	// DO THE JOB

	const executeRequest = (args, callback) => {
		const { latestWisdom } = args;

		// Critical validation: coherence-generator REQUIRES processedElements from iterate-over-collection
		const {processedElements} = latestWisdom;
		
		if (!processedElements) {
			const errorMsg = `CRITICAL ERROR in ${moduleName}: No processedElements received from previous conversation. This is required input for coherence analysis.`;
			xLog.error(errorMsg);
			throw new Error(errorMsg);
		}


		const taskList = new taskListPlus();

		// --------------------------------------------------------------------------------
		// LOG THE WISDOM PROPERTY AND SET VALID

		taskList.push((args, next) => {
			const { latestWisdom } = args;

			const {processedElements} = latestWisdom;

			Object.keys(processedElements).forEach(name=>processedElements[name]=processedElements[name].toUpperCase());

			// For answer-until-valid facilitator, we need to return isValid=true
			const isValid = true;
			next('', { ...args, processedElements, isValid });
		});

		// --------------------------------------------------------------------------------
		// INIT AND EXECUTE THE PIPELINE

		const initialData = args;

		pipeRunner(taskList.getList(), initialData, (err, args) => {
			const { latestWisdom, isValid, processedElements } = args;
			
			// Create new wisdom object without circular references
			// Copy all properties except _conversationMetadata which contains circular refs
			xLog.status(`HACK: Circular reference hack, fix this.`);
			const { _conversationMetadata, ...safeWisdom } = latestWisdom;
			const wisdom = {
				...safeWisdom,
				isValid,
			};

			wisdom.processedElements=processedElements; //send the revised data onward
			

			xLog.verbose(
				`${moduleName}: Wisdom property content:\n${JSON.stringify(processedElements, null, 2)}`,
			);
			xLog.saveProcessFile(
				`${moduleName}_processedElements.log`,
				`\n\n\n${moduleName}---------------------------------------------------\n${JSON.stringify(processedElements, null, 2)}\n----------------------------------------------------\n\n`,
				{ append: true },
			);
			
			
			xLog.status(`${moduleName}: Completed with isValid=${isValid}`);
			callback(err, { wisdom, args });
		});
	};

	return { executeRequest };
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;
//module.exports = new moduleFunction();
//moduleFunction().workingFunction().qtDump();
