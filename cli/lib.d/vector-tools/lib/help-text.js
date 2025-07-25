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
	
	SEMANTIC SIMILARITY SEARCH:
	When using --queryString, the tool performs semantic similarity search by:
	1. Converting your query text into a vector embedding using OpenAI's model
	2. Comparing it against all stored embeddings using cosine similarity
	3. Returning the most semantically similar records (default: 5 results)
	
	Example: vectorTools --dataProfile=sif --queryString="LEA data" finds SIF 
	elements most semantically related to "LEA data" concepts, not just exact 
	text matches.
	
	DATABASE BUILDING AND UPDATING:
	Vector embeddings must be generated before searching. The process involves:
	
	1. INITIAL SETUP: Use -newDatabase to create vector tables if they don't exist
	   vectorTools --dataProfile=sif -newDatabase
	   
	2. GENERATE EMBEDDINGS: Use -writeVectorDatabase for incremental updates
	   vectorTools --dataProfile=sif -writeVectorDatabase
	   This processes only records without embeddings, preserving existing ones.
	   
	3. COMPLETE REBUILD: Use -rebuildDatabase when source data changes significantly
	   vectorTools --dataProfile=sif -rebuildDatabase -yesAll
	   WARNING: This deletes ALL existing embeddings and rebuilds from scratch.
	   
	4. MONITOR PROGRESS: Use -verbose to see embedding generation progress
	   Large datasets (15K+ SIF records) can take several minutes to process.
	   
	The system reads from source tables (naDataModel for SIF, _CEDSElements for CEDS)
	and creates corresponding vector tables (sifElementVectors, cedsElementVectors)
	with OpenAI embeddings for each record's text content.

CONTROLS

	--dataProfile:      REQUIRED: Specify data source (sif, ceds). Determines which 
	                    database table and vector table to use. SIF has 15K+ records,
	                    CEDS has 1.9K+ records from educational standards.
	                    
	--queryString:      SEARCH: Natural language text to find semantically similar records.
	                    Uses AI embeddings to find conceptual matches, not just keywords.
	                    Example: "student data" finds enrollment, demographics, etc.
	                    
	--offset:           PAGINATION: Skip this many records when processing large datasets.
	                    Useful for batch processing or resuming interrupted operations.
	                    
	--limit:            BATCH SIZE: Maximum records to process in one operation.
	                    Prevents memory issues with large datasets. Use with --offset.
	                    
	--resultCount:      SEARCH RESULTS: Number of similar records to return (default: 5).
	                    Higher values give more options but may include less relevant matches.
	                    
	--targetTableName:  OVERRIDE: Custom table name instead of default profile tables.
	                    Advanced option for testing or custom data sources.

SWITCHES

	-rebuildDatabase:   DESTRUCTIVE: Completely rebuilds vector embeddings from scratch.
	                    Drops existing vector tables and recreates with fresh embeddings.
	                    Use when data sources have changed or embeddings are corrupted.
	                    
	-writeVectorDatabase: INCREMENTAL: Generates embeddings for records that don't have them.
	                     Safe operation that preserves existing embeddings and only adds new ones.
	                     Use for regular updates when new records are added to source tables.
	                     
	-newDatabase:       SAFE: Creates new vector tables if they don't exist.
	                    Will not overwrite existing data. Use for initial setup.
	                    
	-dropTable:         DESTRUCTIVE: Removes vector tables for the specified data profile.
	                    All embeddings will be lost. Use -yesAll to skip confirmation.
	                    
	-showStats:         INFORMATIONAL: Shows database statistics including table sizes,
	                    record counts, and embedding status for each data profile.
	                    
	-yesAll:           AUTOMATION: Automatically confirms all prompts without user input.
	                   Dangerous with destructive operations. Use carefully in scripts.
	                   
	-json:             FORMAT: Returns search results in JSON format instead of human-readable.
	                   Useful for programmatic processing or integration with other tools.
	                   
	-verbose:          DEBUGGING: Shows detailed processing information including
	                   embedding generation progress and database operations.

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