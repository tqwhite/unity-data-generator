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

	JEDX Utility - JEDX (JSON Educational Data Exchange) processing utilities

DESCRIPTION

	jedxUtility [OPTIONS]
	
	Provides utilities for processing JEDX (JSON Educational Data Exchange) format
	data within the Unity Object Generator project. JEDX is a JSON-based format
	for educational data interchange and standards compliance.
	
	WORKER SET MANAGEMENT:
	Primary function is managing duplicate worker sets for parallel processing
	of JEDX data. Creates and manages worker process configurations for 
	distributed data processing tasks.
	
	DATA PROCESSING WORKFLOW:
	Handles JEDX data transformation, validation, and worker coordination
	for large-scale educational data processing operations.

CONTROLS

	--count:            WORKERS: Number of duplicate worker sets to create (default: 10)
	                    Controls parallel processing capacity for JEDX operations
	                    
	--configPath:       OVERRIDE: Custom configuration file path
	                    Overrides default JEDX utility configuration settings

SWITCHES

	-duplicateWorkerSets: REQUIRED: Create duplicate worker sets for parallel processing
	                     Main operation mode for JEDX data processing coordination
	                     
	-addToDupeSet:       WORKERS: Add workers to existing duplicate set
	                     Extends existing worker configuration rather than creating new
	                     
	-verbose:            DEBUGGING: Show detailed processing information including
	                     worker creation progress and configuration details

<!frameworkHelpInfo!>

JEDX FORMAT

	JEDX (JSON Educational Data Exchange) is a JSON-based format for educational
	data standards compliance. It provides structured data interchange for:
	- Student information systems
	- Educational assessments  
	- Administrative data
	- Standards alignment data

WORKER SET CONCEPTS

	Duplicate Worker Sets:  Parallel processing configurations that allow
	                       multiple worker processes to handle JEDX data
	                       simultaneously for improved performance
	                       
	Worker Coordination:   Manages distribution of JEDX processing tasks
	                      across multiple worker processes with load balancing

COMMON OPERATIONS

	Worker Management:
	jedxUtility -duplicateWorkerSets --count=5                    # Create 5 worker sets
	jedxUtility -duplicateWorkerSets --count=10 -verbose          # Create with details
	
	Worker Extension:
	jedxUtility -duplicateWorkerSets -addToDupeSet --count=3      # Add 3 to existing set

EXAMPLES

	jedxUtility -duplicateWorkerSets                              # Create default (10) workers
	jedxUtility -duplicateWorkerSets --count=5 -verbose          # Create 5 workers with details
	jedxUtility -duplicateWorkerSets -addToDupeSet --count=2     # Add 2 workers to existing set
	jedxUtility -duplicateWorkerSets --count=20                  # High-capacity processing setup

WORKFLOW INTEGRATION

	The JEDX Utility typically works in conjunction with:
	- unityDataGenerator: For AI-powered data generation
	- vectorTools: For semantic similarity processing
	- dbSqlUtil: For database operations on processed JEDX data

============================================================
${errorMessage}
`;
};

	return ({mainHelp});
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction();