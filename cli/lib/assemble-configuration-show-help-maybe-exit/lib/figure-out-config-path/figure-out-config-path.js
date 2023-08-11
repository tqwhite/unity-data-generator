#!/usr/bin/env node
'use strict';
const path = require('path');
const fs = require('fs');
const os=require('os');
/*

From system to system, this file is almost always customized for particular needs.
However, this particular one is pretty close to universal.

*/

//START OF moduleFunction() ============================================================
const moduleFunction = function({ xxx } = {}) {
	const { xLog, applicationBasePath } = process.global;
	
	const getConfigPath = ({ fileString } = {}) => {
		const configFilePath = path.join(
			applicationBasePath,
			'configs',
			'systemConfig.ini'
		);
		
		const qbookFilePath = path.join(
			applicationBasePath,
			'configs',
			'instanceSpecific',
			'qbook',
			'systemConfig.ini'
		); //deployment copies target config to 'configs'; if qbook exists, it's dev system
		
		const homeUserNameFilePath = path.join(
			applicationBasePath,
			'configs',
			'instanceSpecific',
			os.userInfo().username,
			'systemConfig.ini'
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

		if (fs.existsSync(configFilePath)) {
			return configFilePath; // normal deployment has config data at top level of directory so other config's secrets are preserved
		}
		return;
	};
	return { getConfigPath };
};
//END OF moduleFunction() ============================================================
module.exports = moduleFunction;
