'use strict';
const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

/**
 * Database Manager
 * Handles database operations for spreadsheet data
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const tableBackup = require('./tableBackup');
const schemaManager = require('./schemaManager');

/**
 * Initialize a database connection
 * @param {string} databaseFilePath - Path to the SQLite database file
 * @returns {Object} Database connection object
 */
function initDatabase(databaseFilePath) {
	const Database = require('better-sqlite3');

	// Ensure directory exists
	const dbDir = path.dirname(databaseFilePath);
	if (!fs.existsSync(dbDir)) {
		fs.mkdirSync(dbDir, { recursive: true });
	}

	// Initialize database with basic logging
	return new Database(databaseFilePath, {
		verbose: process.env.NODE_ENV === 'development' ? console.log : null,
	});
}

/**
 * Save data to the database
 * @param {string} databaseFilePath - Path to the database file
 * @param {Object} spreadsheetData - Data from the spreadsheet
 * @param {string} tableName - Name of the table to save to (optional)
 * @param {string} refIdSourceNames - Comma-separated field names for refId generation (optional)
 * @returns {Promise<void>}
 *
 * Note: All records will be saved with:
 * - refId: A hash generated from configurable source fields
 * - createdAt: Timestamp when the record was created
 * - updatedAt: Timestamp when the record was last updated
 */
async function saveData(
	databaseFilePath,
	spreadsheetData,
	tableName,
	refIdSourceNames = 'XPath',
) {
	const { xLog, getConfig } = process.global;

	// Legacy default table name (should be passed from config instead)
	// This is kept for backward compatibility but should not be used directly
	const { LEGACY_DEFAULT_TABLE_NAME } = getConfig(moduleName);
	tableName = tableName ? tableName : LEGACY_DEFAULT_TABLE_NAME;
	const db = initDatabase(databaseFilePath);

	try {
		xLog.status(`Writing data to database at: ${databaseFilePath}`);

		// Backup existing table if it exists
		tableBackup.backupTable(db, tableName);

		// Process data with generated numeric refIds, createdAt and updatedAt timestamps
		const currentTimestamp = new Date().toISOString();
		const processedData = spreadsheetData.data.map((record) => {
			// Generate a numeric refId using configurable source fields
			const refId = generateRefId(record, refIdSourceNames);
			return {
				...record,
				refId: refId,
				createdAt: currentTimestamp,
				updatedAt: currentTimestamp,
			};
		});

		// Create the table schema using the processed data that includes the timestamp fields
		schemaManager.createTableSchema(db, tableName, processedData);

		// Perform batch insert with duplicate handling
		const stats = insertDataTransaction(db, tableName, processedData);

		xLog.status(
			`\nDatabase updated successfully: ${stats.inserted} records inserted` +
			(stats.skipped > 0 ? `, ${stats.skipped} duplicates skipped` : ''),
		);
	} finally {
		// Always close the database connection
		db.close();
	}
}

/**
 * Read data from the database
 * @param {string} databaseFilePath - Path to the database file
 * @param {string} tableName - Name of the table to read from (optional)
 * @returns {Promise<Object>} The data read from the database
 */
async function readData(
	databaseFilePath,
	tableName,
) {
	const { xLog, getConfig } = process.global;
	
	// Get default table name from config
	const { LEGACY_DEFAULT_TABLE_NAME } = getConfig(moduleName);
	tableName = tableName ? tableName : LEGACY_DEFAULT_TABLE_NAME;
	const db = initDatabase(databaseFilePath);

	try {
		xLog.status(`Reading data from database at: ${databaseFilePath}`);

		// Check if table exists
		const tableExists = db
			.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
			.get(tableName);
		if (!tableExists) {
			throw new Error(
				`Table '${tableName}' does not exist in the database. Use -loadDatabase to create it first.`,
			);
		}

		// Read all rows from the table
		const rows = db.prepare(`SELECT * FROM "${tableName}"`).all();

		// Remove only string refId from the results, keep refIdInt
		const cleanData = rows.map((row) => {
			const { refId, ...rest } = row;
			// Keep refIdInt if it exists, as it's useful for vector databases
			return rest;
		});

		// Get unique columns (excluding refId)
		const allColumns = new Set();
		cleanData.forEach((row) => {
			Object.keys(row).forEach((key) => allColumns.add(key));
		});

		// Create result data structure
		const resultData = {
			metadata: {
				source: 'Database',
				tableName,
				totalRows: cleanData.length,
				columns: Array.from(allColumns),
			},
			data: cleanData,
		};

		xLog.status(
			`Loaded ${cleanData.length} records from database table '${tableName}'`,
		);

		return resultData;
	} finally {
		// Always close the database connection
		db.close();
	}
}

/**
 * Purge old database backup tables
 * @param {string} databaseFilePath - Path to the database file
 * @param {number} retainCount - Number of recent backups to keep
 * @param {string} baseTableName - Base table name for backups (optional)
 * @returns {Promise<Object>} Results of the purge operation
 */
async function purgeBackups(
	databaseFilePath,
	retainCount,
	baseTableName,
) {
	const { xLog, getConfig } = process.global;
	
	// Get default table name from config
	const { LEGACY_DEFAULT_TABLE_NAME } = getConfig(moduleName);
	baseTableName = baseTableName ? baseTableName : LEGACY_DEFAULT_TABLE_NAME;
	const db = initDatabase(databaseFilePath);

	try {
		xLog.status(`Purging old backup tables for ${baseTableName}...`);
		const result = tableBackup.purgeBackupTables(
			db,
			baseTableName,
			retainCount,
		);

		if (result && result.deleted && result.deleted.length > 0) {
			xLog.status(`Successfully purged ${result.deleted.length} backup tables`);
			xLog.status(
				`Kept the most recent ${result.kept.length} backups: ${result.kept.join(', ')}`,
			);
			xLog.status(`Deleted old backups: ${result.deleted.join(', ')}`);
		} else {
			xLog.status(
				`No backup tables were deleted. Either none found or all were within the retain count (${retainCount}).`,
			);
		}

		return result;
	} finally {
		// Always close the database connection
		db.close();
	}
}

