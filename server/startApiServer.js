#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

const qt = require('qtools-functional-library');

const { pipeRunner, taskListPlus, mergeArgs, forwardArgs } = new require(
	'qtools-asynchronous-pipe-plus',
)();

const os = require('os');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const querystring = require('querystring');
const rateLimit = require('express-rate-limit');

// --------------------------------------------------------------------------------
// OTHER MODULES
//START OF moduleFunction() ============================================================

const moduleFunction =
	({ moduleName }) =>
	(err, { rawConfig, commandLineParameters, getConfig }) => {
		// ======================================================================================
		// INIT INSTANCE

		process.global.getConfig = getConfig;
		process.global.commandLineParameters = commandLineParameters;
		process.global.rawConfig = rawConfig; //this should only be used for debugging, use getConfig(moduleName)

		const { xLog } = process.global;

		xLog.status(
			`Using config: ${getConfig('_meta').configurationSourceFilePath}`,
		);
		const {
			apiPort,
			staticDirectoryPath,
			staticPathPrefix,
			allowQueryStringInLog,
			suppressPictureRequestLogging,
		} = getConfig(moduleName);

		if (suppressPictureRequestLogging) {
			xLog.status(
				`image requests are NOT being logged, suppressPictureRequestLogging=${suppressPictureRequestLogging}`,
			);
		} else {
			xLog.status(
				`image requests are being logged, suppressPictureRequestLogging=${suppressPictureRequestLogging}`,
			);
		}

		// ======================================================================================
		// SET UP EXPRESS

		const expressApp = express();

			// Set up rate limiting
			const apiLimiter = rateLimit({
				windowMs: 15 * 60 * 1000, // 15 minutes
				max: 30, // limit each IP to 30 requests per windowMs
				standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
				legacyHeaders: false, // Disable the `X-RateLimit-*` headers
				message: 'Too many requests from this IP, please try again after 15 minutes',
			});

			// Apply rate limiting to all routes
			expressApp.use(apiLimiter);

		expressApp.use((xReq, xRes, next) => {
			if (suppressPictureRequestLogging && xReq.path.match(/\/api\/image\//)) {
				next();
				return;
			}
			const queryString =
				allowQueryStringInLog && Object.keys(xReq.query).length
					? '?' + querystring.stringify(xReq.query)
					: '';
			console.log(
				`Request: ${xReq.method.toUpperCase()} ${xReq.path}${queryString} via nginx/${xReq.headers['tq-config-id']} [startAll.js]`,
			);
			next();
		});

		expressApp.use(bodyParser.json({ extended: true })); //https://stackabuse.com/get-http-post-body-in-express-js/

		// --------------------------------------------------------------------------------
		//STATIC ENDPOINTS

		expressApp.use(/\/api\/ping/, (xReq, xRes, next) => {
			xLog.status(`xReq.path=${xReq.path} [startAll.js]`);
			next();
		});

		console.log(`staticDirectoryPath=${staticDirectoryPath}`);

		xLog.status(`using image directory ${staticDirectoryPath}`);
		expressApp.use(staticPathPrefix, express.static(staticDirectoryPath));

		// --------------------------------------------------------------------------------
		// DYNAMIC ENDPOINTS

		const taskList = new taskListPlus();

		// --------------------------------------------------------------------------------
		// TASKLIST ITEM TEMPLATE

		taskList.push((args, next) => {
			const localCallback = (
				err,
				{ accessPointsDotD, dataModelLogInfoList },
			) => {
				if (err) {
					next(err, args); //next('skipRestOfPipe', args);
					return;
				}

				next('', { ...args, accessPointsDotD, dataModelLogInfoList });
			};

			require('./data-model')(
				args.qtSelectProperties(['expressApp']),
				localCallback,
			);
		});
		// --------------------------------------------------------------------------------
		// TASKLIST ITEM TEMPLATE

		taskList.push((args, next) => {
			const { expressApp, accessPointsDotD } = args;
			accessPointsDotD.qtListProperties();
			const appValueManager = require('./lib/app-value-manager');
			const userByUsername = accessPointsDotD['user-by-username'];
			const accessTokenHeaderTools = require('./lib/access-token-header-tools')(
				{
					expressApp,
					userByUsername,
				},
			);

			expressApp.use((xReq, xRes, next) => {
				appValueManager({ targetObject: xReq });
				next();
			});

			expressApp.use((xReq, xRes, next) => {
				const localCallback = (err) => {
					if (err) {
						xRes.status(401).send(`Bad Request ${err.toString()}`);
						return; //this next is not asyncPipe
					}
					next(); // this next is expressApp.next()
				};
				accessTokenHeaderTools.hasValidToken(xReq, localCallback);
			});

			expressApp.use((xReq, xRes, next) => {
				accessTokenHeaderTools.refreshauthtoken({ xReq, xRes }, next); //updated by endpoint, if needed, eg, login
			});

			next('', { ...args, accessTokenHeaderTools });
		});

		// --------------------------------------------------------------------------------
		// TASKLIST ITEM TEMPLATE

		taskList.push((args, next) => {
			const { accessPointsDotD } = args;

			const localCallback = (err, result) => {
				if (err) {
					next(err, args); //next('skipRestOfPipe', args);
					return;
				}

				next('', { ...args, result });
			};

			accessPointsDotD['host-params'](localCallback);
		});

		// --------------------------------------------------------------------------------
		// TASKLIST ITEM TEMPLATE

		taskList.push((args, next) => {
			const localCallback = (err, endpointsDotD) => {
				if (err) {
					next(err, args); //next('skipRestOfPipe', args);
					return;
				}

				next('', { ...args, endpointsDotD });
			};

			require('./endpoints-dot-d')(
				args.qtSelectProperties([
					'expressApp',
					'accessTokenHeaderTools',
					'accessPointsDotD',
				]),
				localCallback,
			);
		});

		// --------------------------------------------------------------------------------
		// INIT AND EXECUTE THE PIPELINE

		const initialData = { expressApp };
		pipeRunner(taskList.getList(), initialData, (err, args) => {
			const { endpointsDotD, accessPointsDotD, dataModelLogInfoList } = args;

			if (err) {
				xLog.error(
					xLog.color.magentaBright(`
=================================================
FAILED TO START SERVER

${err.toString()}

=================================================

`),
				);
				process.exit(1);
			}
			xLog.status(dataModelLogInfoList.join('\n'));
			xLog.status(endpointsDotD.qtdProcessLog()); //console.dir(xpressApp._router.stack) for the real details

			xLog.status(accessPointsDotD.toString());

			//callback(err, {localResult1Value, localResult2});
		});

		// ======================================================================================
		// START SERVER

		expressApp.listen(apiPort);
		xLog.status(xLog.color.magentaBright(`\nMagic happens on ${apiPort}`));
	};
//END OF moduleFunction() ============================================================

// prettier-ignore
{
// --------------------------------------------------------------------------------
// FIND PROJECT ROOT
const findProjectRoot=({rootFolderName='system', closest=true}={})=>__dirname.replace(new RegExp(`^(.*${closest?'':'?'}\/${rootFolderName}).*$`), "$1");
const projectRoot=findProjectRoot(); // call with {closest:false} if there are nested rootFolderName directories and you want the top level one

// --------------------------------------------------------------------------------
// UTILITIES 
process.global = {};
process.global.xLog = require(path.join(projectRoot, 'code/lib/x-log'));
process.global.xLog.logToStdOut();
process.global.projectRoot = projectRoot;

const assembleConfigurationShowHelpMaybeExit = require(path.join(projectRoot, 'code/lib/assemble-configuration-show-help-maybe-exit'));

assembleConfigurationShowHelpMaybeExit({ configName:moduleName, applicationControls:['-flagCity', '--flagValue'] }, moduleFunction({ moduleName }));

}

module.exports = moduleFunction({ moduleName });
