#!/usr/bin/env node
'use strict';

const qt = require('qtools-functional-library');
const configFileProcessor = require('qtools-config-file-processor');
const os=require('os');

//START OF moduleFunction() ============================================================

const moduleFunction = function() {
	const { xLog } = process.global;

	const getConfig = (
		{ configSegmentName, filePath, options = {} },
		callback
	) => {
		const configOptions = {
				userSubstitutions: {
					remoteBasePath: '<!prodRemoteBasePath!>',
					userHomeDir:os.homedir()
				}
			};

		if (filePath.match(/\.ini$/)) {
			const allConfigs = configFileProcessor.getConfig(
				filePath,
				'.',
				configOptions
			);

			if (
				options.useProdPath &&
				!allConfigs.qtGetSurePath('_substitutions.prodRemoteBasePath')
			) {
				callback(
					`-prod was set but _substitutions.prodRemoteBasePath was missing from config ${filePath}`
				);
				return;

			}

			const config = allConfigs[configSegmentName]?allConfigs[configSegmentName]:{error:`no such config segment ${configSegmentName} in ${filePath}`};
// 			if (typeof config == 'undefined' || Object.keys.length == 0) {
// 				const message = `Bad configuration file. No ${configSegmentName} section or the section is empty`;
// 				xLog.error(message);
// 				throw message;
// 			}

			callback('', {config, allConfigs});
		}
	};

	return { getConfig };
};

//END OF moduleFunction() ============================================================

module.exports = new moduleFunction();
