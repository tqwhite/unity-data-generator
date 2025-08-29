#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const qt = require('qtools-functional-library');
const { pipeRunner, taskListPlus, mergeArgs, forwardArgs } = new require(
	'qtools-asynchronous-pipe-plus',
)();

//START OF moduleFunction() ============================================================

const moduleFunction = function ({ dotD, passThroughParameters }) {
	// ================================================================================
	// INITIALIZATION

	const { xLog, getConfig, rawConfig, commandLineParameters } = process.global;
	const localConfig = getConfig(moduleName); //moduleName is closure

	const { sqlDb, mapper, dataMapping } = passThroughParameters;

	// ================================================================================
	// SERVICE FUNCTION

	const serviceFunction = (data = {}, callback) => {
		const taskList = new taskListPlus();
		const { classRefId } = data;

		// Validate required parameters
		if (!classRefId) {
			callback('classRefId is required');
			return;
		}

		// --------------------------------------------------------------------------------
		// TASK: Get class data

		taskList.push((args, next) => {
			const { sqlDb } = args;
			sqlDb.getTable('CEDS_Classes', mergeArgs(args, next, 'classesTable'));
		});

		taskList.push((args, next) => {
			const { classesTable, classRefId } = args;
			
			const query = `SELECT * FROM CEDS_Classes WHERE refId = '${classRefId}'`;
			
			classesTable.getData(
				query,
				{ suppressStatementLog: true, noTableNameOk: true },
				(err, result) => {
					if (err || !result || result.length === 0) {
						next(err || 'Class not found');
						return;
					}
					next('', { ...args, classData: result[0] });
				}
			);
		});

		// --------------------------------------------------------------------------------
		// TASK: Get outgoing properties (where this class is the domain)

		taskList.push((args, next) => {
			args.sqlDb.getTable('CEDS_Properties', (err, propertiesTable) => {
				if (err) {
					next('', { ...args, outgoingProperties: [] });
					return;
				}

				const query = `SELECT * FROM CEDS_Properties WHERE CEDS_ClassesRefId = '${classRefId}'`;
				
				propertiesTable.getData(
					query,
					{ suppressStatementLog: true, noTableNameOk: true },
					(err, properties) => {
						const outgoingProperties = properties || [];
						next('', { ...args, outgoingProperties });
					}
				);
			});
		});

		// --------------------------------------------------------------------------------
		// TASK: Get incoming properties (where this class is in the range)

		taskList.push((args, next) => {
			const { classData } = args;
			const classUri = classData.uri || `http://ceds.ed.gov/terms#${classData.name}`;
			
			args.sqlDb.getTable('CEDS_Properties', (err, propertiesTable) => {
				if (err) {
					next('', { ...args, incomingProperties: [] });
					return;
				}

				// Search for properties where this class appears in the rangeIncludes
				const query = `SELECT * FROM CEDS_Properties WHERE 
					jsonString LIKE '%"rangeIncludes":%${classData.name}%' OR
					jsonString LIKE '%${classUri}%'`;
				
				propertiesTable.getData(
					query,
					{ suppressStatementLog: true, noTableNameOk: true },
					(err, properties) => {
						if (err || !properties) {
							next('', { ...args, incomingProperties: [] });
							return;
						}

						// Filter to only properties that actually have this class in their range
						const incomingProperties = properties.filter(prop => {
							if (!prop.jsonString) return false;
							try {
								const jsonData = JSON.parse(prop.jsonString);
								return jsonData.rangeIncludes && 
									(jsonData.rangeIncludes.includes(classUri) ||
									 jsonData.rangeIncludes.includes(classData.name));
							} catch (e) {
								return false;
							}
						});

						next('', { ...args, incomingProperties });
					}
				);
			});
		});

		// --------------------------------------------------------------------------------
		// TASK: Build comprehensive relationship data

		taskList.push((args, next) => {
			const { classData, outgoingProperties, incomingProperties } = args;
			
			// Parse class metadata
			let classMeta = {};
			if (classData.jsonString) {
				try {
					classMeta = JSON.parse(classData.jsonString);
				} catch (e) {
					console.error('Failed to parse class jsonString:', e);
				}
			}

			// Build metadata triples
			const metadataTriples = [];
			
			// Basic RDF type triple
			metadataTriples.push({
				subject: classData.uri,
				predicate: 'rdf:type',
				predicateLabel: 'Type',
				object: classData.classType || 'owl:Class',
				relationship: 'metadata'
			});

			// SubClassOf relationship
			if (classMeta.superClasses && classMeta.superClasses.length > 0) {
				classMeta.superClasses.forEach(superClass => {
					metadataTriples.push({
						subject: classData.uri,
						predicate: 'rdfs:subClassOf',
						predicateLabel: 'Subclass Of',
						object: superClass,
						relationship: 'hierarchy'
					});
				});
			} else {
				// Default to BaseCEDSResource if no superclass specified
				metadataTriples.push({
					subject: classData.uri,
					predicate: 'rdfs:subClassOf',
					predicateLabel: 'Subclass Of',
					object: 'http://ceds.ed.gov/terms#BaseCEDSResource',
					relationship: 'hierarchy'
				});
			}

			// Label triple
			if (classData.label || classData.prefLabel) {
				metadataTriples.push({
					subject: classData.uri,
					predicate: 'rdfs:label',
					predicateLabel: 'Label',
					object: classData.label || classData.prefLabel,
					relationship: 'metadata'
				});
			}

			// Notation triple
			if (classData.notation) {
				metadataTriples.push({
					subject: classData.uri,
					predicate: 'skos:notation',
					predicateLabel: 'Notation',
					object: classData.notation,
					relationship: 'metadata'
				});
			}

			// Definition triple
			if (classData.definition || classData.description) {
				metadataTriples.push({
					subject: classData.uri,
					predicate: 'skos:definition',
					predicateLabel: 'Definition',
					object: classData.definition || classData.description,
					relationship: 'metadata'
				});
			}

			// Build result object
			const relationships = {
				classData,
				metadataTriples,
				outgoingProperties,
				incomingProperties,
				statistics: {
					totalOutgoing: outgoingProperties.length,
					totalIncoming: incomingProperties.length,
					totalMetadata: metadataTriples.length,
					totalRelationships: outgoingProperties.length + incomingProperties.length + metadataTriples.length
				}
			};

			next('', { ...args, relationships });
		});

		// --------------------------------------------------------------------------------
		// INIT AND EXECUTE THE PIPELINE

		const initialData = { sqlDb, mapper, dataMapping, classRefId };
		pipeRunner(taskList.getList(), initialData, (err, args) => {
			if (err) {
				xLog.error(`fetch-ceds-class-relationships FAILED: ${err} (${moduleName}.js)`);
				callback(err);
				return;
			}

			callback('', args.relationships);
		});
	};

	// ================================================================================
	// Access Point Constructor

	const addEndpoint = ({ name, serviceFunction, dotD }) => {
		dotD.logList.push(name);
		dotD.library.add(name, serviceFunction);
	};

	// ================================================================================
	// ENDPOINT REGISTRATION

	const name = 'fetch-ceds-class-relationships';
	addEndpoint({ name, serviceFunction, dotD });

	// ================================================================================
	// RETURN EMPTY OBJECT (required pattern)

	return {};
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;