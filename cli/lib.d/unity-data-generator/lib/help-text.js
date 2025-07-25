#!/usr/bin/env node
'use strict';


const qt = require('qtools-functional-library');

//START OF moduleFunction() ============================================================

const moduleFunction = function(args={}) {


const mainHelp=args=>{


const {defaultRequestFilePath, errorMessage=''}=args;

return `
============================================================

NAME

	Uniuty Data Generator - Generate XML test data for A4L Unity Data model

DESCRIPTION

	unityDataGenerator.js MODELNAME
	
	Writes XML to file. Displays path of file.

CONTROLS


--thoughtProcess:	specify the name of the AI process sequence for generating XML
--refinerName:	specify the name of the AI process sequence for refining XML
--overrideConfigPath:	Specify a configuration file to override default (configs/systemParameters.ini)
--promptLibrary:	specify which prompt library to use (udg-v1, john-prompts, etc.)
--promptVersion:	choose different prompt version (Default: defaultStrings)

OUTPUT

-outFile:	Override the default file path
-echoAlso:	Show XML on command line as well as writing to file
<!frameworkHelpInfo!>
EXAMPLES

unityDataGenerator.js LEAAccountabilitys; //smallest of the models
unityDataGenerator.js --overrideConfigPath="FILEPATH/systemParamters.ini" --outFile=PATH/TO/FILE
unityDataGenerator.js StudentPersonal --promptLibrary=john-prompts  //use john's prompts

============================================================
${errorMessage}
`
	;

}

	return ({mainHelp});
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction();
//moduleFunction().workingFunction().qtDump();

