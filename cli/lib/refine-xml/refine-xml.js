#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot
//const projectRoot=fs.realpathSync(path.join(__dirname, '..', '..')); // adjust the number of '..' to fit reality

const qt = require('qtools-functional-library'); //qt.help({printOutput:true, queryString:'.*', sendJson:false});
const asynchronousPipePlus = new require('qtools-asynchronous-pipe-plus')();
const pipeRunner = asynchronousPipePlus.pipeRunner;
const taskListPlus = asynchronousPipePlus.taskListPlus;

//START OF moduleFunction() ============================================================

const moduleFunction = function ({ jinaRefiner, commandLineParameters }) {
	//jinaRefiner is jinaCore/conversationGenerator with different parameters

	const { xLog, getConfig } = process.global;
	const localConfig = getConfig(moduleName); //getConfig(`${moduleName}`);
	

	async function callRefiner({ xmlString, targetXpathFieldList }) {
		let isValid = false;
		let validationMessage = '';
		const limit=2;
		let count = 0;
		let wisdom = '';

		const promptGenerationData = {
			specObj: {},
			currentXml: xmlString,
			potentialFinalObject: xmlString,
			xpathJsonData: JSON.stringify(targetXpathFieldList, '', '\t'),
		};

		do {
			const result = await jinaRefiner.getResponse(promptGenerationData, {});

			const { rawAiResponseObject, thinkerResponses, lastThinkerName } = result;
			wisdom = result.wisdom;
			isValid = thinkerResponses.qtGetSurePath('checkValidity.isValid', false);
			validationMessage = thinkerResponses.qtGetSurePath(
				'checkValidity.validationMessage',
				false,
			);

			promptGenerationData.currentXml = wisdom;
			promptGenerationData.validationMessage = `Element <x> is illegal. Not part of spec`;//validationMessage;


			if (!isValid) {
				xLog.error('----------------------------------------');
				xLog.error(wisdom);
				xLog.status(`XML Validation Error: ${validationMessage}`);
				xLog.status(`Tries remaining: ${limit - count}`);
				xLog.error('----------------------------------------');
			}

			count++;

		} while (!isValid && count < limit+1);

		if (!isValid) {
			xLog.error(wisdom);
			throw 'Jina failed to fix the XML';
		}

		return wisdom;
	}

	return { callRefiner };
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;
//module.exports = new moduleFunction();
//moduleFunction().workingFunction().qtDump();

