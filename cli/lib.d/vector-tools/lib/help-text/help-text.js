'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = ({ moduleName } = {}) => ({ unused } = {}) => {
	// This is a special case module that is instantiated before process.global
	// and does not need it.

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
	
	DIRECT DATABASE QUERIES:
	The tool also supports direct SQL-like queries for precise data exploration:
	
	--query=QUERY_TYPE --whereClause="CONDITION":
	  Available query types:
	  • showAll: Join source data with vector metadata
	  • sourceOnly: Show source table records only
	  • vectorsOnly: Show vector table records only (where supported)
	  • compareAnalysis: Compare original definitions with atomic analysis
	  • matchDiscrepancies: Find SIF elements where simple/atomic vectors disagree
	  • unityCedsComparison: Show SIF descriptions with unityCedsMatch AI recommendations
	  • showQueryInfo: Display available query types and compiled SQL
	
	FIELD NAME DISCOVERY:
	Use --whereClause=help to see all available field names for any query type:
	  vectorTools --dataProfile=sif --query=showAll --whereClause=help
	  Shows source table fields, vector fields (if available), and example WHERE clauses.
	
	Examples:
	  vectorTools --dataProfile=sif --query=showAll --whereClause="Name like '%Student%'"
	  vectorTools --dataProfile=ceds --query=unityCedsComparison --resultLimit=5
	  vectorTools --dataProfile=sif --query=matchDiscrepancies
	
	DATABASE BUILDING AND UPDATING:
	Vector embeddings must be generated before searching. The process involves:
	
	1. INITIAL SETUP: Use -newDatabase to create vector tables if they don't exist
	   vectorTools --dataProfile=sif -newDatabase
	   
	2. GENERATE EMBEDDINGS: Use -writeVectorDatabase for incremental updates
	   vectorTools --dataProfile=sif -writeVectorDatabase
	   This processes only records without embeddings, preserving existing ones.
	   Use when source data is updated with additional records (e.g. CEDS v13 adds new elements).
	   
	3. COMPLETE REBUILD: Use -rebuildDatabase when source data changes significantly
	   vectorTools --dataProfile=sif -rebuildDatabase -yesAll
	   WARNING: This deletes ALL existing embeddings and rebuilds from scratch.
	   
	4. MONITOR PROGRESS: Use -verbose to see embedding generation progress
	   Large datasets (15K+ SIF records) can take several minutes to process.
	   
	5. RECOVERY FROM INTERRUPTIONS: If -writeVectorDatabase is interrupted:
	   - Use -showProgress to check status of incomplete embedding batches
	   - Use -resume to continue vector generation from the last processed record
	   - Use -purgeProgressTable if resume fails or progress tracking is corrupted
	   
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
	                    
	--semanticAnalyzerVersion: VERSION: Specify which analyzer version to use.
	                    Options: atomic_version1, atomic_version2, simple_version1
	                    Default: atomic_version2 for atomic, simple_version1 for simple
	                    
	--query:            DIRECT QUERY: Specify query type for direct database access.
	                    Types: showAll, sourceOnly, vectorsOnly, compareAnalysis,
	                    matchDiscrepancies, unityCedsComparison, showQueryInfo.
	                    Use with --whereClause for filtering (except special types).
	                    
	--whereClause:      FILTER: SQL WHERE clause for direct queries. Use "help" to
	                    see available field names and example syntax for current
	                    data profile. Example: "Name like '%Student%'" or "help".
	                    
	--resultLimit:      LIMIT: Maximum records to return from direct queries.
	                    Useful for large result sets. Works with all query types.

SWITCHES

	-rebuildDatabase:   DESTRUCTIVE: Completely rebuilds vector embeddings from scratch.
	                    Drops existing vector tables and recreates with fresh embeddings.
	                    Use when data sources have changed or embeddings are corrupted.
	                    
	-writeVectorDatabase: INCREMENTAL: Generates embeddings for records that don't have them.
	                     Safe operation that preserves existing embeddings and only adds new ones.
	                     Use when source data grows (e.g., CEDS updated from 1,905 to 2,100 records).
	                     
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
	                   
	-resume:           RECOVERY: Resumes interrupted -writeVectorDatabase operations from
	                   the last processed record. Finds incomplete batches and continues
	                   vector embedding generation where it left off after crashes.
	                   
	-showProgress:     MONITORING: Displays current progress of any running vector
	                   generation batches, including processed record counts and
	                   estimated completion times for active operations.
	                   
	-purgeProgressTable: MAINTENANCE: Cleans up stalled or corrupted progress tracking
	                     entries from interrupted operations. Use when -resume fails
	                     or when you need to force a fresh start after system crashes.

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
	vectorTools --dataProfile=ceds -writeVectorDatabase # Add vectors for new CEDS records
	vectorTools --dataProfile=sif -showStats          # Show database stats
	vectorTools --dataProfile=sif -dropTable -yesAll # Drop SIF vector table
	
	Progress Recovery (after interruption):
	vectorTools --dataProfile=ceds -showProgress      # Shows: "20/1905 records processed"
	vectorTools --dataProfile=ceds -resume -verbose   # Resumes from record 21
	vectorTools --dataProfile=ceds -purgeProgressTable -yesAll # If resume fails
	
	Semantic Search:
	vectorTools --dataProfile=ceds --queryString="student enrollment" --resultCount=10
	vectorTools --dataProfile=sif --queryString="accountability reporting" -json
	
	Direct Database Queries:
	vectorTools --dataProfile=sif --query=showAll --whereClause=help           # Show available fields
	vectorTools --dataProfile=sif --query=showAll --whereClause="Name like '%Student%'"
	vectorTools --dataProfile=ceds --query=unityCedsComparison --resultLimit=5
	vectorTools --dataProfile=sif --query=matchDiscrepancies                   # Compare vector methods
	vectorTools --dataProfile=ceds --query=compareAnalysis --whereClause="ElementName like '%assessment%'"

EXAMPLES

	vectorTools --dataProfile=sif -showStats                    # Show stats for SIF profile
	vectorTools --dataProfile=ceds -rebuildDatabase -verbose    # Rebuild CEDS with details
	vectorTools --dataProfile=sif --queryString="LEA data"      # Search SIF elements
	vectorTools --dataProfile=ceds --queryString="assessment" --resultCount=15 -json
	
	Direct Query Examples:
	vectorTools --dataProfile=sif --query=showAll --whereClause=help          # Get field help
	vectorTools --dataProfile=sif --query=unityCedsComparison --resultLimit=3 # Compare matches
	vectorTools --dataProfile=ceds --query=showAll --whereClause="ElementName like '%student%'"

============================================================
${errorMessage}
`;
	};

	return { mainHelp };
};

module.exports = moduleFunction({ moduleName }); //returns initialized moduleFunction