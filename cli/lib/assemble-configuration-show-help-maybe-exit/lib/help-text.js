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

	docServer - Manage/Send/Receive files according to requests submitted by docClient

DESCRIPTION

	docServer establishes a persistent server process that answers requests on a port. 
	Typically, it is used with no parameters relying, instead, on a configuration file.
	
	Operation can be customized by specifying a special config file. Also, the port number
	can be overridden on the command line.
	

CONTROLS

--port:	Override port default set in configuration file (takes precedence over overrideConfigPath)

--overrideConfigPath:	Specify a configuration file to override default (configs/systemParameters.ini)

OUTPUT

-help, --help	shows this help message. No processing is done.

-showConfig	display the final configuration file that would be used. No processing is done.

-silent
-quiet
-verbose

EXAMPLES

docServer
docServer --overrideConfigPath="FILEPATH/systemParamters.ini" PATH/TO/FILE
deployPrograms "FILEPATH/config.ini" --actions=hostname -skipInitCleanup

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

