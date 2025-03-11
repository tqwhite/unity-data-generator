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
                
                // Collect all class elements (both rdfs:Class and owl:Class)
                const allClassElements = [];
                
                // Process rdfs:Class elements
                if (rdf['rdfs:Class'] && Array.isArray(rdf['rdfs:Class'])) {
                    console.log(`Found ${rdf['rdfs:Class'].length} rdfs:Class elements`);
                    allClassElements.push(...rdf['rdfs:Class'].map(c => ({type: 'rdfs:Class', element: c})));
                } else {
                    console.log('No rdfs:Class elements found');
                }
                
                // Process owl:Class elements
                if (rdf['owl:Class'] && Array.isArray(rdf['owl:Class'])) {
                    console.log(`Found ${rdf['owl:Class'].length} owl:Class elements`);
                    allClassElements.push(...rdf['owl:Class'].map(c => ({type: 'owl:Class', element: c})));
                } else {
                    console.log('No owl:Class elements found');
                }
                
                console.log(`Processing ${allClassElements.length} total class elements`);
                
                // Process all class elements
                for (const {type, element: classElem} of allClassElements) {
                    const uri = extractAttribute(classElem, 'rdf:about');
                    if (!uri) continue;
                    
                    const name = uri.split('#').pop() || uri.split('/').pop();
                    const label = extractTextValue(classElem, 'rdfs:label');
                    const comment = extractTextValue(classElem, 'rdfs:comment');
                    
                    // Extract additional descriptive properties
                    const prefLabel = extractTextValue(classElem, 'skos:prefLabel');
                    const notation = extractTextValue(classElem, 'skos:notation');
                    const definition = extractTextValue(classElem, 'skos:definition');
                    const description = extractTextValue(classElem, 'dc:description') || 
                                       extractTextValue(classElem, 'schema:description');
                    
                    // Extract subclass relationships (owl:subClassOf)
                    const superClasses = [];
                    if (classElem['owl:subClassOf'] && Array.isArray(classElem['owl:subClassOf'])) {
                        for (const superClass of classElem['owl:subClassOf']) {
                            const superClassUri = extractAttribute(superClass, 'rdf:resource');
                            if (superClassUri) {
                                superClasses.push(superClassUri);
                            }
                        }
                    }
                    
                    // Extract equivalent classes (owl:equivalentClass)
                    const equivalentClasses = [];
                    if (classElem['owl:equivalentClass'] && Array.isArray(classElem['owl:equivalentClass'])) {
                        for (const equivClass of classElem['owl:equivalentClass']) {
                            const equivClassUri = extractAttribute(equivClass, 'rdf:resource');
                            if (equivClassUri) {
                                equivalentClasses.push(equivClassUri);
                            }
                        }
                    }
                    
                    classes.push({
                        uri,
                        name,
                        label,
                        comment,
                        prefLabel,
                        notation,
                        definition,
                        description,
                        classType: type,
                        superClasses,
                        equivalentClasses,
                        properties: []
                    });
                }
						
				// Process all property elements (both rdf:Property and rdfs:Property)
                const allPropertyElements = [];
                
                // Collect rdf:Property elements
                if (rdf['rdf:Property'] && Array.isArray(rdf['rdf:Property'])) {
                    console.log(`Found ${rdf['rdf:Property'].length} rdf:Property elements`);
                    allPropertyElements.push(...rdf['rdf:Property'].map(p => ({type: 'rdf:Property', element: p})));
                } else {
                    console.log('No rdf:Property elements found');
                }
                
                // Collect rdfs:Property elements
                if (rdf['rdfs:Property'] && Array.isArray(rdf['rdfs:Property'])) {
                    console.log(`Found ${rdf['rdfs:Property'].length} rdfs:Property elements`);
                    allPropertyElements.push(...rdf['rdfs:Property'].map(p => ({type: 'rdfs:Property', element: p})));
                } else {
                    console.log('No rdfs:Property elements found');
                }
                
                console.log(`Processing ${allPropertyElements.length} total property elements`);
                
                // Process all property elements
                for (const {type, element: propElem} of allPropertyElements) {
                    const uri = extractAttribute(propElem, 'rdf:about');
                    if (!uri) continue;
                    
                    const name = uri.split('#').pop() || uri.split('/').pop();
                    const label = extractTextValue(propElem, 'rdfs:label');
                    const comment = extractTextValue(propElem, 'rdfs:comment');
                    const creator = extractTextValue(propElem, 'dc:creator');
                    
                    // Extract additional descriptive properties
                    const prefLabel = extractTextValue(propElem, 'skos:prefLabel');
                    const notation = extractTextValue(propElem, 'skos:notation');
                    const definition = extractTextValue(propElem, 'skos:definition');
                    const description = extractTextValue(propElem, 'dc:description') || 
                                       extractTextValue(propElem, 'schema:description');
                    
                    // Extract domains - check multiple possible domain properties
                    const domains = [];
                    
                    // Check rdfs:domainIncludes
                    if (propElem['rdfs:domainIncludes'] && Array.isArray(propElem['rdfs:domainIncludes'])) {
                        for (const domain of propElem['rdfs:domainIncludes']) {
                            const domainUri = extractAttribute(domain, 'rdf:resource');
                            if (domainUri) domains.push({
                                uri: domainUri,
                                type: 'rdfs:domainIncludes'
                            });
                        }
                    }
                    
                    // Check schema:domainIncludes (used in Schema.org)
                    if (propElem['schema:domainIncludes'] && Array.isArray(propElem['schema:domainIncludes'])) {
                        for (const domain of propElem['schema:domainIncludes']) {
                            const domainUri = extractAttribute(domain, 'rdf:resource');
                            if (domainUri) domains.push({
                                uri: domainUri,
                                type: 'schema:domainIncludes'
                            });
                        }
                    }
                    
                    // Check rdfs:domain (more common in standard RDF)
                    if (propElem['rdfs:domain'] && Array.isArray(propElem['rdfs:domain'])) {
                        for (const domain of propElem['rdfs:domain']) {
                            const domainUri = extractAttribute(domain, 'rdf:resource');
                            if (domainUri) domains.push({
                                uri: domainUri,
                                type: 'rdfs:domain'
                            });
                        }
                    }
                    
                    // Extract ranges - check multiple possible range properties
                    const ranges = [];
                    
                    // Check rdfs:rangeIncludes
                    if (propElem['rdfs:rangeIncludes'] && Array.isArray(propElem['rdfs:rangeIncludes'])) {
                        for (const range of propElem['rdfs:rangeIncludes']) {
                            const rangeUri = extractAttribute(range, 'rdf:resource');
                            if (rangeUri) ranges.push({
                                uri: rangeUri,
                                type: 'rdfs:rangeIncludes'
                            });
                        }
                    }
                    
                    // Check schema:rangeIncludes (used in Schema.org)
                    if (propElem['schema:rangeIncludes'] && Array.isArray(propElem['schema:rangeIncludes'])) {
                        for (const range of propElem['schema:rangeIncludes']) {
                            const rangeUri = extractAttribute(range, 'rdf:resource');
                            if (rangeUri) ranges.push({
                                uri: rangeUri,
                                type: 'schema:rangeIncludes'
                            });
                        }
                    }
                    
                    // Check rdfs:range (more common in standard RDF)
                    if (propElem['rdfs:range'] && Array.isArray(propElem['rdfs:range'])) {
                        for (const range of propElem['rdfs:range']) {
                            const rangeUri = extractAttribute(range, 'rdf:resource');
                            if (rangeUri) ranges.push({
                                uri: rangeUri,
                                type: 'rdfs:range'
                            });
                        }
                    }
                    
                    // Extract domain and range IRIs as separate arrays for easier access
                    const domainIncludes = domains.map(d => d.uri);
                    const rangeIncludes = ranges.map(r => r.uri);
                    
                    // Create property object with enhanced metadata
                    properties.push({
                        uri,
                        name,
                        propertyType: type,
                        label,
                        comment,
                        creator,
                        prefLabel,
                        notation,
                        definition,
                        description,
                        // Add domain/range IRIs directly to the property
                        domainIncludes,
                        rangeIncludes,
                        // Keep the detailed domain/range information
                        domains,
                        ranges
                    });
                }
                
                console.log(`Processed ${properties.length} properties with domain/range information`);
						
				// Link properties to classes
				for (const prop of properties) {
					for (const domain of prop.domains) {
						const classObj = classes.find(c => c.uri === domain.uri);
						if (classObj) {
							classObj.properties.push({
								uri: prop.uri,
								name: prop.name,
								label: prop.label,
								comment: prop.comment,
								creator: prop.creator,
								prefLabel: prop.prefLabel,
								notation: prop.notation,
								definition: prop.definition,
								description: prop.description,
								propertyType: prop.propertyType,
								domainType: domain.type,
								domainIncludes: prop.domainIncludes,
								rangeIncludes: prop.rangeIncludes,
								ranges: prop.ranges
							});
						}
					}
				}
						
				// Show results
				console.log(`\nProcessed ${classes.length} classes with ${properties.length} properties`);
				
				// Count classes by type
				const rdfsClassCount = classes.filter(c => c.classType === 'rdfs:Class').length;
				const owlClassCount = classes.filter(c => c.classType === 'owl:Class').length;
				console.log(`Class types: ${rdfsClassCount} rdfs:Class, ${owlClassCount} owl:Class`);
				
				// Count classes with superclass relationships
				const classesWithSuperClasses = classes.filter(c => c.superClasses && c.superClasses.length > 0);
				console.log(`Found ${classesWithSuperClasses.length} classes with superclass relationships`);
				
				// Display a few classes with superclass relationships if any
				if (classesWithSuperClasses.length > 0) {
					console.log("\nSample classes with superclass relationships:");
					const sampleHierarchy = Math.min(3, classesWithSuperClasses.length);
					for (let i = 0; i < sampleHierarchy; i++) {
						const cls = classesWithSuperClasses[i];
						console.log(`\n[${i + 1}] Class: ${cls.name} (${cls.classType})`);
						console.log(`URI: ${cls.uri}`);
						console.log(`Label: ${cls.label || 'None'}`);
						console.log(`SuperClasses (${cls.superClasses.length}):`);
						for (const superClass of cls.superClasses) {
							// Find the superclass object if possible
							const superClassObj = classes.find(c => c.uri === superClass);
							console.log(`  - ${superClass.split('#').pop() || superClass.split('/').pop()} ${superClassObj ? '(' + (superClassObj.label || 'No label') + ')' : ''}`);
						}
					}
				}
				
				// Display first few classes
				console.log("\nSample classes:");
				const sampleSize = Math.min(5, classes.length);
				for (let i = 0; i < sampleSize; i++) {
					const cls = classes[i];
					if (cls) {
						console.log(`\n[${i + 1}] Class: ${cls.name} (${cls.classType})`);
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
				
				// Filter classes by type
				const rdfsClasses = classes.filter(c => c.classType === 'rdfs:Class');
				const owlClasses = classes.filter(c => c.classType === 'owl:Class');
				
				// Save rdfs:Class objects to the main class file
				fs.writeFileSync(
					path.join(process.cwd(), 'classObjects.json'), 
					JSON.stringify(rdfsClasses, null, 2)
				);
				xLog.status(`Saved ${rdfsClasses.length} rdfs:Class objects to classObjects.json`);
				
				// Save owl:Class objects to a separate file
				fs.writeFileSync(
					path.join(process.cwd(), 'owlClassObjects.json'), 
					JSON.stringify(owlClasses, null, 2)
				);
				xLog.status(`Saved ${owlClasses.length} owl:Class objects to owlClassObjects.json`);
				
				// Also save a separate file with just properties
				fs.writeFileSync(
					path.join(process.cwd(), 'propertyObjects.json'), 
					JSON.stringify(properties, null, 2)
				);
				xLog.status(`Saved ${properties.length} property objects to propertyObjects.json`);
					
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