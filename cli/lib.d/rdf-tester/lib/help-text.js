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

	RDF Tester - RDF/OWL ontology testing and validation for Unity Object Generator

DESCRIPTION

	rdfTester [OPTIONS]
	
	Tests and validates RDF (Resource Description Framework) and OWL (Web Ontology Language)
	files for the Unity Object Generator project. Provides ontology validation, class
	analysis, and property relationship testing for educational data standards.
	
	ONTOLOGY PROCESSING:
	Reads RDF/OWL files and analyzes class hierarchies, property relationships,
	and ontological constraints. Validates against educational data standards
	and generates reports on ontology structure and compliance.
	
	CLASS AND PROPERTY ANALYSIS:
	Extracts class definitions, object properties, and data properties from
	ontology files. Stores analysis results in JSON format for further processing
	and integration with other Unity Object Generator tools.

CONTROLS

	--inputFile:        REQUIRED: Path to RDF/OWL file to test and validate
	                    Supports .rdf, .owl, .ttl (Turtle), and .xml formats
	                    
	--outputFile:       OUTPUT: Path for validation results and analysis report
	                    Defaults to input filename with _analysis suffix
	                    
	--format:           FORMAT: Input file format specification (rdf, owl, turtle)
	                    Auto-detected from file extension if not specified
	                    
	--namespace:        FILTER: Specific namespace URI to focus analysis on
	                    Useful for large ontologies with multiple namespaces
	                    
	--configPath:       OVERRIDE: Custom configuration file path
	                    Overrides default RDF testing configuration

SWITCHES

	-validateOnly:      SAFE: Validate ontology syntax and structure without processing
	                    Checks for RDF/OWL compliance and reports syntax errors
	                    
	-extractClasses:    ANALYSIS: Extract all class definitions from ontology
	                    Generates classObjects.json with class hierarchy information
	                    
	-extractProperties: ANALYSIS: Extract property definitions (object and data properties)
	                    Generates propertyObjects.json with property relationships
	                    
	-generateReport:    REPORTING: Create comprehensive ontology analysis report
	                    Includes class counts, property relationships, and validation results
	                    
	-verbose:           DEBUGGING: Show detailed processing information including
	                    parsing steps, validation checks, and extraction progress

<!frameworkHelpInfo!>

SUPPORTED FORMATS

	RDF/XML (.rdf):     Standard RDF serialization format
	                    Most common format for educational ontologies
	                    
	OWL (.owl):         Web Ontology Language format
	                    Supports OWL DL and OWL Full profiles
	                    
	Turtle (.ttl):      Compact RDF serialization format
	                    Human-readable alternative to RDF/XML

OUTPUT FILES

	classObjects.json:      Class hierarchy and definitions
	owlClassObjects.json:   OWL-specific class information  
	propertyObjects.json:   Property definitions and relationships

COMMON OPERATIONS

	Validation:
	rdfTester --inputFile=ontology.owl -validateOnly              # Syntax validation
	rdfTester --inputFile=schema.rdf -generateReport -verbose     # Full analysis
	
	Extraction:
	rdfTester --inputFile=ontology.owl -extractClasses           # Class extraction
	rdfTester --inputFile=ontology.owl -extractProperties        # Property extraction
	
	Focused Analysis:
	rdfTester --inputFile=large.owl --namespace="http://example.org/edu#"
	rdfTester --inputFile=schema.rdf --format=rdf --outputFile=results.json

EXAMPLES

	rdfTester --inputFile=unity_ontology.owl -validateOnly                      # Quick validation
	rdfTester --inputFile=ceds_schema.rdf -extractClasses -extractProperties   # Full extraction
	rdfTester --inputFile=ontology.ttl --format=turtle -generateReport -verbose # Detailed analysis
	rdfTester --inputFile=large_onto.owl --namespace="http://ceds.ed.gov#" -extractClasses

============================================================
${errorMessage}
`;
};

	return ({mainHelp});
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction();