#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot
//const projectRoot=fs.realpathSync(path.join(__dirname, '..', '..')); // adjust the number of '..' to fit reality

const qt = require('qtools-functional-library'); //qt.help({printOutput:true, queryString:'.*', sendJson:false});


//START OF moduleFunction() ============================================================

const moduleFunction = function(args = {}) {


	const { xLog, getConfig } = process.global;
	const {promptTemplate, extractionParameters, ingestionParameters={}} = getConfig(moduleName); //getConfig(`${moduleName}`);

	const updatePrompt=args=>{
	const {specObj, currentXml}=args;
	const replaceObj={
	...args,
	specObjJson:JSON.stringify(specObj, '', '\t'),
	currentXml,
	consistencyGuidance:`
	state is Minnesota
	all names and places should be chosen with diversity in mind
	
	`,
	...extractionParameters
	}
	
	const pleaForHelp=promptTemplate.qtTemplateReplace(replaceObj);
	return {pleaForHelp, extractionParameters, ingestionParameters};
	}

	return { updatePrompt };
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;
//module.exports = new moduleFunction();
//moduleFunction().workingFunction().qtDump();

