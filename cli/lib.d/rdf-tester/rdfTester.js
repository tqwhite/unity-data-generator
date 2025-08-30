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
const Database = require('better-sqlite3');
const { categorizeClass, generateCategorizationReport } = require('./lib/categorization-engine');

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
		const { CEDS_OntologyFilePath, databaseFilePath } = getConfig(moduleName); //moduleName is closure

		// Set up process file directory for error logging
		xLog.setProcessFilesDirectory(`/tmp/${moduleName}`);

		require('./assets/help-and-exit')({
			applicationName: moduleName,
			version: '1.0',
			configPath: rawConfig._meta.configurationSourceFilePath,
			databaseFilePath: databaseFilePath,
			errorMessage: '',
		}); //shows help and then process.exit()

		// =================================================================================
		// DATABASE INITIALIZATION FUNCTIONS
		
		const initializeCategorizationTables = () => {
			xLog.status('Initializing CEDS categorization tables...');
			
			if (!databaseFilePath) {
				xLog.error('Database file path not configured');
				return;
			}
			
			try {
				const db = new Database(databaseFilePath);
				
				// Enable foreign key constraints
				db.pragma('foreign_keys = ON');
				
				// Create CEDS_Domains table
				xLog.status('Creating CEDS_Domains table...');
				db.exec(`
					CREATE TABLE IF NOT EXISTS CEDS_Domains (
						refId TEXT PRIMARY KEY,
						domainName TEXT NOT NULL,
						domainDescription TEXT,
						displayOrder INTEGER,
						createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
						updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
					)
				`);
				
				// Create CEDS_FunctionalAreas table
				xLog.status('Creating CEDS_FunctionalAreas table...');
				db.exec(`
					CREATE TABLE IF NOT EXISTS CEDS_FunctionalAreas (
						refId TEXT PRIMARY KEY,
						domainRefId TEXT NOT NULL,
						areaName TEXT NOT NULL,
						areaDescription TEXT,
						displayOrder INTEGER,
						createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
						updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
						FOREIGN KEY (domainRefId) REFERENCES CEDS_Domains(refId)
					)
				`);
				
				// Create CEDS_ClassCategories table
				xLog.status('Creating CEDS_ClassCategories table...');
				db.exec(`
					CREATE TABLE IF NOT EXISTS CEDS_ClassCategories (
						refId TEXT PRIMARY KEY,
						classRefId TEXT NOT NULL,
						domainRefId TEXT NOT NULL,
						functionalAreaRefId TEXT,
						confidence REAL,
						isPrimary INTEGER DEFAULT 0,
						createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
						updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
						FOREIGN KEY (classRefId) REFERENCES CEDS_Classes(refId),
						FOREIGN KEY (domainRefId) REFERENCES CEDS_Domains(refId),
						FOREIGN KEY (functionalAreaRefId) REFERENCES CEDS_FunctionalAreas(refId)
					)
				`);
				
				xLog.emphatic('Successfully created categorization tables');
				
				// Now populate the domains
				populateDomains(db);
				
				db.close();
				xLog.status('Database initialization complete');
				
			} catch (error) {
				xLog.error(`Failed to initialize categorization tables: ${error.message}`);
				throw error;
			}
		};
		
		const populateDomains = (db) => {
			xLog.status('Populating CEDS_Domains table...');
			
			const domains = [
				{ name: 'People & Demographics', description: 'Information about individuals, demographics, and personal characteristics', order: 1 },
				{ name: 'Organizations & Institutions', description: 'Educational organizations, institutions, and their structures', order: 2 },
				{ name: 'Academic Programs & Courses', description: 'Curriculum, courses, programs of study, and academic offerings', order: 3 },
				{ name: 'Assessment & Evaluation', description: 'Testing, assessments, evaluations, and performance measurement', order: 4 },
				{ name: 'Student Services & Support', description: 'Support services, interventions, and student welfare programs', order: 5 },
				{ name: 'Facilities & Infrastructure', description: 'Buildings, facilities, technology infrastructure, and physical resources', order: 6 },
				{ name: 'Finance & Administration', description: 'Financial management, funding, administrative processes, and governance', order: 7 },
				{ name: 'Credentials & Recognition', description: 'Degrees, certificates, licenses, and other forms of recognition', order: 8 },
				{ name: 'Uncategorized', description: 'Classes that have not been categorized into a specific domain', order: 9 }
			];
			
			const insertStmt = db.prepare(`
				INSERT OR REPLACE INTO CEDS_Domains (refId, domainName, domainDescription, displayOrder)
				VALUES (?, ?, ?, ?)
			`);
			
			domains.forEach(domain => {
				const refId = `DOM_${domain.name.replace(/[&\s]/g, '_')}`;
				insertStmt.run(refId, domain.name, domain.description, domain.order);
				xLog.verbose(`Inserted domain: ${domain.name}`);
			});
			
			xLog.emphatic(`Successfully populated ${domains.length} domains`);
		};
		
		// Check if we should initialize tables
		if (commandLineParameters.switches.initializeCategorizationTables) {
			initializeCategorizationTables();
			return; // Exit after initialization
		}
		
		// =================================================================================
		// BUILD ENTITY LOOKUP TABLE FUNCTIONS
		
		const buildEntityLookupTable = () => {
			xLog.status('Building CEDS_RDF_UI_SUPPORT_INDEX table...');
			
			if (!databaseFilePath) {
				xLog.error('Database file path not configured');
				return;
			}
			
			try {
				const db = new Database(databaseFilePath);
				db.pragma('foreign_keys = ON');
				
				// Drop and recreate the table
				xLog.status('Dropping existing CEDS_RDF_UI_SUPPORT_INDEX table if exists...');
				db.exec('DROP TABLE IF EXISTS CEDS_RDF_UI_SUPPORT_INDEX');
				
				// Create the new table
				xLog.status('Creating CEDS_RDF_UI_SUPPORT_INDEX table...');
				db.exec(`
					CREATE TABLE IF NOT EXISTS CEDS_RDF_UI_SUPPORT_INDEX (
						refId TEXT PRIMARY KEY,
						entityType TEXT NOT NULL,
						code TEXT,
						uri TEXT,
						label TEXT,
						prefLabel TEXT,
						notation TEXT,
						domainRefId TEXT,
						functionalAreaRefId TEXT,
						parentRefId TEXT,
						isOptionSet INTEGER DEFAULT 0,
						displayOrder INTEGER,
						crossDomainList TEXT,
						createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
						updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
					)
				`);
				
				// Create indexes
				xLog.status('Creating indexes...');
				db.exec(`
					CREATE INDEX IF NOT EXISTS idx_entity_type ON CEDS_RDF_UI_SUPPORT_INDEX(entityType);
					CREATE INDEX IF NOT EXISTS idx_domain ON CEDS_RDF_UI_SUPPORT_INDEX(domainRefId);
					CREATE INDEX IF NOT EXISTS idx_functional_area ON CEDS_RDF_UI_SUPPORT_INDEX(functionalAreaRefId);
					CREATE INDEX IF NOT EXISTS idx_parent ON CEDS_RDF_UI_SUPPORT_INDEX(parentRefId);
					CREATE INDEX IF NOT EXISTS idx_code ON CEDS_RDF_UI_SUPPORT_INDEX(code);
				`);
				
				xLog.emphatic('Successfully created CEDS_RDF_UI_SUPPORT_INDEX table and indexes');
				
				// Function to intelligently extract functional area from class names
				const extractFunctionalArea = (className, prefixCounts = null) => {
					if (!className) return 'Uncategorized';
					
					// If we have prefix counts, use intelligent grouping
					if (prefixCounts) {
						const words = className.split(/\s+/);
						
						// Check three-word prefix first (longest match)
						if (words.length >= 3) {
							const threeWord = `${words[0]} ${words[1]} ${words[2]}`;
							if (prefixCounts[threeWord] && prefixCounts[threeWord] >= 5) {
								return threeWord;
							}
						}
						
						// Check two-word prefix
						if (words.length >= 2) {
							const twoWord = `${words[0]} ${words[1]}`;
							if (prefixCounts[twoWord] && prefixCounts[twoWord] >= 5) {
								return twoWord;
							}
						}
						
						// Default to single word
						if (words[0]) {
							return words[0];
						}
					}
					
					// Default extraction - just first word
					const match = className.match(/^[^\s]+/);
					return match ? match[0] : 'Other';
				};
				
				// Step A: Insert all domains
				xLog.status('Step A: Inserting domains...');
				const domains = db.prepare('SELECT * FROM CEDS_Domains').all();
				const insertDomain = db.prepare(`
					INSERT INTO CEDS_RDF_UI_SUPPORT_INDEX (
						refId, entityType, code, label, displayOrder
					) VALUES (?, 'domain', ?, ?, ?)
				`);
				
				domains.forEach(domain => {
					insertDomain.run(
						domain.refId,
						domain.refId,
						domain.domainName,
						domain.displayOrder
					);
				});
				xLog.verbose(`Inserted ${domains.length} domains`);
				
				// Step B: Create middle tier entries (functional areas)
				xLog.status('Step B: Creating functional area entries...');
				const classes = db.prepare('SELECT refId, name, label FROM CEDS_Classes').all();
				const functionalAreaMap = new Map();
				
				// First pass: Count all prefixes
				const prefixCounts = {};
				classes.forEach(cls => {
					const nameToUse = cls.label || cls.name;
					if (!nameToUse) return;
					
					const words = nameToUse.split(/\s+/);
					
					// Count one-word prefix
					if (words[0]) {
						const oneWord = words[0];
						prefixCounts[oneWord] = (prefixCounts[oneWord] || 0) + 1;
					}
					
					// Count two-word prefix
					if (words[0] && words[1]) {
						const twoWord = `${words[0]} ${words[1]}`;
						prefixCounts[twoWord] = (prefixCounts[twoWord] || 0) + 1;
					}
					
					// Count three-word prefix
					if (words[0] && words[1] && words[2]) {
						const threeWord = `${words[0]} ${words[1]} ${words[2]}`;
						prefixCounts[threeWord] = (prefixCounts[threeWord] || 0) + 1;
					}
				});
				
				// Second pass: Determine functional areas using the counts
				classes.forEach(cls => {
					const nameToUse = cls.label || cls.name;
					const functionalArea = extractFunctionalArea(nameToUse, prefixCounts);
					if (!functionalAreaMap.has(functionalArea)) {
						functionalAreaMap.set(functionalArea, {
							refId: `FA_${functionalArea.replace(/\s+/g, '_')}`,
							label: functionalArea,
							count: 0
						});
					}
					functionalAreaMap.get(functionalArea).count++;
				});
				
				const insertFunctionalArea = db.prepare(`
					INSERT INTO CEDS_RDF_UI_SUPPORT_INDEX (
						refId, entityType, code, label, displayOrder
					) VALUES (?, 'functionalArea', ?, ?, ?)
				`);
				
				let faOrder = 0;
				functionalAreaMap.forEach((fa, key) => {
					insertFunctionalArea.run(
						fa.refId,
						key,
						fa.label,
						faOrder++
					);
				});
				xLog.verbose(`Created ${functionalAreaMap.size} functional areas`);
				
				// Step C: Insert all classes with proper hierarchy
				xLog.status('Step C: Inserting classes...');
				const insertClass = db.prepare(`
					INSERT INTO CEDS_RDF_UI_SUPPORT_INDEX (
						refId, entityType, code, uri, label, prefLabel, notation,
						domainRefId, functionalAreaRefId, isOptionSet, crossDomainList
					) VALUES (?, 'class', ?, ?, ?, ?, ?, ?, ?, ?, ?)
				`);
				
				// Get class-to-domain mappings
				const classDomainMappings = db.prepare(`
					SELECT classRefId, domainRefId, isPrimary 
					FROM CEDS_ClassCategories 
					ORDER BY classRefId, isPrimary DESC
				`).all();
				
				// Build a map of class to domains
				const classToDomains = new Map();
				classDomainMappings.forEach(mapping => {
					if (!classToDomains.has(mapping.classRefId)) {
						classToDomains.set(mapping.classRefId, {
							primary: null,
							all: []
						});
					}
					const domains = classToDomains.get(mapping.classRefId);
					domains.all.push(mapping.domainRefId);
					if (mapping.isPrimary === 1 && !domains.primary) {
						domains.primary = mapping.domainRefId;
					}
				});
				
				// Process each class
				const fullClasses = db.prepare(`
					SELECT refId, uri, name, label, prefLabel, notation, jsonString 
					FROM CEDS_Classes
				`).all();
				
				// Use the prefixCounts from Step B for consistency
				// Insert with intelligent functional area extraction
				fullClasses.forEach(cls => {
					// Prefer label over name (most classes have code names like C200001)
					const nameToUse = cls.label || cls.name;
					const functionalArea = extractFunctionalArea(nameToUse, prefixCounts);
					const functionalAreaRefId = `FA_${functionalArea.replace(/\s+/g, '_')}`;
					
					// Check if it's an option set (ConceptScheme)
					const isOptionSet = cls.jsonString && cls.jsonString.includes('ConceptScheme') ? 1 : 0;
					
					// Get domain info
					const domainInfo = classToDomains.get(cls.refId) || { primary: null, all: [] };
					const primaryDomain = domainInfo.primary || domainInfo.all[0] || null;
					const crossDomainList = domainInfo.all.length > 1 ? domainInfo.all.join(',') : null;
					
					insertClass.run(
						cls.refId,
						cls.name,
						cls.uri,
						cls.label || cls.name,
						cls.prefLabel,
						cls.notation,
						primaryDomain,
						functionalAreaRefId,
						isOptionSet,
						crossDomainList
					);
				});
				xLog.verbose(`Inserted ${fullClasses.length} classes`);
				
				// Step D: Insert all properties for complete entity resolution
				xLog.status('Step D: Inserting properties...');
				const properties = db.prepare(`
					SELECT refId, uri, name, label, comment 
					FROM CEDS_Properties
				`).all();
				
				const insertProperty = db.prepare(`
					INSERT INTO CEDS_RDF_UI_SUPPORT_INDEX (
						refId, entityType, code, uri, label
					) VALUES (?, 'property', ?, ?, ?)
				`);
				
				properties.forEach(prop => {
					insertProperty.run(
						prop.refId,
						prop.name,
						prop.uri,
						prop.label || prop.name || prop.comment
					);
				});
				xLog.verbose(`Inserted ${properties.length} properties`);
				
				// Summary report
				const summary = db.prepare(`
					SELECT entityType, COUNT(*) as count 
					FROM CEDS_RDF_UI_SUPPORT_INDEX 
					GROUP BY entityType
				`).all();
				
				xLog.status('\n========== ENTITY LOOKUP TABLE SUMMARY ==========');
				summary.forEach(row => {
					xLog.result(`${row.entityType}: ${row.count} entries`);
				});
				
				const totalCount = db.prepare('SELECT COUNT(*) as total FROM CEDS_RDF_UI_SUPPORT_INDEX').get();
				xLog.emphatic(`Total entries in CEDS_RDF_UI_SUPPORT_INDEX: ${totalCount.total}`);
				
				db.close();
				xLog.status('Entity lookup table build complete');
				
			} catch (error) {
				xLog.error(`Failed to build entity lookup table: ${error.message}`);
				throw error;
			}
		};
		
		// Check if we should build entity lookup
		if (commandLineParameters.switches.buildEntityLookup) {
			buildEntityLookupTable();
			return; // Exit after building
		}
		
		// =================================================================================
		// CATEGORIZATION FUNCTIONS
		
		const categorizeAndStoreClasses = async (limit = null) => {
			xLog.status('Starting CEDS class categorization...');
			
			if (!databaseFilePath) {
				xLog.error('Database file path not configured');
				return;
			}
			
			try {
				const db = new Database(databaseFilePath);
				db.pragma('foreign_keys = ON');
				
				// Fetch classes from database
				let query = 'SELECT refId, uri, name, label, comment, description FROM CEDS_Classes';
				if (limit) {
					query += ` LIMIT ${limit}`;
				}
				
				const classes = db.prepare(query).all();
				xLog.status(`Processing ${classes.length} classes for categorization...`);
				
				// Clear existing categorizations if doing full run
				if (!limit) {
					db.prepare('DELETE FROM CEDS_ClassCategories').run();
					xLog.status('Cleared existing categorizations');
				}
				
				// Prepare insert statement
				const insertStmt = db.prepare(`
					INSERT INTO CEDS_ClassCategories (
						refId, classRefId, domainRefId, functionalAreaRefId, 
						confidence, isPrimary
					) VALUES (?, ?, ?, ?, ?, ?)
				`);
				
				// Categorize each class
				const categorizationResults = [];
				let processedCount = 0;
				
				for (const classObj of classes) {
					const categorizations = categorizeClass(classObj);
					categorizationResults.push({ classObj, categorizations });
					
					// Store categorizations in database
					categorizations.forEach((cat, index) => {
						const refId = `CAT_${classObj.refId}_${cat.domainRefId}`;
						insertStmt.run(
							refId,
							classObj.refId,
							cat.domainRefId,
							null, // functionalAreaRefId - not implemented yet
							cat.confidence,
							cat.isPrimary ? 1 : 0
						);
					});
					
					processedCount++;
					if (processedCount % 100 === 0) {
						xLog.progress(`Processed ${processedCount}/${classes.length} classes...`);
					}
				}
				
				xLog.emphatic(`Successfully categorized ${classes.length} classes`);
				
				// Generate and display report
				const report = generateCategorizationReport(categorizationResults);
				
				xLog.status('\n========== CATEGORIZATION REPORT ==========');
				xLog.result(`Total Classes Processed: ${report.totalClasses}`);
				xLog.result(`Average Domains per Class: ${report.averageDomainsPerClass}`);
				xLog.result(`Multi-domain Classes: ${report.multiDomainClasses.length} (${report.multiDomainPercentage}%)`);
				xLog.result(`Uncategorized Classes: ${report.uncategorizedClasses.length} (${report.uncategorizedPercentage}%)`);
				
				xLog.status('\nDomain Distribution:');
				Object.entries(report.domainCounts)
					.sort((a, b) => b[1].count - a[1].count)
					.forEach(([domainName, stats]) => {
						xLog.result(`  ${domainName}: ${stats.count} classes (Primary: ${stats.asPrimary}, Secondary: ${stats.asSecondary})`);
					});
				
				// Save detailed report to file
				const reportPath = `/tmp/${moduleName}/categorization_report_${new Date().toISOString().replace(/:/g, '-')}.json`;
				fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
				xLog.status(`\nDetailed report saved to: ${reportPath}`);
				
				// Show sample multi-domain classes
				if (report.multiDomainClasses.length > 0) {
					xLog.status('\nSample Multi-domain Classes:');
					report.multiDomainClasses.slice(0, 5).forEach(cls => {
						xLog.verbose(`  ${cls.label}: ${cls.domains.join(', ')}`);
					});
				}
				
				// Show sample uncategorized classes if any
				if (report.uncategorizedClasses.length > 0) {
					xLog.status('\nSample Uncategorized Classes:');
					report.uncategorizedClasses.slice(0, 5).forEach(cls => {
						xLog.verbose(`  ${cls.label || cls.name}`);
					});
				}
				
				db.close();
				return report;
				
			} catch (error) {
				xLog.error(`Failed to categorize classes: ${error.message}`);
				throw error;
			}
		};
		
		// Check if we should categorize
		if (commandLineParameters.switches.categorize) {
			const limit = commandLineParameters.values.limit ? commandLineParameters.values.limit[0] : null;
			await categorizeAndStoreClasses(limit);
			return;
		}
		
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
	process.global.xLog = require('qtools-x-log');
	process.global.getConfig=sectionName=>config[sectionName];
	process.global.commandLineParameters=typeof(commandLineParameters)!='undefined'?commandLineParameters:undefined;;
	process.global.rawConfig=config; //this should only be used for debugging, use getConfig(moduleName)
	}
console.log(
	`running as standalone, WARNING: overwrites xLog() if this branch runs in a sustem`,
);
module.exports = moduleFunction({ moduleName })({}); //runs it right now