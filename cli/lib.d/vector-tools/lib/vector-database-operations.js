#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

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
const applicationBasePath = findProjectRoot();

// =====================================================================
// MODULE FUNCTION
// =====================================================================
// ---------------------------------------------------------------------
// moduleFunction - provides vector database operations and utilities

const moduleFunction =
	({ moduleName } = {}) =>
	({ unused }) => {
		
		// ---------------------------------------------------------------------
		// initVectorDatabase - initializes vector database with sqlite-vec extension
		
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

		// ---------------------------------------------------------------------
		// getTableCount - gets record count for a table
		
		const getTableCount = (db, tableName) => {
			try {
				const countResult = db.prepare(`SELECT COUNT(*) as count FROM "${tableName}"`).get();
				return countResult.count;
			} catch (error) {
				return 0; // Table doesn't exist
			}
		};

		// ---------------------------------------------------------------------
		// tableExists - checks if a table exists in the database
		
		const tableExists = (db, tableName) => {
			try {
				const result = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name = ?`).get(tableName);
				return !!result;
			} catch (error) {
				return false;
			}
		};

		// ---------------------------------------------------------------------
		// getAllTables - gets all tables in the database
		
		const getAllTables = (db) => {
			try {
				return db.prepare(`SELECT name, type FROM sqlite_master WHERE type='table' ORDER BY name`).all();
			} catch (error) {
				return [];
			}
		};

		// ---------------------------------------------------------------------
		// getVectorTables - gets vector tables using vec0 extension
		
		const getVectorTables = (db) => {
			try {
				const allTables = getAllTables(db);
				return allTables.filter(table => {
					try {
						const tableInfo = db.prepare(`SELECT sql FROM sqlite_master WHERE name = ?`).get(table.name);
						return tableInfo?.sql?.includes('USING vec0') || false;
					} catch (error) {
						return false;
					}
				});
			} catch (error) {
				return [];
			}
		};

		// ---------------------------------------------------------------------
		// getDatabaseVersions - gets database version information
		
		const getDatabaseVersions = (db) => {
			try {
				const sqlite_version = db.prepare('SELECT sqlite_version() as version').get().version;
				
				try {
					const vec_version = db.prepare('SELECT vec_version() as version').get().version;
					return { sqlite_version, vec_version };
				} catch (vecError) {
					return { sqlite_version, vec_version: null, vec_error: vecError.message };
				}
			} catch (error) {
				return { sqlite_version: null, vec_version: null, error: error.message };
			}
		};

		// ---------------------------------------------------------------------
		// createVectorTable - creates a vector table with specified dimensions
		
		const createVectorTable = (db, tableName, dimensions = 1536) => {
			try {
				db.exec(`CREATE VIRTUAL TABLE ${tableName} USING vec0(embedding float[${dimensions}])`);
				return true;
			} catch (error) {
				return false;
			}
		};

		// ---------------------------------------------------------------------
		// closeDatabase - safely closes database connection
		
		const closeDatabase = (db) => {
			try {
				if (db && typeof db.close === 'function') {
					db.close();
				}
			} catch (error) {
				// Ignore close errors
			}
		};

		return { 
			initVectorDatabase,
			getTableCount,
			tableExists,
			getAllTables,
			getVectorTables,
			getDatabaseVersions,
			createVectorTable,
			closeDatabase
		};
	};

// =====================================================================
// MODULE EXPORTS
// =====================================================================

module.exports = moduleFunction({ moduleName })({});