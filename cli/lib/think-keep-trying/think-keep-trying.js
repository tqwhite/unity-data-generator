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
	

	const jinaConversation = jinaCore.conversationGenerator({
		thoughtProcessName,
	}); // provides .getResponse()

	async function jinaResponder(promptReplacementObject) {
		let isValid = false;
		let validationMessage = '';
		const limit = 5;
		let count = 0;
		let wisdom = '';
		const tempList = [0, 0.2, 0.4, 0.6, 0.8, 1, 1.2, 1.4, 1.6];

		const { xmlString, targetXpathFieldList } = promptReplacementObject;
		
		
		
		
		const promptGenerationData = {
			promptReplacementObject,
			specObj: {},
			currentXml: xmlString,
			potentialFinalObject: xmlString,
			xpathJsonData: JSON.stringify(targetXpathFieldList, '', '\t'),
		};
		
		
		

		do {
			const temperatureFactor = tempList[count];

			const result = await jinaConversation.getResponse(promptGenerationData, {
				temperatureFactor,
			});

			const { rawAiResponseObject, thinkerResponses, lastThinkerName } = result;
			wisdom = result.wisdom;
			isValid = thinkerResponses.qtGetSurePath('checkValidity.isValid', false);
			validationMessage = thinkerResponses.qtGetSurePath(
				'checkValidity.validationMessage',
				false,
			);

			promptGenerationData.currentXml = wisdom;
			promptGenerationData.validationMessage = {
				error: `Element <x> is illegal. Not part of spec`,
			}; //validationMessage;

			if (!isValid) {
				xLog.error('----------------------------------------');
				xLog.error(wisdom);
				xLog.status(`XML Validation Error: `);
				xLog.status(validationMessage);
				xLog.status(`Tries remaining: ${limit - count}`);
				xLog.error('----------------------------------------');
			}

			count++;
		} while (!isValid && count < limit + 1);

		if (!isValid) {
			xLog.error(wisdom);
			throw 'Jina failed to fix the XML';
		}

		return wisdom;
	}

	return { jinaResponder };
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;
//module.exports = new moduleFunction();
//moduleFunction().workingFunction().qtDump();
