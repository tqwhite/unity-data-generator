#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');
/*

From system to system, this file is almost always customized for particular needs.
However, this particular one is pretty close to universal.

*/

//START OF moduleFunction() ============================================================
const moduleFunction = function ({ xxx } = {}) {
	let { xLog, applicationBasePath } = process.global;
	

	

	const findProjectRoot = ({
		rootFolderName = 'system',
		closest = true,
	} = {}) =>
		__dirname.replace(
			new RegExp(`^(.*${closest ? '' : '?'}\/${rootFolderName}).*$`),
			'$1',
		);
	

	applicationBasePath = applicationBasePath
		? applicationBasePath
		: findProjectRoot(); // call with {closest:false} if there are nested rootFolderName directories and you want the top level one

	const getConfigPath = ({ fileString, configFileBaseName } = {}) => {
		const configFilePath = path.join(
			applicationBasePath,
			'configs',
			'systemParameters.ini',
		);
		const moduleNameFilePath = path.join(
			applicationBasePath,
			'configs',
			configFileBaseName ? `${configFileBaseName}.ini` : 'systemParameters.ini',
		);

		const qbookFilePath = path.join(
			applicationBasePath,
			'configs',
			'instanceSpecific',
			'qbook',
			configFileBaseName ? `${configFileBaseName}.ini` : 'systemParameters.ini',
		); //deployment copies target config to 'configs'; if qbook exists, it's dev system

		const homeUserNameFilePath = path.join(
			applicationBasePath,
			'configs',
			'instanceSpecific',
			os.userInfo().username,
			configFileBaseName ? `${configFileBaseName}.ini` : 'systemParameters.ini',
		); //deployment copies target config to 'configs'; if qbook exists, it's dev system

		if (fileString && fs.existsSync(fileString)) {
			return fileString; //return user override config file path
		}

		if (fs.existsSync(qbookFilePath)) {
			return qbookFilePath; // this one is special for TQ
		}

		if (fs.existsSync(homeUserNameFilePath)) {
			return homeUserNameFilePath; // this one is any other developers
		}

		if (fs.existsSync(moduleNameFilePath)) {
			return moduleNameFilePath; // This is more specific for special (cli) situations
		}

		if (fs.existsSync(configFilePath)) {
			return configFilePath; // normal deployment has config data at top level of directory so other config's secrets are preserved
		}
		const filePaths = [
			fileString,
			qbookFilePath,
			homeUserNameFilePath,
			moduleNameFilePath,
			configFilePath,
		];
		
		xLog.status(`No configuration file found at any of these paths:\n    ${filePaths.join('\n    ')}\n`);
		
		throw 'No configuration file found';
	};
	return { getConfigPath };
};
//END OF moduleFunction() ============================================================
module.exports = moduleFunction;
