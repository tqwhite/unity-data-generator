#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

// const qt = require('qtools-functional-library'); //also exposes qtLog(); qt.help({printOutput:true, queryString:'.*', sendJson:false});

const os = require('os');
const path = require('path');
const fs = require('fs');


const commandLineParser = require('qtools-parse-command-line');
const configFileProcessor = require('qtools-config-file-processor');

// --------------------------------------------------------------------------------
// FIND PROJECT ROOT
const findProjectRoot = ({ rootFolderName = 'system', closest = true } = {}) =>
	__dirname.replace(
		new RegExp(`^(.*${closest ? '' : '?'}\/${rootFolderName}).*$`),
		'$1',
	);
const projectRoot = findProjectRoot(); // call with {closest:false} if there are nested rootFolderName directories and you want the top level one
//--------------------------------------------------------------
// FIGURE OUT CONFIG
const configName = os.hostname().match(/^q/) ? 'instanceSpecific/qbook' : ''; //when deployed, usually the config is in the configs/ dir
const configDirPath = `${projectRoot}/configs/${configName}/`;
console.log(`configDirPath=${configDirPath}`);

const config = configFileProcessor.getConfig(
	`${moduleName}.ini`,
	configDirPath,
	{ resolve: true },
);

const commandLineParameters = commandLineParser.getParameters();


//START OF moduleFunction() ============================================================
const moduleFunction =
	({ moduleName } = {}) =>
	({ unused }) => {
		const { xLog, getConfig, rawConfig, commandLineParameters } =
			process.global;
		const { databaseFilePath, sqlPaths } = getConfig(moduleName); //moduleName is closure
		

		const workingDatabasePath = commandLineParameters.values.databasePath
			? commandLineParameters.values.databasePath.qtFirst()
			: databaseFilePath;

		console.log(`workingDatabasePath=${workingDatabasePath}`);
		if (
			commandLineParameters.switches.help ||
			commandLineParameters.values.help
		) {
			require('./assets/help-and-exit')({
				applicationName: moduleName,
				version: '1.0',
				configPath: rawConfig._meta.configurationSourceFilePath,
				databaseFilePath,
			});
		}

		let sqlStatementFilePath;
		switch (true) {
			case commandLineParameters.switches.CEDS_Elements:
				sqlStatementFilePath = sqlPaths['CEDS_Elements'];
				break;
			case commandLineParameters.switches.CEDS_IDS:
				sqlStatementFilePath = sqlPaths['CEDS_IDS'];

				break;
			default:
				xLog.error(`no switch supplied, choose -CEDS_IDS or -CEDS_Elements`);
				process.exit(1);
		}
		
		if (!fs.existsSync(sqlStatementFilePath)) {
			xLog.error(`SQL file not found at path: ${sqlStatementFilePath}`);
			process.exit(1);
		}
		
		xLog.status(`Reading SQL from: ${sqlStatementFilePath}`);

		const executeSqlList = require('./lib/execute-sql-list');
		const result = executeSqlList({sqlStatementFilePath});
		
		if (result.errors > 0) {
			xLog.error(`Execution completed with ${result.errors} errors`);
			if (!commandLineParameters.switches.verbose) {
				xLog.error('Run with -verbose to see error details');
			}
		} else {
			xLog.status(`Successfully executed ${result.successful} SQL statements`);
		}
		
		xLog.status(`${moduleName} completed`);
	};

//END OF moduleFunction() ============================================================

// prettier-ignore
{
	process.global = {};
	process.global.xLog = require(path.join(projectRoot, 'code/lib/x-log'));
	process.global.getConfig=sectionName=>config[sectionName];
	process.global.commandLineParameters=typeof(commandLineParameters)!='undefined'?commandLineParameters:undefined;;
	process.global.rawConfig=config; //this should only be used for debugging, use getConfig(moduleName)
	}
console.log(
	`running as standalone, WARNING: overwrites xLog() if this branch runs in a sustem`,
);
module.exports = moduleFunction({ moduleName })({}); //runs it right now
//module.exports = moduleFunction({config, commandLineParameters, moduleName})();