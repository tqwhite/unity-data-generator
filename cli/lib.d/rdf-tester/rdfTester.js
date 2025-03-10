#!/usr/bin/env node
'use strict';

// Suppress punycode deprecation warning
process.noDeprecation = true;

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

const os = require('os');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);

const commandLineParser = require('qtools-parse-command-line');
const configFileProcessor = require('qtools-config-file-processor');
const xml2js = require('xml2js');

// --------------------------------------------------------------------------------
// FIND PROJECT ROOT
const findProjectRoot = ({ rootFolderName = 'system', closest = true } = {}) =>
	__dirname.replace(
		new RegExp(`^(.*${closest ? '' : '?'}\/${rootFolderName}).*$`),
		'$1',
	);
const projectRoot = findProjectRoot(); // call with {closest:false} if there are nested rootFolderName directories and you want the top level one
//--------------------------------------------------------------
// FIGURE OUT CONFIG
const configName = os.hostname().match(/^q/) ? 'instanceSpecific/qbook' : ''; //when deployed, usually the config is in the configs/ dir
const configDirPath = `${projectRoot}/configs/${configName}/`;
console.log(`configDirPath=${configDirPath}`);

const config = configFileProcessor.getConfig(
	`${moduleName}.ini`,
	configDirPath,
	{ resolve: true },
);

const commandLineParameters = commandLineParser.getParameters();

