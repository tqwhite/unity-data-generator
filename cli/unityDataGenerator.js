#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot
//const projectRoot=fs.realpathSync(path.join(__dirname, '..', '..')); // adjust the number of '..' to fit reality

const qt = require('qtools-functional-library'); //qt.help({printOutput:true, queryString:'.*', sendJson:false});

//START OF moduleFunction() ========================================hello====================

const moduleFunction = async function(
	error,
	{ getConfig, commandLineParameters }
) {
	//remember, this has init at the end of the file
	const { xLog } = process.global;
	if(error){
		xLog.error(error);
		process.exit(1);
	}
		
	process.global.getConfig=getConfig;

	const localConfig = getConfig('SYSTEM');

	const {
		spreadsheetPath,
		structuresPath,
		outputsPath,
		strictXSD,
		ignoreTags,
		knownIds
	} = localConfig;

	const fs = require('fs');
	const xlsx = require('xlsx');
	const xml2js = require('xml2js');
	const xpath = require('xml2js-xpath');
	const { XMLParser } = require('fast-xml-parser');
	const Ajv = require('ajv');
	const { v1, v4 } = require('uuid');
	
	const jinaCore = require('./lib/jina-core').conversationGenerator();
	
	const callJinaGen = require('./lib/call-jina');
	
	var xmlnsDeclaration = '';
	var children = [];

	const collection = commandLineParameters.qtGetSurePath('fileList.0');
	
	// So we have the metadata for engineering prompts (we start with the spreadsheet).
	if (!fs.existsSync(spreadsheetPath)) {
		xLog.error(`No specifications found. ${spreadsheetPath} does not exists`);
		process.exit(1);
	}

	
	try {
		const startTime = performance.now(); //milliseconds
		const workbook = xlsx.readFile(spreadsheetPath);
		const worksheetNames = workbook.SheetNames;
		xLog.status(`Using data model spec file: ${spreadsheetPath}`);

		//revised from forEach() by tqii to help async/await
		for (var index = 0, len = worksheetNames.length; index < len; index++) {
			var name = worksheetNames[index];
			// So we have the contents of the worksheet optimized for lookup by XPath.
			const sheet = workbook.Sheets[name];
			const fields = createWorksheetFields(sheet);
			// So we can focus (on one object at a time).
			if (null == collection || name == collection) {
				// So we have an XML template to fill in.
				const structurePath = structuresPath + name + '.xml';
				if (!fs.existsSync(structurePath)) {
					xLog.status(`XML not found: ${structurePath}`);
					process.exit(1);
				} else {
					xLog.status(`XML found: ${structurePath}`);
					let xmlString = '';
					try {
						xmlString = fs.readFileSync(structurePath, 'utf8');
					} catch (error) {
						xLog.error(`Error reading XML file: ${error.message}`);
						process.exit(1);
					}					
					const parseStringCallback=async (err, result) => {
						if (err) {
							xLog.error(`Error parsing the XML: ${err.message}`);
							process.exit(1);
						}
					
						fs.mkdirSync(structuresPath, {recursive:true});
						xLog.status(`Writing to output directory: ${structuresPath}`);


						//xLog.status('\nXML Contents:');  // Debug
						//xLog.status(removeFirstLine(xmlString));  // Debug

						const xmlCollection = result;
						// So we have an object, not a collection.
						const rootName = Object.keys(xmlCollection)[0];
						xmlnsDeclaration = xmlCollection[rootName].$?.xmlns;
						const xpathResult = xpath.find(xmlCollection, '/' + rootName);
						const objectName = rootName.slice(0, -1);
						let template = xpathResult[0][objectName][0];
						if (null != xmlnsDeclaration) {
							template.$.xmlns = xmlnsDeclaration;
						}
						template = { [objectName]: template };
						//xLog.status(JSON.stringify(template, null, 2));  // Debug
						//xLog.status(template);  // Debug
						let xmlInput = createXmlString(template);
						xmlInput = removeFirstLine(xmlInput);
						//xLog.status('\nInput XML:');
						//xLog.status(xmlInput);

						// So we can prompt for random valid human friend data at any place in the object.
						let xmlObject = {};
						//xLog.status('\nTraversal with XPath:');
						children = [];
						
						await traverseXML(template, xmlObject, fields);

						// So we see our results and can keep fruit of our labor (as XML)l.
						//xLog.status(JSON.stringify(xmlObject, null, 2));  // Debug
						//xLog.status(xmlObject);  // Debug
						let xmlOutput = createXmlString(xmlObject);
						xmlOutput = removeFirstLine(xmlOutput);
						//validateXMLAgainstXSD(xmlOutput, strictXSD);
						//           validateXMLAgainstXSD(xmlOutput, strictXSD)
						//             .then((validationResult) => {
						//               if (validationResult.isValid) {
						//                 xLog.status('XML is valid.');
						//               } else {
						//                 xLog.status('XML is not valid. Errors:');
						//                 xLog.status(validationResult.errors);
						//               }
						//             })
						//             .catch((err) => {
						//               xLog.error(`Error during XML validation: ${err}`);
						//             });
						if (true) {
							xLog.status('\nGenerated XML:');
							//						xLog.result(xmlOutput);
							xLog.status('\n'); // Whitespace
						}
						
						const {decode}=await import('html-entities');
						const outputPath = outputsPath + objectName + '.xml';
						try {
							fs.writeFileSync(outputPath, decode(xmlOutput, {level: 'xml'}), { encoding: 'utf-8' });
						} catch (error) {
							xLog.error(`Error writing: ${outputPath}`);
							xLog.error(error.message);
							process.exit(1);
						}
					}
					
					
					
					
					
					await xml2js.parseString(xmlString, parseStringCallback);
				}
			}
		}
		const endTime = performance.now();
		const duration=(
					(endTime - startTime) /
					1000
				).toFixed(2);
			
		xLog.status(`Processing time: ${duration} seconds`)
	} catch (error) {
		xLog.error(`Error: ${error.message}`);
		process.exit(1);
	}

	// So we have the contents of the worksheet optimized for lookup by XPath.
	function createWorksheetFields(sheet) {
		// Find the range of cells in the sheet
		const range = xlsx.utils.decode_range(sheet['!ref']);
		const rows = range.e.r + 1; // Total number of rows (1-based index)
		const cols = range.e.c + 1; // Total number of columns (1-based index)

		// Initialize the dictionary
		const fields = {};

		// Loop through the rows starting from 1 to skip the header row
		for (let row = 1; row < rows; row++) {
			// Read the unique ID from column F (index 5 - 1-based index)
			const uniqueIDCellAddress = xlsx.utils.encode_cell({ r: row, c: 5 });
			const uniqueID = sheet[uniqueIDCellAddress]
				? sheet[uniqueIDCellAddress].v
				: undefined;

			if (uniqueID) {
				// Initialize the inner dictionary for this unique ID
				fields[uniqueID] = {};

				// Loop through the columns (index starts from 1)
				for (let col = 0; col < cols; col++) {
					// Read the column header (index 0 - 0-based index)
					const columnHeaderCellAddress = xlsx.utils.encode_cell({
						r: 0,
						c: col
					});
					const columnHeader = sheet[columnHeaderCellAddress]
						? sheet[columnHeaderCellAddress].v
						: undefined;

					// Read the cell value
					const cellAddress = xlsx.utils.encode_cell({ r: row, c: col });
					const cellValue = sheet[cellAddress]
						? sheet[cellAddress].v
						: undefined;

					// Add the cell value to the inner dictionary with the column header as the key
					fields[uniqueID][columnHeader] = cellValue;
				}
			}
		}

		return fields;
	}

	// So we can check the generated XML for validity.
	// Note:  This seems to not validate values at the level we need, broken.
	function validateXMLAgainstXSD(xmlString, xsdPath) {
		return new Promise((resolve, reject) => {
			fs.readFile(xsdPath, 'utf8', (err, xsdData) => {
				if (err) {
					reject(err);
					return;
				}

				const ajv = new Ajv({
					allErrors: true,
					strict: false,
					validateSchema: false
				});
				const parserOptions = {
					ignoreAttributes: false,
					attributeNamePrefix: '',
					parseNodeValue: true, // Version 4 change: Enable parsing of node value
					parseAttributeValue: true // Version 4 change: Enable parsing of attribute values
				};

				const parser = new XMLParser();

				const xsdParsed = parser.parse(xsdData, parserOptions);
				ajv.addSchema(xsdParsed, 'xsd');

				const xmlParsed = parser.parse(xmlString, parserOptions);
				const isValid = ajv.validate('xsd', xmlParsed);

				if (isValid) {
					resolve({ isValid: true, errors: null });
				} else {
					const errors = ajv.errors.map(error => ({
						message: error.message,
						line: error.dataPath
					}));
					resolve({ isValid: false, errors });
				}
			});
		});
	}

	// Helper:  So we can get an entry in the worksheet's dictionary.
	function getFieldsRow(xpath, fields) {
		const xpathParts = xpath.split('/');
		const firstPart = xpathParts[1];
		xpath = '/' + firstPart + 's' + xpath;
		return fields[xpath];
	}

	// So we can quickly tell if an xpath is present in the worksheet.
	// Note:  This allows us to know that we are at a leaf in the tree (or not).
	function hasFieldsRow(xpath, fields) {
		const row = getFieldsRow(xpath, fields);
		if (null == row) {
			return false;
		}
		return true;
	}

	// So we can quickly get the value of a cell in the worksheet.
	function getFieldValue(xpath, name, fields) {
		const row = getFieldsRow(xpath, fields);
		return row[name];
	}

	// So we can check for an empty dictionary.
	// Note:  This allows us to know when to create the root element!
	function isEmpty(obj) {
		return 0 === Object.keys(obj).length;
	}

	// So we can create XML through objects/JSON.
	// See: xml2js
	function createXmlElement(tagName, attributes = {}, value = null) {
		const element = {};
		element[tagName] = {
			$: attributes
		};
		if (null != value) {
			element[tagName]._ = value;
		}
		return element;
	}

	// So we can combine objects into a XML compatible tree.
	// See: xml2js
	function addXmlElement(child, parent) {
		const childKey = Object.keys(child)[0];
		const parentKey = Object.keys(parent)[0];
		if (null == parent[parentKey][childKey]) {
			parent[parentKey][childKey] = [child[childKey]];
		} else {
			// So we handle lists (children with the same name).
			parent[parentKey][childKey].push(child[childKey]);
		}
	}

	// So we can copy a groups children into the preprepared node.
	function copyXmlChildren(source, destination) {
		const sourceKey = Object.keys(source)[0];
		const destinationKey = Object.keys(destination)[0];
		if (sourceKey != destinationKey) {
			xLog.status(
				'Warning:  Source and destination mismatch, copying children anyway!'
			);
			xLog.status(`Source: ${sourceKey}, 'Destination:', ${destinationKey}`);
		}
		// So we copy attributes (without removing existing ones).
		const attributeKeys = Object.keys(source[sourceKey].$);
		for (const attributeKey of attributeKeys) {
			destination[destinationKey].$[attributeKey] =
				source[sourceKey].$[attributeKey];
		}
		// So we copy elements.
		const elementKeys = Object.keys(source[sourceKey]);
		for (const elementKey of elementKeys) {
			// So we handle the attributes separately (see above).
			if ('$' != elementKey) {
				const wrappedSource = { [elementKey]: source[sourceKey][elementKey] };
				destination[destinationKey][elementKey] = source[sourceKey][elementKey];
			}
		}
	}

	// So we can validate and output the resulting XML as we like.
	function createXmlString(xmlObject) {
		const builder = new xml2js.Builder();
		return builder.buildObject(xmlObject);
	}

	// So we can create SIF IDs.
	function createUUID() {
		try {
			// Attempt to create a version 1 UUID
			return v1();
		} catch (error) {
			// If v1 UUID generation fails, create a version 4 UUID
			return v4();
		}
	}

	// So we can remove XML declarations or whitespace.
	function removeFirstLine(text) {
		var lines = text.split('\n');
		lines.splice(0, 1);
		return lines.join('\n');
	}

	// So we can easily work with just the XPaths in the group.
	// Note:  Removes matches from children array!
	function reduceChildren(groupXPath) {
		let filtered = [];
		let i = 0;
		while (i < children.length) {
			const childXPath = children[i];
			if (childXPath.startsWith(groupXPath)) {
				filtered.push(childXPath);
				children.splice(i, 1);
			} else {
				i++;
			}
		}
		return filtered;
	}

	// Since JavaScript doesn't have a built-in exclusive-or and we need one.
	function xor(a, b) {
		return (a || b) && !(a && b);
	}

	
	// ===================================================================================
	// TQii refactor Jina to her own module
	
	const xmlVersionStack=['First pass. No XML']; //this probably needs to be moved to a callJina() link, the one for the beginning of a new element
	
	const { callJina } = callJinaGen({
		addXmlElement,
		getFieldValue,
		createXmlElement,
		knownIds,
		createUUID,
		jinaCore,
		xmlVersionStack,
		commandLineParameters
	});

	// ===================================================================================


	// Function to recursively traverse the XML object
	async function traverseXML(
		template,
		xmlObject,
		fields,
		parent = null,
		xpath = '',
		ipath = '',
		ignore = false
	) {
		if (typeof template === 'object') {
			let index = false;
			let attribute = false;
			for (const key in template) {
				// So we ignore tags completely.
				if (ignoreTags.includes(key)) {
					ignore = true;
				}
				// Head:  So we can do things on the way down.
				// So we include non-indexes in our XPaths.
				if (isNaN(key)) {
					// So we build proper XPaths for attributes (with '@').
					if ('$' == key) {
						var currentXPath = `${xpath}/` + '@';
						index = true;
						attribute = true;
					} else {
						if ('@' == xpath[xpath.length - 1]) {
							var currentXPath = `${xpath}${key}`;
							index = false;
							attribute = true;
						} else {
							var currentXPath = `${xpath}/${key}`;
							index = false;
							attribute = false;
						}
					}
				} else {
					// So we we don't add index to our XPaths.
					var currentXPath = xpath;
					index = true;
					attribute = false;
				}
				let currentIPath = `${ipath}/${key}`;

				let groupingTag = true;
				let group = null;
				//xLog.status(`XPath: ${currentXPath}`);
				// Root!
				if (isEmpty(xmlObject)) {
					// So we start with the root and add it to the tree by reference.
					const root = createXmlElement(key);
					xmlObject[key] = root[key];
					group = xmlObject;
					// So we treat the root as a grouping tag on the way back up.
					index = true;
				} else if (index && !attribute && !ignore) {
					// Index:  So we pick-up on lists of grouping tags.
					// Not Attribute:  So we add all leaves on the way back up.
					const currentParts = currentXPath.split('/');
					const currentKey = currentParts[currentParts.length - 1];
					// So we know if actually have a grouping tag.
					if (!hasFieldsRow(currentXPath, fields)) {
						// So we can build up the tree structure later (just the grouping tags).
						group = createXmlElement(currentKey);
					}
				}

				// So keep this step in the recursion's parent.
				let newParent = parent;
				if (null != group) {
					newParent = group;
				}
				// Recurse:  So we keep going.
				await traverseXML(
					template[key],
					xmlObject,
					fields,
					newParent,
					currentXPath,
					currentIPath,
					ignore
				);
				
				
				const wrapItUp = async () => {
					const currentParts = currentXPath.split('/');
					const objectName = currentParts[1];
					const currentKey = currentParts[currentParts.length - 1];
					const parentXPath = currentParts.slice(0, -1).join('/');
					if (!ignore) {
						if (!hasFieldsRow(currentXPath, fields)) {
							//xLog.status(`Group XPath: ${currentXPath}`);
							// Since the root namespace declaration is special.
							if (xmlObject == parent && '@xmlns' == currentKey) {
								const rootKey = currentParts[1];
								xmlObject[rootKey].$.xmlns = xmlnsDeclaration;
							} else if (null != parent) {
								// So we don't match the children while look for group peers.
								const groupChildren = reduceChildren(currentXPath);
								// Process the immediate parents leaves.
								// This must be done before the group to maintain the proper order.
								const groupPeers = reduceChildren(parentXPath);
								let peer = await callJina(parentXPath, groupPeers, fields); //CALL JINA ============================
								console.log('======= peer');
								console.log(peer);    
								copyXmlChildren(peer, parent);
								// Process the group.
								let child = await callJina(currentXPath, groupChildren, fields); //CALL JINA ============================
								console.log('======= child');
								console.log(child);
								addXmlElement(group, parent);
								copyXmlChildren(child, group);
							}
						} else {
							//xLog.status(`Leaf XPath: ${currentXPath}`);
							children.push(currentXPath);
						}
					}
					if (ignoreTags.includes(currentKey)) {
						ignore = false;
					}
					// Root
					if (xmlObject == group) {
						// So we ensure we have generated the entire example.
						if (objectName == currentKey) {
							const groupChildren = reduceChildren(currentXPath);
							let child = await callJina(currentXPath, groupChildren, fields); //CALL JINA ============================
								console.log('======= child2');
								console.log(child);
							copyXmlChildren(child, group);
						}
					}
				};
				// Tail:  So we can do things on the way back up!
				if (xor(index, attribute)) {
					await wrapItUp();
				}
			}
		}
	}
	
};

//END OF moduleFunction() ============================================================

const path = require('path');
const xLog = require('./lib/x-log');

process.global = {};
process.global.applicationBasePath = path.join(
	path.dirname(__filename),
	'..',
	'..'
);
process.global.xLog = xLog;

require('./lib/assemble-configuration-show-help-maybe-exit')({
	configSegmentName: 'SYSTEM',
	terminationFunction: process.exit,
	callback: moduleFunction
});

