#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

const qt = require('qtools-functional-library'); //also exposes qtLog(); qt.help({printOutput:true, queryString:'.*', sendJson:false});

const os = require('os');
const path = require('path');
const fs = require('fs');

// =====================================================================
// UTILITY FUNCTIONS
// =====================================================================

// ---------------------------------------------------------------------
// findProjectRoot - locates the project root directory by searching for rootFolderName

const findProjectRoot = ({ rootFolderName = 'system', closest = true } = {}) =>
	__dirname.replace(
		new RegExp(`^(.*${closest ? '' : '?'}\/${rootFolderName}).*$`),
		'$1',
	);
const applicationBasePath = findProjectRoot(); // call with {closest:false} if there are nested rootFolderName directories and you want the top level one

// =====================================================================
// MODULE FUNCTION
// =====================================================================
// ---------------------------------------------------------------------
// moduleFunction - provides vector database initialization functionality

const moduleFunction =
	({ moduleName } = {}) =>
	({ unused }) => {
		
		// ---------------------------------------------------------------------
		// initVectorDatabase - initializes SQLite database with vector extension
		
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

// =====================================================================
// MODULE EXPORTS
// =====================================================================

module.exports = moduleFunction({ moduleName })({}); //runs it right now