//START OF moduleFunction() ============================================================
const moduleFunction =
	({ moduleName } = {}) =>
	async ({ unused }) => {
		const { xLog, getConfig, rawConfig, commandLineParameters } =
			process.global;
		const { CEDS_OntologyFilePath } = getConfig(moduleName); //moduleName is closure

		// Set up process file directory for error logging
		xLog.setProcessFilesDirectory(`/tmp/${moduleName}`);

		require('./assets/help-and-exit')({
			applicationName: moduleName,
			version: '1.0',
			configPath: rawConfig._meta.configurationSourceFilePath,
			databaseFilePath: 'n/a',
			errorMessage: '',
		}); //shows help and then process.exit()

		// =================================================================================
		// ACTUAL APPLICATION
        
        // Helper function to safely extract XML data
        const extractTextValue = (element, tagName) => {
            if (!element || !element[tagName] || !element[tagName][0]) return null;
            return element[tagName][0]['_'] || element[tagName][0];
        };
        
        // Helper to safely extract attributes
        const extractAttribute = (element, attrName) => {
            if (!element || !element['$'] || !element['$'][attrName]) return null;
            return element['$'][attrName];
        };

		async function processRdfFile(filePath) {
			try {
				xLog.status(`Processing RDF file: ${filePath}`);
				
				// Read the RDF file
				const data = await readFileAsync(filePath, 'utf8');
				
				// Parse the XML data
				const parser = new xml2js.Parser();
				const result = await parser.parseStringPromise(data);
				
				// Extract the RDF elements
				const rdf = result['rdf:RDF'];
                
                if (!rdf) {
                    throw new Error('No RDF data found in file');
                }
				
				// Get all rdfs:Class elements
				const classes = [];
				const properties = [];
				
				// Debug: output structure of the RDF data
				console.log('RDF Structure:', Object.keys(rdf));
                
                // Process rdfs:Class elements
                if (rdf['rdfs:Class'] && Array.isArray(rdf['rdfs:Class'])) {
                    console.log(`Found ${rdf['rdfs:Class'].length} rdfs:Class elements`);
                    
                    for (const classElem of rdf['rdfs:Class']) {
                        const uri = extractAttribute(classElem, 'rdf:about');
                        if (!uri) continue;
                        
                        const name = uri.split('#').pop() || uri.split('/').pop();
                        const label = extractTextValue(classElem, 'rdfs:label');
                        const comment = extractTextValue(classElem, 'rdfs:comment');
                        
                        classes.push({
                            uri,
                            name,
                            label,
                            comment,
                            properties: []
                        });
                    }
                } else {
                    console.log('No rdfs:Class elements found');
                }
				
				// Process rdf:Property elements
                if (rdf['rdf:Property'] && Array.isArray(rdf['rdf:Property'])) {
                    console.log(`Found ${rdf['rdf:Property'].length} rdf:Property elements`);
                    
                    for (const propElem of rdf['rdf:Property']) {
                        const uri = extractAttribute(propElem, 'rdf:about');
                        if (!uri) continue;
                        
                        const name = uri.split('#').pop() || uri.split('/').pop();
                        const label = extractTextValue(propElem, 'rdfs:label');
                        
                        // Extract domains
                        const domains = [];
                        if (propElem['rdfs:domainIncludes'] && Array.isArray(propElem['rdfs:domainIncludes'])) {
                            for (const domain of propElem['rdfs:domainIncludes']) {
                                const domainUri = extractAttribute(domain, 'rdf:resource');
                                if (domainUri) domains.push(domainUri);
                            }
                        }
                        
                        // Extract ranges
                        const ranges = [];
                        if (propElem['rdfs:rangeIncludes'] && Array.isArray(propElem['rdfs:rangeIncludes'])) {
                            for (const range of propElem['rdfs:rangeIncludes']) {
                                const rangeUri = extractAttribute(range, 'rdf:resource');
                                if (rangeUri) ranges.push(rangeUri);
                            }
                        }
                        
                        properties.push({
                            uri,
                            name,
                            label,
                            domains,
                            ranges
                        });
                    }
                } else {
                    console.log('No rdf:Property elements found');
                }
				
				// Link properties to classes
				for (const prop of properties) {
					for (const domainUri of prop.domains) {
						const classObj = classes.find(c => c.uri === domainUri);
						if (classObj) {
							classObj.properties.push({
								uri: prop.uri,
								name: prop.name,
								label: prop.label,
								ranges: prop.ranges
							});
						}
					}
				}
				
				// Show results
				console.log(`\nProcessed ${classes.length} classes with ${properties.length} properties`);
				
				// Display first few classes
				const sampleSize = Math.min(5, classes.length);
				for (let i = 0; i < sampleSize; i++) {
					const cls = classes[i];
					if (cls) {
						console.log(`\n[${i + 1}] Class: ${cls.name}`);
						console.log(`URI: ${cls.uri}`);
						console.log(`Label: ${cls.label || 'None'}`);
						console.log(`Properties: ${cls.properties.length}`);
						
						// Show a few properties for each class
						if (cls.properties.length > 0) {
							console.log('  Sample properties:');
							const sampleProps = Math.min(3, cls.properties.length);
							for (let j = 0; j < sampleProps; j++) {
								console.log(`    - ${cls.properties[j].name}`);
							}
						}
					}
				}
				
				// Save results to file
				fs.writeFileSync(
					path.join(process.cwd(), 'classObjects.json'), 
					JSON.stringify(classes, null, 2)
				);
				xLog.status(`Saved ${classes.length} class objects to classObjects.json`);
				
				return classes;
			} catch (err) {
				xLog.error(`Error processing RDF file: ${err.message}`);
				throw err;
			}
		}
		
		try {
			const classObjects = await processRdfFile(CEDS_OntologyFilePath);
			xLog.status(`Successfully processed ${classObjects.length} classes from the RDF file`);
		} catch (error) {
			xLog.error(`Failed to process RDF file: ${error.message}`);
		}
	};

//END OF moduleFunction() ============================================================

// prettier-ignore
{
	process.global = {};
	process.global.xLog = require(path.join(projectRoot, 'code/lib/x-log'));
	process.global.getConfig=sectionName=>config[sectionName];
	process.global.commandLineParameters=typeof(commandLineParameters)!='undefined'?commandLineParameters:undefined;;
	process.global.rawConfig=config; //this should only be used for debugging, use getConfig(moduleName)
	}
console.log(
	`running as standalone, WARNING: overwrites xLog() if this branch runs in a sustem`,
);
module.exports = moduleFunction({ moduleName })({}); //runs it right now