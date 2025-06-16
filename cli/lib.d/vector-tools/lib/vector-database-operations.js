#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

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
const applicationBasePath = findProjectRoot();

//START OF moduleFunction() ============================================================
const moduleFunction =
	({ moduleName } = {}) =>
	({ unused }) => {
		
		/**
		 * Initializes vector database with sqlite-vec extension
		 * @param {string} databaseFilePath - Path to SQLite database file
		 * @param {string} vectorTableName - Name of vector table (unused but kept for compatibility)
		 * @param {Object} xLog - Logging object
		 * @returns {Object} Database connection with sqlite-vec loaded
		 */
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

		/**
		 * Gets record count for a table
		 * @param {Object} db - Database connection
		 * @param {string} tableName - Name of table to count
		 * @returns {number} Number of records in table, 0 if table doesn't exist
		 */
		const getTableCount = (db, tableName) => {
			try {
				const countResult = db.prepare(`SELECT COUNT(*) as count FROM "${tableName}"`).get();
				return countResult.count;
			} catch (error) {
				return 0; // Table doesn't exist
			}
		};

		/**
		 * Checks if a table exists in the database
		 * @param {Object} db - Database connection
		 * @param {string} tableName - Name of table to check
		 * @returns {boolean} True if table exists, false otherwise
		 */
		const tableExists = (db, tableName) => {
			try {
				const result = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name = ?`).get(tableName);
				return !!result;
			} catch (error) {
				return false;
			}
		};

		/**
		 * Gets all tables in the database
		 * @param {Object} db - Database connection
		 * @returns {Array} Array of table objects with name and type
		 */
		const getAllTables = (db) => {
			try {
				return db.prepare(`SELECT name, type FROM sqlite_master WHERE type='table' ORDER BY name`).all();
			} catch (error) {
				return [];
			}
		};

		/**
		 * Gets vector tables (tables using vec0 extension)
		 * @param {Object} db - Database connection
		 * @returns {Array} Array of vector table objects
		 */
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

		/**
		 * Gets database version information
		 * @param {Object} db - Database connection
		 * @returns {Object} Object with sqlite_version and vec_version
		 */
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

		/**
		 * Creates a vector table with specified dimensions
		 * @param {Object} db - Database connection
		 * @param {string} tableName - Name of vector table to create
		 * @param {number} dimensions - Vector dimensions (default: 1536)
		 * @returns {boolean} True if successful, false otherwise
		 */
		const createVectorTable = (db, tableName, dimensions = 1536) => {
			try {
				db.exec(`CREATE VIRTUAL TABLE ${tableName} USING vec0(embedding float[${dimensions}])`);
				return true;
			} catch (error) {
				return false;
			}
		};

		/**
		 * Safely closes database connection
		 * @param {Object} db - Database connection
		 */
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

//END OF moduleFunction() ============================================================

module.exports = moduleFunction({ moduleName })({});