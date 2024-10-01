'use strict';

const qt = require('qtools-functional-library');

const asynchronousPipePlus = new require('qtools-asynchronous-pipe-plus')();
const pipeRunner = asynchronousPipePlus.pipeRunner;
const taskListPlus = asynchronousPipePlus.taskListPlus;

const commandLineParser = require('qtools-parse-command-line');

const findConfigFile = require('./find-config-file');
const helpText = require('./lib/help-text');

const figureOutConfigPathGen = require('./lib/figure-out-config-path'); //this file is almost always customized

const fs = require('fs');

//START OF moduleFunction() ============================================================

const moduleFunction = function ({ configSegmentName, callback }) {
	const { xLog } = process.global;
	const validControls = [
		'-help',
		'--help',
		'-silent',
		'-quiet',
		'-verbose',
		'-debug',
		'-noColor',
		'-showConfig',
		'-outFile',
		'--overrideConfigPath',
		'--xmlGeneratingingFacilitatorName',
		'--refinerName',
		'-echoAlso',
		'-listElements',
		'-showParseErrors',
		'--elements',
		'--alternateStringLib',
	];

	const commandLineParameters = commandLineParser.getParameters();
	const figureOutConfigPath = figureOutConfigPathGen({});

	const taskList = [];

	//==============================================================================
	// get systemParameters.ini

	taskList.push((args, next) => {
		const localCallback = (err, args) => {
			const { config, allConfigs } = args;
			const getConfigActual = (allConfigs) => (segmentName) => ({
				...allConfigs[segmentName],
				_segmentName: segmentName,
			});

			const getConfig = getConfigActual({
				...allConfigs,
				commandLineParameters,
			});

			next(err, {
				...args,
				moduleConfig: config,
				allConfigs,
				commandLineParameters,
				getConfig,
			});
		};

		const configFilePath = figureOutConfigPath.getConfigPath({
			fileString: commandLineParameters.qtGetSurePath(
				'values.overrideConfigPath[0]',
			),
		});

		if (!fs.existsSync(configFilePath)) {
			xLog.error(`Config file missing. ${configFilePath} does not exist.`);
			next('skipRestOfPipe');
			return;
		}
		xLog.status(`Using config file: ${configFilePath}`);

		findConfigFile.getConfig(
			{
				configSegmentName,
				filePath: configFilePath,
				options:
					commandLineParameters.switches.prod ||
					commandLineParameters.switches.forceProd
						? { useProdPath: true }
						: void 0,
			},
			localCallback,
		);
	});

	//==============================================================================
	// show help and exit if requested (uses  defaultRequestFilePath from systemParameters)

	taskList.push((args, next) => {
		const { configSegmentName, commandLineParameters, moduleConfig } = args;

		//commandLineParser does not include switch flags presented after an empty --values element.
		//eg, "deployPrograms filePath -xxx --values= --yyy" only finds xxx, not yyy
		//I use aliases to drive deployPrograms, eg, "alias copySomething=deployPrograms configPath --actions"
		//but also want to use "copySomething -help"
		//this expands to "deployPrograms configPath --actions -help" and the flaw omits switch.help.
		//This line works around the flaw. tqii 7/20/21

		const help = process.argv.filter((item) => item.match(/-help/)).qtLast();

		if (help) {
			process.stderr.write(
				helpText.mainHelp({
					defaultRequestFilePath: moduleConfig.qtGetSurePath(
						'defaultRequestFilePath',
						'startAll.defaultRequestFilePath is missing from systemParameters.ini',
					),
				}),
			);
			next('skipRestOfPipe');
			return;
		}

		next('', args);
	});

	//==============================================================================
	// merge command line parameters into config

	taskList.push((args, next) => {
		const { commandLineParameters, moduleConfig } = args;

		moduleConfig.port = commandLineParameters.qtGetSurePath(
			'values.port[0]',
			moduleConfig.port,
		);

		next('', args);
	});

	//==============================================================================
	// show config data if requested

	taskList.push((args, next) => {
		const { allConfigs, moduleConfig, configFilePath } = args;

		const localCallback = (err) => {
			next(err, args);
		};

		if (commandLineParameters.switches.showConfig) {
			const cloneConfig = allConfigs.qtClone();
			const redactions = cloneConfig.REDACTIONS;

			redactions.forEach((dottedPath) =>
				cloneConfig.qtPutSurePath(dottedPath, '**********'),
			);

			xLog.result(
				JSON.stringify(
					cloneConfig.qtSelectProperties(
						['_meta', '_substitutions', 'REDACTIONS'],
						{
							excludeMode: true,
						},
					),
					'',
					'\t',
				),
			);
			process.exit(); //EXIT ==================================================
			//next('skipRestOfPipe');
			//return;
		}

		const errors = process.argv
			.filter((item) => item.match(/^-/))
			.filter((item) => {
				return !validControls.filter((validItem) => item.match(validItem))
					.length;
			});

		let errorMessage = '';

		if (errors.length) {
			const errList = errors
				.reduce((result, item) => result + item + ', ', '')
				.replace(/, $/, '');

			next(
				`Bad flags in command line ${errList}. Try --help. (Did you miss a double hyphen?)`,
			);
			return;
		}

		localCallback('', moduleConfig);
	});

	//==============================================================================
	// init and execute pipeRunner

	const initialData = {
		configSegmentName,
		commandLineParameters,
		xLog,
	};
	asynchronousPipePlus.pipeRunner(
		taskList,
		initialData,
		(err, finalResult = {}) => {
			const {
				moduleConfig = {},
				commandLineParameters = {},
				allConfigs,
				getConfig,
			} = finalResult;

			process.global = process.global ? process.global : {};

			process.global.getConfig = getConfig;
			process.global.commandLineParameters = commandLineParameters;
			

			callback(err, {
				allConfigs,
				commandLineParameters,
				getConfig,
			});
		},
	);
};

//END OF moduleFunction() ============================================================

module.exports = (args) => new moduleFunction(args);

