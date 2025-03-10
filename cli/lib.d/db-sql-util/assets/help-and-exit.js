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

	<!applicationName!> opens a file full of SQL statements, splits it on ;
	and sends them to sqlite.


	If the file is very big and has lots of statements, it executes them in batches
	and shows progress statements (unless -silent).

DESCRIPTION

	<!applicationName!> -CEDS_Elements|-CEDS_IDS [--databasePath]


	Unless overriden, the sqlite file path is:
		<!databaseFilePath!>


	Configuration File Path: <!configPath!>

CONTROLS

-debug	Shows helpful messages from database processing system
--databasePath=override_database_file_path
--skip=N        skip the first N statements (for resuming after a previous run)

-CEDS_Elements	process CEDS_Elements/CEDS-Elements-V12.0.0.0_SQLITE.sql
-CEDS_IDS	process /CEDS_IDS/Populate-CEDS-Element-Tables_SQLITE.sql

OUTPUT

-help, --help	shows this help message. No processing is done.

-silent	suppress all messages
-quiet	only show errors
-verbose	everything useful for operation of the application
-debug	everything the author of the application ever thought would be useful for problem resolution

EXAMPLES

<!applicationName!> -help
<!applicationName!> -CEDS_Elements
<!applicationName!> -CEDS_IDS --skip=5000    # Resume processing at the 5001st statement


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

