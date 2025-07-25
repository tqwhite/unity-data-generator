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

	unityCedsMatch ELEMENTNAME
	
	Analyzes Unity/SIF elements and uses AI to find the best matching CEDS elements
	based on semantic similarity of descriptions, types, and characteristics.
	
	Outputs JSON file with CEDS recommendations, confidence scores, and candidate alternatives.

CONTROLS

	--elements:         specify Unity element names to process
	--outFile:          override default output file path  
	--overrideConfigPath: specify configuration file to override default

SWITCHES

	-loadDatabase:      save CEDS match results to database (unityCedsMatches table)
	-aiOnly:           use AI-only configuration mode
	-echoAlso:         display results in console as well as saving to file
	-listElements:     show available Unity elements for processing
	-help:             show this help message

<!frameworkHelpInfo!>

EXAMPLES

	unityCedsMatch --elements=LEAAccountabilitys           # Process LEA accountability elements
	unityCedsMatch --elements=StudentPersonal -echoAlso   # Show results in console too
	unityCedsMatch --elements=StudentPersonal -loadDatabase # Save to database
	unityCedsMatch -listElements                           # Show available elements
	unityCedsMatch --outFile=/path/to/custom.json LEAAccountabilitys # Custom output path

============================================================
${errorMessage}
`;
};

	return ({mainHelp});
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction();