#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot
//const projectRoot=fs.realpathSync(path.join(__dirname, '..', '..')); // adjust the number of '..' to fit reality

const qt = require('qtools-functional-library'); //qt.help({printOutput:true, queryString:'.*', sendJson:false});

//START OF moduleFunction() ============================================================

const moduleFunction = function (args = {}) {

	const { xLog } = process.global;
	
	
	const {promptLibraryModulePath}=args;
	
	const iterativeGeneratorPrompt = (args) => {
	args.elementSpecWorksheetJson=JSON.stringify(args.latestXml, '', '\t')
		
		const { employerModuleName } = args;

		const promptLibrary = require(promptLibraryModulePath)(); //'johns-maker', 'johns-review', 'tqs-maker', 'tqs-review', 'fix-problems'

		if (!promptLibrary[employerModuleName]) {
			xLog.error(
				`\nmodule 'prompt-library' has no property for '${employerModuleName}'`,
			);
			throw `module 'prompt-library' has no property for '${employerModuleName}'`;
		}

		const { promptTemplate, extractionParameters, extractionFunction } =
			promptLibrary[employerModuleName];

		const replaceObj = { ...args, ...extractionParameters };

		const pleaForHelp = promptTemplate.qtTemplateReplace(replaceObj);

		return {
			promptList: [{ role: 'user', content: pleaForHelp }],
			extractionParameters,extractionFunction
		};
	};

	return { iterativeGeneratorPrompt };
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;
//module.exports = new moduleFunction();
//moduleFunction().workingFunction().qtDump();

