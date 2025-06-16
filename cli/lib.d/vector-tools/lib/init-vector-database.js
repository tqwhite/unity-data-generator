#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

const qt = require('qtools-functional-library'); //also exposes qtLog(); qt.help({printOutput:true, queryString:'.*', sendJson:false});

const os = require('os');
const path = require('path');
const fs = require('fs');

// --------------------------------------------------------------------------------
// FIND PROJECT ROOT
const findProjectRoot = ({ rootFolderName = 'system', closest = true } = {}) =>
	__dirname.replace(
		new RegExp(`^(.*${closest ? '' : '?'}\/${rootFolderName}).*$`),
		'$1',
	);
const applicationBasePath = findProjectRoot(); // call with {closest:false} if there are nested rootFolderName directories and you want the top level one

//START OF moduleFunction() ============================================================
const moduleFunction =
	({ moduleName } = {}) =>
	({ unused }) => {
		
		const initVectorDatabase = (databaseFilePath, vectorTableName, xLog) => {
			try {
				const sqliteVec = require('sqlite-vec');
				const db = require('better-sqlite3')(databaseFilePath, {});
				sqliteVec.load(db);
				return db;
			} catch (error) {
				xLog.error(`Error in initVectorDatabase: ${error.message}`);
				throw error;
			}
		};

		return { initVectorDatabase };
	};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction({ moduleName })({}); //runs it right now