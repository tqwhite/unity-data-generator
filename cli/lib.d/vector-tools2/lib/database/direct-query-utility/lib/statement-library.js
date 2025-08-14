#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

// =====================================================================
// STATEMENT LIBRARY - Central repository for all SQL patterns
// =====================================================================

const moduleFunction = () => {
	
	// ---------------------------------------------------------------------
	// vectorStatements - All vector-specific SQL operations
	
	const vectorStatements = {
		// Create virtual vector table using sqlite-vec
		createVectorTable: (tableName, dimensions) => {
			return `
				CREATE VIRTUAL TABLE IF NOT EXISTS ${tableName} 
				USING vec0(
					embedding float[${dimensions}],
					sourceRefId TEXT,
					sourceTableName TEXT,
					sourceContent TEXT,
					metadata TEXT
				);
			`;
		},

		// Create atomic vector table (regular table for rich metadata)
		createAtomicVectorTable: (tableName) => {
			return `
				CREATE TABLE IF NOT EXISTS ${tableName} (
					refId TEXT PRIMARY KEY,
					sourceRefId TEXT NOT NULL,
					factType TEXT,
					factText TEXT,
					embedding BLOB,
					semanticCategory TEXT,
					conceptualDimension TEXT,
					factIndex INTEGER,
					createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
					updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
					FOREIGN KEY (sourceRefId) REFERENCES source_table(refId)
				);
				CREATE INDEX IF NOT EXISTS idx_${tableName}_sourceRefId ON ${tableName}(sourceRefId);
				CREATE INDEX IF NOT EXISTS idx_${tableName}_factType ON ${tableName}(factType);
			`;
		},

		// Insert vector embedding
		insertVector: (tableName, refId, vector, metadata) => {
			const vectorStr = Array.isArray(vector) ? `'[${vector.join(',')}]'` : vector;
			const metadataStr = JSON.stringify(metadata);
			
			return `
				INSERT INTO ${tableName} (
					embedding, 
					sourceRefId, 
					sourceTableName, 
					sourceContent, 
					metadata
				) VALUES (
					${vectorStr},
					'${refId}',
					'${metadata.sourceTable || ''}',
					'${(metadata.content || '').replace(/'/g, "''")}',
					'${metadataStr.replace(/'/g, "''")}'
				);
			`;
		},

		// Search vectors by similarity
		searchVectors: (tableName, queryVector, limit) => {
			const vectorStr = Array.isArray(queryVector) ? `'[${queryVector.join(',')}]'` : queryVector;
			
			return `
				SELECT 
					sourceRefId,
					sourceTableName,
					sourceContent,
					metadata,
					distance
				FROM ${tableName}
				WHERE embedding MATCH ${vectorStr}
				ORDER BY distance
				LIMIT ${limit};
			`;
		},

		// Update vector embedding
		updateVector: (tableName, refId, vector) => {
			const vectorStr = Array.isArray(vector) ? `'[${vector.join(',')}]'` : vector;
			
			return `
				UPDATE ${tableName}
				SET embedding = ${vectorStr},
					updatedAt = CURRENT_TIMESTAMP
				WHERE sourceRefId = '${refId}';
			`;
		},

		// Delete vectors by source
		deleteVectorsBySource: (tableName, sourceRefId) => {
			return `
				DELETE FROM ${tableName}
				WHERE sourceRefId = '${sourceRefId}';
			`;
		}
	};

	// ---------------------------------------------------------------------
	// sourceTableStatements - Operations on source data tables
	
	const sourceTableStatements = {
		// Get CEDS elements
		getCedsElements: (whereClause = '') => {
			return `
				SELECT 
					GlobalID as refId,
					ElementName,
					Definition,
					Format,
					HasOptionSet,
					UsageNotes
				FROM _CEDSElements
				${whereClause ? 'WHERE ' + whereClause : ''}
				ORDER BY GlobalID;
			`;
		},

		// Get SIF elements
		getSifElements: (whereClause = '') => {
			return `
				SELECT 
					refId,
					Name,
					Description,
					XPath,
					Type,
					Mandatory,
					Format
				FROM naDataModel
				${whereClause ? 'WHERE ' + whereClause : ''}
				ORDER BY refId;
			`;
		},

		// Count source records
		countSourceRecords: (tableName) => {
			return `SELECT COUNT(*) as count FROM ${tableName};`;
		},

		// Get source records for processing
		getSourceRecordsForProcessing: (tableName, keyField, offset, limit) => {
			return `
				SELECT *
				FROM ${tableName}
				ORDER BY ${keyField}
				LIMIT ${limit} OFFSET ${offset};
			`;
		}
	};

	// ---------------------------------------------------------------------
	// progressStatements - Progress tracking operations
	
	const progressStatements = {
		// Create progress tracking table
		createProgressTable: () => {
			return `
				CREATE TABLE IF NOT EXISTS vectorTools_progress (
					batch_id TEXT PRIMARY KEY,
					data_profile TEXT,
					semantic_mode TEXT,
					source_table TEXT,
					target_table TEXT,
					source_key_field TEXT,
					total_records INTEGER,
					processed_records INTEGER DEFAULT 0,
					last_processed_key TEXT,
					start_time TEXT,
					last_update_time TEXT,
					status TEXT DEFAULT 'running',
					command_params TEXT,
					created_at TEXT DEFAULT CURRENT_TIMESTAMP
				);
				CREATE INDEX IF NOT EXISTS idx_progress_profile_mode 
				ON vectorTools_progress(data_profile, semantic_mode);
			`;
		},

		// Insert progress record
		insertProgress: (batchId, profile, mode, sourceTable, targetTable, keyField, total, params) => {
			return `
				INSERT INTO vectorTools_progress (
					batch_id, data_profile, semantic_mode, source_table, 
					target_table, source_key_field, total_records, 
					start_time, last_update_time, command_params
				) VALUES (
					'${batchId}', '${profile}', '${mode}', '${sourceTable}',
					'${targetTable}', '${keyField}', ${total},
					datetime('now'), datetime('now'), '${JSON.stringify(params)}'
				);
			`;
		},

		// Update progress
		updateProgress: (batchId, processed, lastKey) => {
			return `
				UPDATE vectorTools_progress
				SET processed_records = ${processed},
					last_processed_key = '${lastKey}',
					last_update_time = datetime('now')
				WHERE batch_id = '${batchId}';
			`;
		},

		// Complete batch
		completeBatch: (batchId) => {
			return `
				UPDATE vectorTools_progress
				SET status = 'completed',
					last_update_time = datetime('now')
				WHERE batch_id = '${batchId}';
			`;
		},

		// Get incomplete batches
		getIncompleteBatches: (profile, mode) => {
			return `
				SELECT *
				FROM vectorTools_progress
				WHERE data_profile = '${profile}'
					AND semantic_mode = '${mode}'
					AND status = 'running'
				ORDER BY created_at DESC;
			`;
		}
	};

	// ---------------------------------------------------------------------
	// queryStatements - Direct query tool operations
	
	const queryStatements = {
		// Show all (join source and vector)
		showAll: (sourceTable, vectorTable, whereClause) => {
			return `
				SELECT 
					s.*,
					v.embedding IS NOT NULL as has_vector,
					v.metadata
				FROM ${sourceTable} s
				LEFT JOIN ${vectorTable} v ON s.refId = v.sourceRefId
				${whereClause ? 'WHERE ' + whereClause : ''}
				LIMIT 100;
			`;
		},

		// Source only
		sourceOnly: (sourceTable, whereClause) => {
			return `
				SELECT *
				FROM ${sourceTable}
				${whereClause ? 'WHERE ' + whereClause : ''}
				LIMIT 100;
			`;
		},

		// Vectors only
		vectorsOnly: (vectorTable, whereClause) => {
			return `
				SELECT 
					sourceRefId,
					sourceTableName,
					sourceContent,
					metadata
				FROM ${vectorTable}
				${whereClause ? 'WHERE ' + whereClause : ''}
				LIMIT 100;
			`;
		},

		// Compare analysis (atomic vectors)
		compareAnalysis: (sourceTable, atomicTable, whereClause) => {
			return `
				SELECT 
					s.refId,
					s.Name,
					s.Description,
					COUNT(a.refId) as atomic_facts_count,
					GROUP_CONCAT(DISTINCT a.factType) as fact_types,
					GROUP_CONCAT(DISTINCT a.semanticCategory) as categories
				FROM ${sourceTable} s
				LEFT JOIN ${atomicTable} a ON s.refId = a.sourceRefId
				${whereClause ? 'WHERE ' + whereClause : ''}
				GROUP BY s.refId
				LIMIT 100;
			`;
		}
	};

	// ---------------------------------------------------------------------
	// utilityStatements - General utility operations
	
	const utilityStatements = {
		// Drop table safely
		dropTable: (tableName) => {
			return `DROP TABLE IF EXISTS ${tableName};`;
		},

		// Vacuum database
		vacuum: () => {
			return `VACUUM;`;
		},

		// Analyze for query optimization
		analyze: () => {
			return `ANALYZE;`;
		},

		// Get database size
		getDatabaseSize: () => {
			return `
				SELECT 
					page_count * page_size as size_bytes,
					ROUND(page_count * page_size / 1024.0 / 1024.0, 2) as size_mb
				FROM pragma_page_count(), pragma_page_size();
			`;
		}
	};

	// =====================================================================
	// RETURN PUBLIC INTERFACE
	// =====================================================================
	
	return {
		vectorStatements,
		sourceTableStatements,
		progressStatements,
		queryStatements,
		utilityStatements
	};
};

module.exports = moduleFunction;