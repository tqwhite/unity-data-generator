#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot
//const projectRoot=fs.realpathSync(path.join(__dirname, '..', '..')); // adjust the number of '..' to fit reality

const qt = require('qtools-functional-library'); //qt.help({printOutput:true, queryString:'.*', sendJson:false});
const fs = require('fs');

const prompts = require('./lib/prompts');  
 //START OF moduleFunction() ============================================================

const moduleFunction = function({
	addXmlElement,
	getFieldValue,
	createXmlElement,
	knownIds,
	createUUID,
	jinaCore,
	xmlVersionStack,
	commandLineParameters
}) {
	const { xLog } = process.global;
	// 	process.global = {};
	// 	process.global.xLog = xLog;
	// 	const { getConfig } = args;
	const localConfig = {}; //getConfig(`${moduleName}`);
	
	
	const isDuplicate = (() => {
		let existingObjects = new Set();
		const isDuplicateActual = inputObject => {
			const objectString = JSON.stringify(inputObject);
			if (existingObjects.has(objectString)) {
				return true;
			} else {
				existingObjects.add(objectString);
				return false;
			}
		};

		return isDuplicateActual;
	})();
	
	// =========================================================================
	// GENERATE PROMPT

	const generatePromptForGroupActual = ({ jinaCore }) => {
		// So TQ can see sources of additional information and examples.
		// Note:  Helper of callJina.

		return async function generatePromptForGroup(
			leafXPath,
			specObj,
			segmentStack
		) {
			if (isDuplicate(specObj)) {
				return null;
			}

			const currentXml = segmentStack.qtLast();
			const potentialFinalObject = xmlVersionStack.qtLast();
			const promptGenerationData = {
				specObj,
				currentXml,
				potentialFinalObject
			};

			xLog.debug(
				`\n=-=============  group wisdom  ========================= [call-jina.js.generatePrompt]\n`
			);

			Object.keys(specObj).forEach(path =>
				xLog.debug(`${path}: ${specObj[path].Description}`)
			);

			const {
				wisdom,
				rawAiResponseObject,
				thinkerResponses
			} = await jinaCore.getResponse(promptGenerationData, {}); //getResponse is conducted by the conversationGenerator operating a thoughtProcesss

			const tooShortFlag = false; //(wisdom.length < currentXml.length);
			if (tooShortFlag || rawAiResponseObject.isError) {
				const message = tooShortFlag
					? 'new XML was shorter than incumbent XML'
					: rawAiResponseObject.err;
				xLog.error(
					`\n=-=============   ERROR (${message})  ========================= [call-jina.js.generatePrompt]\n`
				);
				xLog.error(rawAiResponseObject);
				process.exit();
			}

			segmentStack.push(wisdom);
			xmlVersionStack.push(thinkerResponses['xmlReview'].wisdom);
			xLog.status(`segmentStack.length=${segmentStack.length}`);
			xLog.status(`xmlVersionStack.length=${xmlVersionStack.length}`);

			xLog.debug(wisdom);
			xLog.debug(
				`\n=-=============  group wisdom end ========================= [call-jina.js.generatePrompt]\n`
			);
			return wisdom;

			const chars = getFieldValue(leafXPath, 'Characteristics', fields);
			const description = getFieldValue(leafXPath, 'Description', fields);
			if (chars.includes('R')) {
				//xLog.debug(leafXPath, "is part of a list.");
			}
			let name = getFieldValue(leafXPath, 'Name', fields);
			if ('@' == name[0]) {
				name = name.slice(1);
			}
			if (knownIds.includes(name)) {
				return createUUID();
			}
			const format = getFieldValue(leafXPath, 'Format', fields);
			const codes = format.split(', ');
			if (1 < codes.length) {
				return codes[0]; //choose first of potential values in the code set
			}
			return null;
		};
	};
	
	
	
	// =========================================================================
	// GENERATE PROMPT
	const generatePromptActual = ({ jinaCore }) => {
		// So TQ can see sources of additional information and examples.
		// Note:  Helper of callJina.

		return async function generatePrompt(leafXPath, fields, segmentStack) {
			const specObj = {};

			specObj.Name = getFieldValue(leafXPath, 'Name', fields);
			//specObj.Mandatory=getFieldValue(leafXPath, 'Mandatory', fields);
			//specObj.Characteristics = getFieldValue(leafXPath, 'Characteristics', fields);
			//specObj.Type = getFieldValue(leafXPath, 'Type', fields);
			specObj.Description = getFieldValue(leafXPath, 'Description', fields);
			specObj.XPath = getFieldValue(leafXPath, 'XPath', fields);
			//specObj.CEDS_ID=getFieldValue(leafXPath, 'CEDS ID', fields);
			specObj.Format = getFieldValue(leafXPath, 'Format', fields);

			if (isDuplicate(specObj)) {
				return null;
			}

			const currentXml = segmentStack.qtLast();
			const potentialFinalObject = xmlVersionStack.qtLast();
			const promptGenerationData = {
				specObj,
				currentXml,
				potentialFinalObject
			}; 
			 xLog.debug(`specObj.XPath=${specObj.XPath}`);
			xLog.debug(`specObj.Description=${specObj.Description}`);

			const {
				wisdom,
				rawAiResponseObject,
				thinkerResponses
			} = await jinaCore.getResponse(
				promptGenerationData,
				{}
			);   //getResponse is conducted by the conversationGenerator operating a thoughtProcesss
			
			
			
// 			 console.log(`wisdom=${wisdom}`);  
// 			 console.log(' Debug Exit [call-jina.js.generatePrompt]', {
// 				depth: 4,
// 				colors: true
// 			});
// 			process.exit();    //tqDebug
			
			
			
			
			 const tooShortFlag = false; //(wisdom.length < currentXml.length);
			if (tooShortFlag || rawAiResponseObject.isError) {
				const message = tooShortFlag
					? 'new XML was shorter than incumbent XML'
					: rawAiResponseObject.err;
				xLog.error(
					`\n=-=============   ERROR (${message})  ========================= [call-jina.js.generatePrompt]\n`
				);
				xLog.error(rawAiResponseObject);
				process.exit();
			}

			segmentStack.push(wisdom);
			xmlVersionStack.push(thinkerResponses['xmlReview'].wisdom);

			// xLog.status(`segmentStack.length=${segmentStack.length}`);
			// xLog.status(`xmlVersionStack.length=${xmlVersionStack.length}`);

			return wisdom;

			const chars = getFieldValue(leafXPath, 'Characteristics', fields);
			const description = getFieldValue(leafXPath, 'Description', fields);
			if (chars.includes('R')) {
				//xLog.debug(leafXPath, "is part of a list.");
			}
			let name = getFieldValue(leafXPath, 'Name', fields);
			if ('@' == name[0]) {
				name = name.slice(1);
			}
			if (knownIds.includes(name)) {
				return createUUID();
			}
			const format = getFieldValue(leafXPath, 'Format', fields);
			const codes = format.split(', ');
			if (1 < codes.length) {
				return codes[0]; //choose first of potential values in the code set
			}
			return null;
		};
	};

	// =========================================================================
	// MAIN FUNCTION  CALL JINA

	
	// So TQ can see what I expect, that doesn't mean i've got it right.
	// Note:  At a minimum parse the XML you get back from ChatGPT.
	// See:  xml2js.parseString
	
	
	
	async function callJina(groupXPath, children, fields) {
		const groupParts = groupXPath.split('/');
		const groupKey = groupParts[groupParts.length - 1];
		const group = createXmlElement(groupKey);
		const backlog = [];
		let wisdom;

		xLog.debug(
			`\n=-= START ${groupXPath} ========================= [call-jina.js.callJina]\n`
		);
		children.join('; ') && xLog.debug(`children=${children.join('; ')}`);

		const generatePrompt = generatePromptActual({ jinaCore });
		const generatePromptForGroup = generatePromptForGroupActual({ jinaCore });

		if (commandLineParameters.switches.sendGroupsToGenerate) {
			const specsObj = {};

			Object.keys(fields)
				.filter(path => path.match(groupXPath))
				.forEach(path => (specsObj[path] = fields[path]));

			const segmentStack = ['First pass. No incumbent XML.'];
			generatePromptResult = await generatePromptForGroup(
				children.join('\n'),
				specsObj,
				segmentStack
			); // generatePrompt() ======================
			// 			const child = createXmlElement(childKey, {}, generatePromptResult);
			// 			addXmlElement(child, group);
		} else {
			for (const childXPath of children) {
				const segmentStack = ['First pass. Make new XML.'];

				const childParts = childXPath.split('/');
				const childKey = childParts[childParts.length - 1];
				// So we process elements first, then attributes.
				if ('@' != childKey[0]) {
					const generatePromptResult = await generatePrompt(
						childXPath,
						fields,
						segmentStack
					); // generatePrompt() ======================
					wisdom = generatePromptResult ? generatePromptResult : wisdom;
					const child = createXmlElement(childKey, {}, generatePromptResult);
					addXmlElement(child, group);
				} else {
					backlog.push(childXPath);
				}
			}
		}
		// So we process attributes after their tag has been created.
		for (const childXPath of backlog) {
			const segmentStack = ['First round. No incumbent XML.'];
			const childParts = childXPath.split('/');
			const childKey = childParts[childParts.length - 1];
			const key = childKey.slice(1);
			// Group
			if (childXPath.startsWith(groupXPath + '/@')) {
				const generatePromptResult = await generatePrompt(
					childXPath,
					fields,
					segmentStack
				); // generatePrompt() ======================
				wisdom = generatePromptResult ? generatePromptResult : wisdom;
				group[groupKey].$[key] = generatePromptResult;
			} else {
				// Child(ren)
				const elementKey = childParts[childParts.length - 2];
				for (const sequence of group[groupKey][elementKey]) {
					const generatePromptResult = await generatePrompt(
						childXPath,
						fields,
						segmentStack
					); // generatePrompt() ======================
					wisdom = generatePromptResult ? generatePromptResult : wisdom;
					sequence.$[key] = generatePromptResult;
				}
			}
		}

		xLog.debug(
			`\n=-= END callJina ${groupXPath} ========================= [call-jina.js.callJina]\n`
		);

		const outFile = commandLineParameters.qtGetSurePath(
			'values.outFile[0]',
			''
		);

		if (outFile) {
			wisdom && fs.writeFileSync(outFile, wisdom); //note: this has incomplete values written on each iteration. final is complete.
		} else {
			wisdom && xLog.result(wisdom);
		}
		
		return group;
	}
	
	return { callJina };
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;