/**
 * Generate a refId for a record
 * @param {Object} record - The record to generate an ID for
 * @param {string} refIdSourceNames - Comma-separated list of field names to use for refId generation
 * @returns {string} Numeric refId as a string
 *
 * Note: The refId is generated based on configurable field names. Special keyword 'allExcept'
 * can be used to include all fields except those listed after it.
 */
function generateRefId(record, refIdSourceNames = 'XPath') {
	const sourceNames = refIdSourceNames.split(',').map((s) => s.trim());

	let fieldsToUse = [];

	if (sourceNames[0] === 'allExcept') {
		// Use all fields except the ones listed after 'allExcept'
		const excludeFields = sourceNames.slice(1);
		fieldsToUse = Object.keys(record).filter(
			(key) => !excludeFields.includes(key),
		);
	} else {
		// Use specific fields listed
		fieldsToUse = sourceNames;
	}

	// Build concatenated value from specified fields
	const values = fieldsToUse.map((fieldName) => record[fieldName] || '');
	let uniqueValue = values.join('|');

	// If no value was generated, use a fallback
	if (!uniqueValue || uniqueValue === '|'.repeat(values.length - 1)) {
		// Fallback: use all available fields
		const allValues = Object.keys(record)
			.sort() // Sort for consistency
			.map((key) => record[key] || '');
		uniqueValue = allValues.join('|');
	}

	// Generate a SHA-256 hash of the unique value
	const hash = crypto.createHash('sha256').update(uniqueValue).digest('hex');

	// Convert the first 16 characters of the hash to a numeric refId (64 bits)
	// Using 16 chars instead of 12 to reduce birthday paradox collisions
	// With 64 bits, collision probability is negligible for datasets < 1M records
	// Using BigInt ensures it can represent large integers precisely
	// Converting to string for storage compatibility
	return BigInt('0x' + hash.substring(0, 16)).toString();
}

/**
 * Insert data into a table, gracefully handling duplicates
 * @param {Object} db - Database connection
 * @param {string} tableName - Name of the table
 * @param {Array} records - Records to insert
 * @returns {Object} Statistics about the insertion (inserted, skipped, duplicates)
 */
function insertDataTransaction(db, tableName, records) {
	const { xLog } = process.global;

	// Get all property names (columns) from all records
	const allProperties = new Set();
	records.forEach((record) => {
		Object.keys(record).forEach((key) => allProperties.add(key));
	});

	// Create a prepared statement for insertion
	const props = Array.from(allProperties);
	const placeholders = props.map(() => '?').join(',');
	const insertSQL = `INSERT INTO "${tableName}" (${props.map((p) => `"${p}"`).join(',')}) VALUES (${placeholders})`;
	const insertStmt = db.prepare(insertSQL);

	// Track statistics
	const stats = {
		total: records.length,
		inserted: 0,
		skipped: 0,
		duplicates: []
	};

	// Insert each record with error handling for duplicates
	records.forEach((record, index) => {
		try {
			const values = props.map((prop) => record[prop] || null);
			insertStmt.run(values);
			stats.inserted++;
		} catch (error) {
			// Check if it's a UNIQUE constraint violation
			// better-sqlite3 uses code: 'SQLITE_CONSTRAINT_UNIQUE' for unique violations
			if (error.code && (error.code.includes('CONSTRAINT') || error.message.includes('UNIQUE'))) {
				stats.skipped++;
				// Store info about the duplicate for reporting
				const duplicateInfo = {
					rowNumber: index + 1,
					refId: record.refId,
					sample: {
						'Global ID': record['Global ID'],
						'Element Name': record['Element Name'],
						'Domain': record['Domain'],
						'Entity': record['Entity']
					}
				};
				stats.duplicates.push(duplicateInfo);
			} else {
				// Re-throw other errors
				xLog.error(`Unexpected database error (code: ${error.code}): ${error.message}`);
				throw error;
			}
		}
	});

	// Report duplicate statistics
	if (stats.skipped > 0) {
		xLog.status(`\nSkipped ${stats.skipped} duplicate record(s) during insertion`);
		if (stats.duplicates.length <= 10) {
			// Show all duplicates if 10 or fewer
			xLog.status('Duplicate records:');
			stats.duplicates.forEach(dup => {
				xLog.status(`  Row ${dup.rowNumber}: GlobalID=${dup.sample['Global ID']}, Element="${dup.sample['Element Name']}", Domain="${dup.sample['Domain']}"`);
			});
		} else {
			// Show first 5 if more than 10
			xLog.status('Sample of duplicate records (first 5):');
			stats.duplicates.slice(0, 5).forEach(dup => {
				xLog.status(`  Row ${dup.rowNumber}: GlobalID=${dup.sample['Global ID']}, Element="${dup.sample['Element Name']}", Domain="${dup.sample['Domain']}"`);
			});
			xLog.status(`  ... and ${stats.duplicates.length - 5} more duplicates`);
		}
	}

	return stats;
}

module.exports = {
	saveData,
	readData,
	purgeBackups,
	initDatabase,
	generateRefId,
};
