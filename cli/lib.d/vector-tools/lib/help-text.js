#!/usr/bin/env node
'use strict';

const qt = require('qtools-functional-library');

//START OF moduleFunction() ============================================================

const moduleFunction = function(args={}) {

const mainHelp = args => {
	const {defaultRequestFilePath, errorMessage=''} = args;

	return `
============================================================

NAME

	Vector Tools - Manage vector embeddings for semantic search in Unity Object Generator

DESCRIPTION

	vectorTools --dataProfile=PROFILE [OPTIONS]
	
	Creates, manages, and queries vector embeddings for semantic similarity search.
	Supports both CEDS and SIF data profiles for educational standards mapping.
	
	Uses OpenAI text-embedding-3-small model to generate vector embeddings stored
	in SQLite with sqlite-vec extension for fast similarity queries.

CONTROLS

	--dataProfile:      specify data profile (sif, ceds) - REQUIRED for most operations
	--queryString:      search query text for similarity matching
	--offset:           starting record offset for batch processing
	--limit:            maximum number of records to process
	--resultCount:      number of similarity results to return (default: 5)
	--targetTableName:  override default table name for operations

SWITCHES

	-rebuildDatabase:   rebuild vector embeddings from scratch (deletes existing)
	-writeVectorDatabase: generate and write vector embeddings to database
	-newDatabase:       create new vector tables (preserves existing data)
	-dropTable:         drop vector tables for specified data profile
	-showStats:         display database statistics and table information
	-yesAll:           skip confirmation prompts (auto-confirm all operations)
	-json:             output results in JSON format
	-verbose:          show detailed processing information

<!frameworkHelpInfo!>

DATA PROFILES

	sif:    Unity/SIF elements from naDataModel table (15,620 records)
	        Creates sifElementVectors table with embeddings
	        
	ceds:   CEDS elements from _CEDSElements table (1,905 records)  
	        Creates cedsElementVectors table with embeddings

COMMON OPERATIONS

	Database Management:
	vectorTools --dataProfile=sif -rebuildDatabase    # Rebuild SIF vectors
	vectorTools --dataProfile=ceds -rebuildDatabase   # Rebuild CEDS vectors
	vectorTools --dataProfile=sif -showStats          # Show database stats
	vectorTools --dataProfile=sif -dropTable -yesAll # Drop SIF vector table
	
	Semantic Search:
	vectorTools --dataProfile=ceds --queryString="student enrollment" --resultCount=10
	vectorTools --dataProfile=sif --queryString="accountability reporting" -json

EXAMPLES

	vectorTools --dataProfile=sif -showStats                    # Show stats for SIF profile
	vectorTools --dataProfile=ceds -rebuildDatabase -verbose    # Rebuild CEDS with details
	vectorTools --dataProfile=sif --queryString="LEA data"      # Search SIF elements
	vectorTools --dataProfile=ceds --queryString="assessment" --resultCount=15 -json

============================================================
${errorMessage}
`;
};

	return ({mainHelp});
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction();