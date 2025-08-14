#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

// =====================================================================
// SCHEMA QUERIES - Database introspection and metadata operations
// =====================================================================

const moduleFunction = () => {
	
	// ---------------------------------------------------------------------
	// tableExists - Check if table exists
	
	const tableExists = (tableName) => {
		return `
			SELECT COUNT(*) as count
			FROM sqlite_master
			WHERE type = 'table'
				AND name = '${tableName}';
		`;
	};

	// ---------------------------------------------------------------------
	// getTableSchema - Get column information
	
	const getTableSchema = (tableName) => {
		return `PRAGMA table_info('${tableName}');`;
	};

	// ---------------------------------------------------------------------
	// listTables - List all tables
	
	const listTables = () => {
		return `
			SELECT name
			FROM sqlite_master
			WHERE type = 'table'
				AND name NOT LIKE 'sqlite_%'
			ORDER BY name;
		`;
	};

	// ---------------------------------------------------------------------
	// getTableStats - Get table statistics
	
	const getTableStats = (tableName) => {
		return `
			SELECT 
				COUNT(*) as count,
				(SELECT COUNT(*) 
				 FROM pragma_table_info('${tableName}')) as columns
			FROM ${tableName};
		`;
	};

	// ---------------------------------------------------------------------
	// getIndexes - Get indexes for a table
	
	const getIndexes = (tableName) => {
		return `
			SELECT name, sql
			FROM sqlite_master
			WHERE type = 'index'
				AND tbl_name = '${tableName}';
		`;
	};

	// ---------------------------------------------------------------------
	// getTriggers - Get triggers for a table
	
	const getTriggers = (tableName) => {
		return `
			SELECT name, sql
			FROM sqlite_master
			WHERE type = 'trigger'
				AND tbl_name = '${tableName}';
		`;
	};

	// ---------------------------------------------------------------------
	// getTableDependencies - Find foreign key relationships
	
	const getTableDependencies = (tableName) => {
		return `PRAGMA foreign_key_list('${tableName}');`;
	};

	// ---------------------------------------------------------------------
	// getVectorTables - Find all vector tables
	
	const getVectorTables = () => {
		return `
			SELECT name
			FROM sqlite_master
			WHERE type = 'table'
				AND (
					sql LIKE '%vec0%'
					OR name LIKE '%vector%'
					OR name LIKE '%embedding%'
				)
			ORDER BY name;
		`;
	};

	// ---------------------------------------------------------------------
	// getTableCreateStatement - Get CREATE statement for table
	
	const getTableCreateStatement = (tableName) => {
		return `
			SELECT sql
			FROM sqlite_master
			WHERE type = 'table'
				AND name = '${tableName}';
		`;
	};

	// ---------------------------------------------------------------------
	// getDatabaseInfo - Get overall database information
	
	const getDatabaseInfo = () => {
		return `
			SELECT 
				(SELECT COUNT(*) FROM sqlite_master WHERE type = 'table') as table_count,
				(SELECT COUNT(*) FROM sqlite_master WHERE type = 'index') as index_count,
				(SELECT COUNT(*) FROM sqlite_master WHERE type = 'trigger') as trigger_count,
				(SELECT COUNT(*) FROM sqlite_master WHERE type = 'view') as view_count,
				(SELECT page_count * page_size FROM pragma_page_count(), pragma_page_size()) as size_bytes;
		`;
	};

	// ---------------------------------------------------------------------
	// checkVectorExtension - Check if sqlite-vec is loaded
	
	const checkVectorExtension = () => {
		return `SELECT vec_version() as version;`;
	};

	// ---------------------------------------------------------------------
	// getTableSizes - Get size of all tables
	
	const getTableSizes = () => {
		return `
			SELECT 
				name,
				SUM(pgsize) as size_bytes
			FROM dbstat
			GROUP BY name
			ORDER BY size_bytes DESC;
		`;
	};

	// =====================================================================
	// RETURN PUBLIC INTERFACE
	// =====================================================================
	
	return {
		tableExists,
		getTableSchema,
		listTables,
		getTableStats,
		getIndexes,
		getTriggers,
		getTableDependencies,
		getVectorTables,
		getTableCreateStatement,
		getDatabaseInfo,
		checkVectorExtension,
		getTableSizes
	};
};

module.exports = moduleFunction;