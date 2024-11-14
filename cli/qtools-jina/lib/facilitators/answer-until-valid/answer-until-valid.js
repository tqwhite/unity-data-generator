#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot
//const projectRoot=fs.realpathSync(path.join(__dirname, '..', '..')); // adjust the number of '..' to fit reality

const qt = require('qtools-functional-library'); //qt.help({printOutput:true, queryString:'.*', sendJson:false});
const asynchronousPipePlus = new require('qtools-asynchronous-pipe-plus')();
const pipeRunner = asynchronousPipePlus.pipeRunner;
const taskListPlus = asynchronousPipePlus.taskListPlus;

//START OF moduleFunction() ============================================================

const moduleFunction = function ({
	jinaCore,
	thoughtProcessName,
	commandLineParameters,
}) {
	const { xLog, getConfig } = process.global;
	const localConfig = getConfig(moduleName); //getConfig(`${moduleName}`);
	xLog.status(
		`using thoughtProcess '${thoughtProcessName}' in [${moduleName}]`,
	);

	const jinaConversation = jinaCore.conversationGenerator({
		thoughtProcessName,
	}); // provides .getResponse()

	async function facilitator(passThroughObject) {
		let isValid = false;
		let validationMessage = '';
		
		const limit = localConfig.validationRepairCycleLimit?localConfig.validationRepairCycleLimit:2;
		
		let count = 0;
		let wisdom = '';
		const tempList = [0, 0.2, 0.4, 0.6, 0.8, 1, 1.2, 1.4, 1.6];
		
		let resultWisdom;
		let resultArgs;

		const { latestWisdom, args } = passThroughObject;

		do {
			const temperatureFactor = tempList[count];
			const options = {
				temperatureFactor,
			};

			const { latestWisdom: tmpWisdom, args: tmpArgs } =
				await jinaConversation.getResponse(passThroughObject, temperatureFactor, options);
				
			resultWisdom=tmpWisdom;
			resultArgs=resultArgs;
			
			isValid = resultWisdom.isValid;
			validationMessage = resultWisdom.validationMessage;

			passThroughObject.latestWisdom = resultWisdom;
			passThroughObject.isValid = isValid;

			if (!isValid) {
				xLog.error('----------------------------------------');
				xLog.error(wisdom);
				xLog.status(`XML Validation Failed: `);
				xLog.status(validationMessage);
				xLog.status(`Tries remaining: ${limit + 1 - count}`);
				xLog.error('----------------------------------------');
			}

			count++;
		} while (!isValid && count < limit + 1);

		if (!isValid) {
			validationMessage.thrownBy=moduleName;
			throw validationMessage;
			// throw `Jina 'answer-until-valid.js' never became valid. xPath: ${validationMessage.xpath?validationMessage.xpath:'none given'} Reason: ${validationMessage.error}`;
		}
		return {latestWisdom:resultWisdom, args:resultArgs};
	}

	return { facilitator };
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;
//module.exports = new moduleFunction();
//moduleFunction().workingFunction().qtDump();

