#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const qt = require('qtools-functional-library');
const { initDatabaseInstance } = require('../sqlite-instance/sqlite-instance')({});
const statementLibrary = require('./lib/statement-library')();
const schemaQueries = require('./lib/schema-queries')();

// =====================================================================
// MAIN CLASS
// =====================================================================

class DirectQueryUtility {
	constructor({ databasePath }) {
		this.databasePath = databasePath;
		this.sqliteInstance = null;
		this.db = null;
		this.statements = statementLibrary;
		
		// Initialize database
		this._initialize();
	}

	// ---------------------------------------------------------------------
	// _initialize - Set up sqlite-instance connection

	_initialize() {
		const { xLog } = process.global;
		
		initDatabaseInstance(this.databasePath, (err, dbInstance) => {
			if (err) {
				const traceId = Math.floor(Math.random() * 1e9);
				xLog.error(`[${traceId}] Failed to initialize database: ${err.message}`);
				throw new Error(`Database initialization failed [trace:${traceId}]`);
			}
			
			this.sqliteInstance = dbInstance;
			
			// Get direct database handle for vector operations
			this.sqliteInstance.getTable('_system', { suppressStatementLog: true }, (err, table) => {
				if (!err && table) {
					// Store reference for direct operations
					this._systemTable = table;
				}
			});
		});
	}

	// ---------------------------------------------------------------------
	// query - Execute SELECT operations

	query(sql, params = [], callback) {
		const { xLog } = process.global;
		
		if (!this.sqliteInstance) {
			const traceId = Math.floor(Math.random() * 1e9);
			const error = new Error(`Database not initialized [trace:${traceId}]`);
			error.traceId = traceId;
			callback(error);
			return;
		}

		// For parameterized queries, we need direct database access
		// Access the internal db object (better-sqlite3 instance)
		try {
			const db = this.sqliteInstance.db;
			
			// Prepare and execute the query with parameters
			const stmt = db.prepare(sql);
			const results = params.length > 0 ? stmt.all(...params) : stmt.all();
			
			callback(null, results);
		} catch (err) {
			const traceId = Math.floor(Math.random() * 1e9);
			const error = new Error(`SQL query failed: ${err.message} [trace:${traceId}]`);
			error.traceId = traceId;
			xLog.error(`[${traceId}] SQL query failed: ${err.message}`);
			xLog.error(`SQL: ${sql}`);
			if (params.length > 0) {
				xLog.error(`Parameters: ${params.length} params provided`);
			}
			callback(error);
		}
	}

	// ---------------------------------------------------------------------
	// execute - Execute INSERT/UPDATE/DELETE operations

	execute(sql, params = [], callback) {
		const { xLog } = process.global;
		
		if (!this.sqliteInstance) {
			const traceId = Math.floor(Math.random() * 1e9);
			const error = new Error(`Database not initialized [trace:${traceId}]`);
			error.traceId = traceId;
			callback(error);
			return;
		}

		// Use a temporary table to execute arbitrary statements
		this.sqliteInstance.getTable('_query_util', { suppressStatementLog: true }, (err, table) => {
			if (err) {
				const traceId = Math.floor(Math.random() * 1e9);
				const error = new Error(`Failed to get query interface: ${err.message} [trace:${traceId}]`);
				error.traceId = traceId;
				xLog.error(`[${traceId}] Execute interface error: ${err.message}`);
				callback(error);
				return;
			}

			// Execute statement using runStatement with noTableNameOk flag
			table.runStatement(sql, { 
				suppressStatementLog: true, 
				noTableNameOk: true 
			}, (err, result) => {
				if (err) {
					const traceId = Math.floor(Math.random() * 1e9);
					const error = new Error(`${err.message} [trace:${traceId}]`);
					error.traceId = traceId;
					xLog.error(`[${traceId}] SQL execute failed: ${err.message}`);
					callback(error);
					return;
				}
				
				callback(null, result);
			});
		});
	}

	// ---------------------------------------------------------------------
	// tableExists - Check if a table exists

	tableExists(tableName, callback) {
		const sql = schemaQueries.tableExists(tableName);
		
		this.query(sql, [], (err, results) => {
			if (err) {
				callback(err);
				return;
			}
			
			const exists = results.length > 0 && results[0].count > 0;
			callback(null, exists);
		});
	}

	// ---------------------------------------------------------------------
	// getTableSchema - Get column information for a table

	getTableSchema(tableName, callback) {
		const sql = schemaQueries.getTableSchema(tableName);
		
		this.query(sql, [], (err, results) => {
			if (err) {
				callback(err);
				return;
			}
			
			// Transform results to consistent format
			const schema = results.map(col => ({
				cid: col.cid,
				name: col.name,
				type: col.type,
				notnull: col.notnull,
				defaultValue: col.dflt_value,
				pk: col.pk
			}));
			
			callback(null, schema);
		});
	}

	// ---------------------------------------------------------------------
	// createVectorTable - Create a vector-optimized table

	createVectorTable(tableName, dimensions = 1536, callback) {
		const { xLog } = process.global;
		const sql = this.statements.vectorStatements.createVectorTable(tableName, dimensions);
		
		this.execute(sql, [], (err, result) => {
			if (err) {
				// Check if it's a vector extension issue
				if (err.message.includes('no such module') || err.message.includes('vec')) {
					const traceId = Math.floor(Math.random() * 1e9);
					const vecError = new Error(`sqlite-vec extension not available [trace:${traceId}]`);
					vecError.traceId = traceId;
					xLog.warning(`[${traceId}] Vector extension not available - vector operations disabled`);
					callback(vecError);
					return;
				}
				callback(err);
				return;
			}
			
			xLog.verbose(`Created vector table: ${tableName} with ${dimensions} dimensions`);
			callback(null, result);
		});
	}

	// ---------------------------------------------------------------------
	// listTables - List all tables in database

	listTables(callback) {
		const sql = schemaQueries.listTables();
		
		this.query(sql, [], (err, results) => {
			if (err) {
				callback(err);
				return;
			}
			
			const tables = results
				.map(row => row.name)
				.filter(name => !name.startsWith('sqlite_')); // Exclude system tables
			
			callback(null, tables);
		});
	}

	// ---------------------------------------------------------------------
	// getTableStats - Get row counts and size info

	getTableStats(tableName, callback) {
		const sql = schemaQueries.getTableStats(tableName);
		
		this.query(sql, [], (err, results) => {
			if (err) {
				callback(err);
				return;
			}
			
			const stats = {
				tableName,
				rowCount: results[0]?.count || 0,
				columns: results[0]?.columns || 0
			};
			
			callback(null, stats);
		});
	}

	// ---------------------------------------------------------------------
	// insertVector - Insert vector with metadata

	insertVector(tableName, refId, vector, metadata = {}, callback) {
		const sql = this.statements.vectorStatements.insertVector(tableName, refId, vector, metadata);
		
		this.execute(sql, [], callback);
	}

	// ---------------------------------------------------------------------
	// searchVectors - Semantic similarity search

	searchVectors(tableName, queryVector, limit = 5, callback) {
		const sql = this.statements.vectorStatements.searchVectors(tableName, queryVector, limit);
		
		this.query(sql, [], callback);
	}

	// ---------------------------------------------------------------------
	// close - Close database connection

	close() {
		// sqlite-instance doesn't expose a close method, but we can clean up references
		this.sqliteInstance = null;
		this._systemTable = null;
	}
}

// =====================================================================
// MODULE EXPORTS
// =====================================================================

module.exports = DirectQueryUtility;