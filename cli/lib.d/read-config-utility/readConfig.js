#!/usr/bin/env node
'use strict';

const path = require('path');
const os = require('os');
const fs = require('fs');

const qt = require('qtools-functional-library');
const xLog = require('qtools-x-log');
xLog.setProcessFilesDirectory('read-config-utility');

const commandLineParser = require('qtools-parse-command-line');
const configFileProcessor = require('qtools-config-file-processor');

const findProjectRoot = ({ rootFolderName = 'system', closest = true } = {}) =>
	__dirname.replace(
		new RegExp(`^(.*${closest ? '' : '?'}\/${rootFolderName}).*$`),
		'$1',
	);

const applicationBasePath = findProjectRoot();

const moduleFunction = function() {
	const commandLineParameters = commandLineParser.getParameters();
	const { fileList = [], switches = {} } = commandLineParameters;

	if (switches.help || fileList.length === 0) {
		showHelp();
		process.exit(0);
	}

	const configPath = fileList[0];
	const sectionPath = fileList[1];

	const resolvedConfigPath = resolveConfigPath(configPath, switches);
	
	if (!resolvedConfigPath) {
		xLog.error(`Config file not found: ${configPath}`);
		process.exit(1);
	}

	xLog.status(`Config file: ${resolvedConfigPath}`);

	const configOptions = {
		userSubstitutions: {
			remoteBasePath: '<!prodRemoteBasePath!>',
			userHomeDir: os.homedir()
		}
	};

	let allConfigs;
	try {
		allConfigs = configFileProcessor.getConfig(
			resolvedConfigPath,
			'.',
			configOptions
		);
	} catch (error) {
		xLog.error(`Error reading config file: ${error.message}`);
		process.exit(1);
	}

	let result;
	if (sectionPath) {
		result = allConfigs.qtGetSurePath(sectionPath);
		if (typeof result === 'undefined') {
			xLog.error(`Section not found: ${sectionPath}`);
			process.exit(1);
		}
		xLog.status(`Section: ${sectionPath}`);
	} else {
		result = allConfigs;
		xLog.status('Showing entire configuration');
	}

	if (switches.json) {
		xLog.result(JSON.stringify(result, null, 2));
	} else {
		xLog.result(result);
	}
};

const resolveConfigPath = (configPath, switches = {}) => {
	if (path.isAbsolute(configPath) && fs.existsSync(configPath)) {
		return configPath;
	}

	const fileName = configPath.endsWith('.ini') ? configPath : `${configPath}.ini`;
	
	const username = os.userInfo().username;
	const searchPaths = [
		path.join(applicationBasePath, 'configs', 'instanceSpecific', 'qbook', fileName),
		path.join(applicationBasePath, 'configs', 'instanceSpecific', username, fileName),
		path.join(applicationBasePath, 'configs', fileName),
	];

	if (fileName !== 'systemParameters.ini') {
		searchPaths.push(path.join(applicationBasePath, 'configs', 'systemParameters.ini'));
	}

	for (const searchPath of searchPaths) {
		if (fs.existsSync(searchPath)) {
			return searchPath;
		}
	}

	if (switches.showPath) {
		xLog.status('Searched paths:');
		searchPaths.forEach(p => xLog.status(`  ${p}`));
	}

	return null;
};

const showHelp = () => {
	const helpText = `
read-config-utility - Read and display configuration files

Usage:
  readConfig <configFile> [section.path]

Arguments:
  configFile    Config file name or path (e.g., "systemParameters" or "/full/path/config.ini")
  section.path  Optional dotted path to specific section (uses qtGetSurePath syntax)

Options:
  -help         Show this help message
  -showPath     Display all searched paths when file not found
  -json         Output as formatted JSON
  -silent       Suppress all output except results
  -verbose      Show additional debug information

Examples:
  readConfig systemParameters
  readConfig systemParameters "database.host"
  readConfig unityDataGenerator "UDG_Thought_Process.promptLibraryName"
  readConfig /full/path/to/config.ini
`;
	console.log(helpText);
};

moduleFunction();