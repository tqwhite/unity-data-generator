#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot
//const projectRoot=fs.realpathSync(path.join(__dirname, '..', '..')); // adjust the number of '..' to fit reality

const qt = require('qtools-functional-library'); //qt.help({printOutput:true, queryString:'.*', sendJson:false});

//START OF moduleFunction() ============================================================

const moduleFunction = function(args = {}) {
	
	const { xLog, getConfig } = process.global;
	const localConfig = getConfig(moduleName); //getConfig(`${moduleName}`);
	const iterativeGeneratorPrompt = args => {
		const {
			specObj,
			currentXml,
			employerModuleName,
			potentialFinalObject
		} = args;

		const promptLibrary = require(localConfig.promptLibraryModulePath)(); 
		
		 const {
			promptTemplate,
			extractionParameters
		} = promptLibrary[employerModuleName];

		const replaceObj = {
			...args,
			specObjJson: JSON.stringify(specObj, '', '\t'),
			currentXml,
			potentialFinalObject,
			...extractionParameters
		};

		//const pleaForHelp = `Repeat this exact information back for testing: "${specObj.XPath}"`;//promptTemplate.qtTemplateReplace(replaceObj);
		const pleaForHelp = promptTemplate.qtTemplateReplace(replaceObj);
		xLog.status(`prompt length=${pleaForHelp.length}`);

		return {
			promptList: [{ role: 'user', content: pleaForHelp }],
			extractionParameters
		};
	};

	return { iterativeGeneratorPrompt };
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;
//module.exports = new moduleFunction();
//moduleFunction().workingFunction().qtDump();

