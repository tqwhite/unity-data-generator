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
	const { xLog } = process.global;
	

	const findProjectRoot = ({
		rootFolderName = 'system',
		closest = true,
	} = {}) =>
		__dirname.replace(
			new RegExp(`^(.*${closest ? '' : '?'}\/${rootFolderName}).*$`),
			'$1',
		);
	const projectRoot = findProjectRoot(); // call with {closest:false} if there are nested rootFolderName directories and you want the top level one

	const getConfigPath = ({ fileString } = {}) => {

		if (fileString && fs.existsSync(fileString)) {
			return fileString; //return user override config file path
		}

		// =========================================================================
		// This module can be used in a qtools standard project. If so, the config file
		// can be found automatically by reference to the project root.
		// This is found by using the following code in the top level main file of the
		// project.
		// First it looks for a config file in .../configs/${username}
		// Then it checks for TQ's development config in .../configs/qbook
		// Then it looks for a file in .../configs
		//
		// Unless a value is set in process.global.configPath

		if (!process.global.configPath) {
		
			const homeUserNameFilePath = path.join(
				projectRoot,
				'configs',
				'instanceSpecific',
				os.userInfo().username,
				'systemConfig.ini',
			); //deployment copies target config to 'configs'; if qbook exists, it's dev system

			const qbookFilePath = path.join(
				projectRoot,
				'configs',
				'instanceSpecific',
				'qbook',
				'systemConfig.ini',
			); //deployment copies target config to 'configs'; if qbook exists, it's dev system

			const topOfDirFilePath = path.join(
				projectRoot,
				'configs',
				'instanceSpecific',
				'systemConfig.ini',
			); //deployment copies target config to 'configs'; if qbook exists, it's dev system

			if (fs.existsSync(homeUserNameFilePath)) {
				return homeUserNameFilePath; // this one is any other developers
			}

			if (fs.existsSync(qbookFilePath)) {
				return qbookFilePath; // this one is special for TQ
			}

			if (fs.existsSync(topOfDirFilePath)) {
				return topOfDirFilePath; // this one is any other developers
			}
			
			throw `NO CONFIG FILE FOUND at\n    ${qbookFilePath} or\n    ${qbookFilePath}}or\n    ${topOfDirFilePath}\n    (projectRoot was found to be: ${projectRoot} is that right?)`;
		}

		if (fs.existsSync(process.global.configPath)) {
			return process.global.configPath; // normal deployment has config data at top level of directory so other config's secrets are preserved
		} else {
			throw `NO CONFIG FILE FOUND at ${process.global.configPath}\n    (projectRoot was found to be: ${projectRoot} is that right?)`;
		}
		return;
	};
	return { getConfigPath };
};
//END OF moduleFunction() ============================================================
module.exports = moduleFunction;
