#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot
//const projectRoot=fs.realpathSync(path.join(__dirname, '..', '..')); // adjust the number of '..' to fit reality

const qt = require('qtools-functional-library'); //qt.help({printOutput:true, queryString:'.*', sendJson:false});

//START OF moduleFunction() ============================================================

const moduleFunction = function({
	addXmlElement,
	getFieldValue,
	createXmlElement,
	knownIds,
	createUUID,
	jinaCore
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
	
	let temporaryResult="";
	const xmlVersionStack=['First pass. No XML'];
	const promptGeneration=require('./lib/prompt-generation')();
	let requestNumber=0;


	const generatePromptActual = ({ jinaCore }) => {
		// So TQ can see sources of additional information and examples.
		// Note:  Helper of callJina.
		
		return async function generatePrompt(leafXPath, fields) {
			
			const {getResponse}=jinaCore;

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

			const neuronalTransmission=promptGeneration.updatePrompt({requestNumber:requestNumber++, specObj, currentXml:xmlVersionStack.qtLast()});
			const wisdom=await getResponse(neuronalTransmission, {})
			specObj.jina=wisdom.response.message; //ignoring wisdom.responseObj containing specs and history
			xmlVersionStack.push(specObj.jina);

			
	//		console.dir(specObj);

			

			const chars = getFieldValue(leafXPath, 'Characteristics', fields);
			const description = getFieldValue(leafXPath, 'Description', fields);
			if (chars.includes('R')) {
				//console.log(leafXPath, "is part of a list.");
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
		const generatePrompt = generatePromptActual({ jinaCore });

		const groupParts = groupXPath.split('/');
		const groupKey = groupParts[groupParts.length - 1];
		const group = createXmlElement(groupKey);
		const backlog = [];

		for (const childXPath of children) {
			const childParts = childXPath.split('/');
			const childKey = childParts[childParts.length - 1];
			// So we process elements first, then attributes.
			if ('@' != childKey[0]) {
				const child = createXmlElement(
					childKey,
					{},
					await generatePrompt(childXPath, fields)
				);
				addXmlElement(child, group);
			} else {
				backlog.push(childXPath);
			}
		}

		// So we process attributes after their tag has been created.
		for (const childXPath of backlog) {
			const childParts = childXPath.split('/');
			const childKey = childParts[childParts.length - 1];
			const key = childKey.slice(1);
			// Group
			if (childXPath.startsWith(groupXPath + '/@')) {
				group[groupKey].$[key] = await generatePrompt(childXPath, fields);
			} else {
				// Child(ren)
				const elementKey = childParts[childParts.length - 2];
				for (const sequence of group[groupKey][elementKey]) {
					sequence.$[key] = await generatePrompt(childXPath, fields);
				}
			}
		} 
		console.dir(xmlVersionStack);
		 return group;
	}


	return { callJina };
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;


	
	
	
// =========================================================================
// =========================================================================
// DISCARD (for reference)

// So TQ can see sources of additional information and examples.
// Note:  Helper of callJina.
function generateValue(leafXPath, fields) {
	const chars = getFieldValue(leafXPath, 'Characteristics', fields);
	const description = getFieldValue(leafXPath, 'Description', fields);
	if (chars.includes('R')) {
		//console.log(leafXPath, "is part of a list.");
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
}
