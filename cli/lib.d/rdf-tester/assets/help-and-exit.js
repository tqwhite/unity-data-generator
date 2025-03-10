#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

// const qt = require('qtools-functional-library'); //also exposes qtLog(); qt.help({printOutput:true, queryString:'.*', sendJson:false});

const os = require('os');
const path = require('path');
const fs = require('fs');

//START OF moduleFunction() ============================================================
const moduleFunction =
	({ moduleName } = {}) =>
	(replaceObj = {}) => {
		const { xLog, getConfig, rawConfig, commandLineParameters } =
			process.global;
		const localConfig = getConfig(moduleName); //moduleName is closure

		if (
			commandLineParameters.switches.help ||
			commandLineParameters.values.help
		) {
			const helpTemplate = `
============================================================

NAME

	<!applicationName!> helps learn about RDF.

DESCRIPTION

	<!applicationName!>


	Configuration File Path: <!configPath!>

CONTROLS

-debug	Shows helpful messages from database processing system


OUTPUT

-help, --help	shows this help message. No processing is done.

-silent	suppress all messages
-quiet	only show errors
-verbose	everything useful for operation of the application
-debug	everything the author of the application ever thought would be useful for problem resolution

EXAMPLES

<!applicationName!> -help


[version: <!version!>]
============================================================
<!errorMessage!>
`;
			xLog.status(helpTemplate.qtTemplateReplace(replaceObj));
			process.exit();
		}
	};

//END OF moduleFunction() ============================================================


module.exports = moduleFunction({ moduleName }); //returns initialized moduleFunction

