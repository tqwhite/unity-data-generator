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

	RDF Tester - RDF/OWL ontology parser for Unity Object Generator

DESCRIPTION

	rdfTester [OPTIONS]
	
	Parses RDF (Resource Description Framework) and OWL (Web Ontology Language)
	files for the Unity Object Generator project. Extracts class hierarchies,
	property relationships, and ontological structures from RDF/XML files.
	
	CURRENT FUNCTIONALITY:
	Reads a configured RDF/OWL file path from the INI configuration and extracts
	class definitions (both rdfs:Class and owl:Class) and property definitions
	(rdf:Property and rdfs:Property). Outputs three JSON files with the extracted
	data for further processing.
	
	NOTE: Input file path is configured in rdfTester.ini, not via command line.

CONFIGURATION

	The RDF file to process is specified in the configuration file:
	system/configs/instanceSpecific/{instance}/rdfTester.ini
	
	Key configuration:
	CEDS_OntologyFilePath = path to your RDF/OWL file

SWITCHES

	-help, --help:      Display this help message and exit
	                    
	-verbose:           Show detailed processing information including
	                    parsing steps and extraction progress
	                    
	-debug:             Show all debugging messages for troubleshooting
	                    
	-quiet:             Only show error messages
	                    
	-silent:            Suppress all output messages

<!frameworkHelpInfo!>

SUPPORTED FORMAT

	RDF/XML:            Currently only supports RDF/XML format
	                    Input file must be valid XML with RDF namespace

OUTPUT FILES

	classObjects.json:      Contains rdfs:Class elements with their properties
	owlClassObjects.json:   Contains owl:Class elements  
	propertyObjects.json:   Contains all property definitions and relationships
	
	All files are written to the current working directory.

EXTRACTED DATA

	Classes:
	- URI, name, label, comment
	- Additional metadata (prefLabel, notation, definition, description)
	- Superclass relationships (owl:subClassOf)
	- Equivalent classes (owl:equivalentClass)
	- Associated properties
	
	Properties:
	- URI, name, label, comment, creator
	- Domain and range specifications
	- Support for multiple domain/range formats (rdfs, schema.org)

USAGE

	rdfTester                    # Process configured RDF file
	rdfTester -verbose          # Process with detailed output
	rdfTester -help             # Show this help message

PROCESSING STATISTICS

	The tool displays:
	- Total classes and properties processed
	- Breakdown by type (rdfs:Class vs owl:Class)
	- Classes with superclass relationships
	- Sample data from extracted elements

============================================================
${errorMessage}
`;
};

	return ({mainHelp});
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction();