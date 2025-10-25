#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = () => {
	
	const frameworkHelpInfo = `
QTOOLS-AI-FRAMEWORK SPECIFIC

	-help, --help	shows this help message. No processing is done.
	
	-showConfig	display the final configuration (pipe to jq, if you have it)
	
	-silent	turns off all message output
	-quiet	turns off all but error messages
	-verbose	shows additional messages that clarify what is going on
	-debug	shows all development debugging messages, plus verbose and everything else
`;

	const mainHelp = (args = {}) => {
		const { defaultRequestFilePath, errorMessage = '' } = args;
		
		return `
============================================================

NAME

	Vector Tools 2 - Next-generation vector embeddings manager for Unity Object Generator

DESCRIPTION

	vectorTools2 --dataProfile=PROFILE [OPTIONS]
	
	Creates, manages, and queries vector embeddings for semantic similarity search.
	Supports both CEDS and SIF data profiles for educational standards mapping.
	
	PolyArch2 reimplementation with improved architecture, testability, and maintainability.
	100% compatible with original vectorTools while providing superior performance.
	
	Uses OpenAI text-embedding-3-small model to generate vector embeddings stored
	in SQLite with sqlite-vec extension for fast similarity queries.

SEMANTIC SIMILARITY SEARCH

	When using --queryString, the tool performs semantic similarity search by:
	1. Converting your query text into a vector embedding using OpenAI's model
	2. Comparing it against all stored embeddings using cosine similarity
	3. Returning the most semantically similar records (default: 5 results)
	
	Example: vectorTools2 --dataProfile=sif --queryString="LEA data"

DIRECT DATABASE QUERIES

	The tool supports direct SQL-like queries for precise data exploration:
	
	--query=QUERY_TYPE --whereClause="CONDITION":
	  • showAll: Join source data with vector metadata
	  • sourceOnly: Show source table records only
	  • vectorsOnly: Show vector table records only
	  • compareAnalysis: Compare original definitions with atomic analysis
	  • matchDiscrepancies: Find elements where simple/atomic vectors disagree
	  • unityCedsComparison: Show elements with unityCedsMatch AI recommendations
	
	Use --whereClause=help to see available field names for any query type.

DATABASE BUILDING

	1. INITIAL SETUP: Use -newDatabase to create vector tables
	   vectorTools2 --dataProfile=sif -newDatabase
	   
	2. GENERATE EMBEDDINGS: Use -writeVectorDatabase for incremental updates
	   vectorTools2 --dataProfile=sif -writeVectorDatabase
	   
	3. COMPLETE REBUILD: Use -rebuildDatabase for full regeneration
	   vectorTools2 --dataProfile=sif -rebuildDatabase -yesAll
	   
	4. RECOVERY: If interrupted, use -resume to continue
	   vectorTools2 --dataProfile=ceds -resume

CONTROLS

	--dataProfile:       REQUIRED: Data source (sif, ceds)
	--queryString:       Natural language search query
	--offset:           Skip records for pagination
	--limit:            Batch size limit
	--resultCount:      Number of search results (default: 5)
	--targetTableName:  Override default vector table name
	--semanticAnalysisMode: simpleVector, atomicVector, or pureIntelligence
	--semanticAnalyzerVersion: atomic_version1, atomic_version2, or pure_intelligence_v1
	--query:            Direct database query type
	--whereClause:      SQL WHERE condition for queries
	--resultLimit:      Max results for direct queries
	--batchId:          Resume specific batch
	--thoughtProcess:   Framework thought process selection
	
	-writeVectorDatabase: Generate embeddings incrementally
	-newDatabase:       Create new vector tables
	-dropTable:         Remove vector tables
	-showStats:         Display database statistics
	-rebuildDatabase:   Full regeneration
	-resume:           Continue interrupted operation
	-showProgress:     Display current progress
	-purgeProgressTable: Clean progress tracking
	-yesAll:           Skip confirmations
	-json:             JSON output format
	-verbose:          Detailed output
	-debug:            Debug messages
	-quiet:            Suppress status messages
	-silent:           Suppress all output

DATA PROFILES

	sif:    Unity/SIF elements from naDataModel table
	ceds:   CEDS elements from _CEDSElements table

EXAMPLES

	vectorTools2 --dataProfile=sif -showStats
	vectorTools2 --dataProfile=ceds -rebuildDatabase -verbose
	vectorTools2 --dataProfile=sif --queryString="LEA accountability"
	vectorTools2 --dataProfile=ceds --query=showAll --whereClause="ElementName like '%student%'"
	vectorTools2 --dataProfile=sif --semanticAnalysisMode=atomicVector -writeVectorDatabase

VERSION 2.0 IMPROVEMENTS

	• PolyArch2 architecture with formal interfaces
	• Registry pattern for extensibility  
	• Test-driven development with >90% coverage
	• Safe database operations (no crashes)
	• Enhanced error handling with trace IDs
	• Modular semantic analyzers
	• Framework-only implementation

<!frameworkHelpInfo!>

============================================================
${errorMessage}
`.qtTemplateReplace({frameworkHelpInfo});
	};

	return { mainHelp, frameworkHelpInfo };
};

module.exports = moduleFunction;