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

	Unity CEDS Match - Find semantic matches between Unity/SIF elements and CEDS standards

DESCRIPTION

	unityCedsMatch --elements=ELEMENTNAME [OPTIONS]
	
	Performs AI-powered semantic matching between Unity/SIF data elements and CEDS 
	(Common Education Data Standards) definitions. Reads Unity element specifications 
	from Excel files and generates structured JSON matches with confidence scores.
	
	Two-stage matching process:
	1. Semantic similarity search using vectorTools against CEDS embeddings (default)
	2. AI analysis using educational domain expertise to select optimal matches
	
	Alternative AI-only mode (-aiOnly) uses pure reasoning without vector embeddings
	for comprehensive analysis of complex elements.
	
	Results can be displayed, saved to JSON files, or persisted to the database 
	(-loadDatabase) for integration with the web application's voting system.

CONTROLS

	--elements:         REQUIRED: Unity/SIF element names to process for CEDS matching
	                    Supports single elements or comma-separated lists
	                    Examples: LEAAccountabilitys, StudentPersonal, SchoolInfo
	                    
	--outFile:          OUTPUT: Custom output file path for match results JSON
	                    Overrides default naming convention (element_ceds_matches.json)
	                    
	--overrideConfigPath: CONFIG: Custom configuration file path
	                     Overrides default Unity CEDS Match configuration settings
	                     
	--confidenceThreshold: FILTERING: Minimum confidence score for match inclusion (0.0-1.0)
	                      Default: 0.3 (filters out low-confidence matches)
	                      
	--maxAlternatives:    RESULTS: Maximum number of alternative CEDS suggestions per element
	                     Default: 5 (provides top alternative matches for review)

SWITCHES

	-loadDatabase:      DATABASE: Save CEDS match results to project database
	                    Stores in unityCedsMatches table for persistence and analysis
	                    
	-aiOnly:           AI_MODE: Use AI-only configuration without vector embeddings
	                   Relies purely on AI reasoning for semantic matching
	                   
	-echoAlso:         DISPLAY: Show match results in console as well as JSON file
	                   Provides immediate feedback and debugging information
	                   
	-listElements:     INFO: Display all available Unity elements for processing
	                   Shows complete catalog of supported data elements
	                   
	-verbose:          DEBUGGING: Show detailed AI reasoning and matching process
	                   Includes confidence calculations and semantic analysis details
	                   
	-generateReport:   REPORTING: Create comprehensive matching analysis report
	                   Includes statistics, confidence distributions, and match quality metrics

<!frameworkHelpInfo!>

SEMANTIC MATCHING FEATURES

	AI-Powered Analysis:    Advanced natural language processing for context understanding
	                       Goes beyond keyword matching to semantic and educational context
	                       
	Confidence Scoring:     Probabilistic match assessment with detailed confidence metrics
	                       Helps prioritize high-quality matches and identify uncertain cases
	                       
	Alternative Suggestions: Multiple CEDS candidates per Unity element with ranking
	                        Provides flexibility for manual review and selection
	                        
	Educational Context:    Domain-specific knowledge about educational data standards
	                       Understands relationships between student, school, and system data

MATCH QUALITY INDICATORS

	High Confidence (0.8+):    Strong semantic similarity and context match
	                          Recommended for automated mapping
	                          
	Medium Confidence (0.5-0.8): Good similarity but may need manual review
	                             Suitable for assisted mapping workflows
	                             
	Low Confidence (0.3-0.5):   Possible matches requiring human verification
	                            Useful for identifying potential relationships

INTEGRATION WORKFLOW

	Standards Compliance Pipeline:
	1. unityDataGenerator: Generate Unity test data
	2. unityCedsMatch: Map Unity elements to CEDS standards  
	3. vectorTools: Create semantic embeddings for similarity analysis
	4. dbSqlUtil: Store and analyze mapping results

COMMON OPERATIONS

	Basic Matching:
	unityCedsMatch --elements=LEAAccountabilitys                    # Simple element matching
	unityCedsMatch --elements=StudentPersonal -echoAlso           # Show results immediately
	
	Advanced Analysis:
	unityCedsMatch --elements=SchoolInfo -verbose -generateReport  # Detailed analysis
	unityCedsMatch --elements=StudentPersonal --confidenceThreshold=0.7 # High-confidence only
	
	Database Integration:
	unityCedsMatch --elements=LEAAccountabilitys -loadDatabase     # Persist results
	unityCedsMatch --elements=StudentPersonal,SchoolInfo -loadDatabase -verbose # Multiple elements
	
	Custom Configuration:
	unityCedsMatch --elements=StudentPersonal --maxAlternatives=10 --outFile=detailed_matches.json

EXAMPLES

	unityCedsMatch --elements=LEAAccountabilitys                          # Basic matching
	unityCedsMatch --elements=StudentPersonal -echoAlso -verbose         # Detailed output
	unityCedsMatch --elements=SchoolInfo,LEAInfo -loadDatabase          # Multiple elements to DB
	unityCedsMatch --elements=StudentPersonal --confidenceThreshold=0.8 # High confidence only
	unityCedsMatch -listElements                                         # Show available elements
	unityCedsMatch --elements=LEAAccountabilitys -aiOnly -generateReport # AI-only with report

============================================================
${errorMessage}
`;
};

	return ({mainHelp});
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction();