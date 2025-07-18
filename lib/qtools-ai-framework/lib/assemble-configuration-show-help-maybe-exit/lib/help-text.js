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

	Default Help Information

DESCRIPTION



CONTROLS


OUTPUT


MESSAGES

-help, --help	shows this help message. No processing is done.

-showConfig	display the final configuration (pipe to jq, if you have it)

-silent	turns off all message output
-quiet	turns off all but error messages
-verbose	shows additional messages that clarify what is going on
-debug	shows all development debugging messages, plus verbose and everything else


--------------------------

NOTE: qtools-ai-framework supports injected module for application specific help.

const helpText={mainHelp:()=>'some text'}

const initAtp = require('../../../lib/qtools-ai-framework/jina')({
	configFileBaseName: moduleName,
	applicationBasePath,
	helpText,
	applicationControls: [
		'-booleanFlag',
		'--valueFlag',
	],
}); // SIDE EFFECTS: Initializes xLog and getConfig in process.global

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

