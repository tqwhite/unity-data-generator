'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = function (args = {}) {
	const { xLog, getConfig } = process.global;
	const localConfig = getConfig(moduleName);

	// Schema definitions for all dataProfile + semanticAnalyzer combinations
	const schemas = {
		'ceds-simpleVector': {
			sourceTable: '_CEDSElements',
			vectorTable: 'cedsElementVectors',
			sourceColumns: ['GlobalID', 'ElementName', 'Definition', 'Format', 'HasOptionSet', 'UsageNotes'],
			vectorColumns: [], // vec0 virtual table - no joinable metadata
			joinable: false,
			keyFields: { source: 'GlobalID', vector: null }
		},
		
		'ceds-atomicVector': {
			sourceTable: '_CEDSElements', 
			vectorTable: 'cedsElementVectors_atomic',
			sourceColumns: ['GlobalID', 'ElementName', 'Definition', 'Format', 'HasOptionSet', 'UsageNotes'],
			vectorColumns: ['refId', 'factType', 'factText', 'semanticCategory', 'conceptualDimension', 'createdAt'],
			joinable: true,
			keyFields: { source: 'GlobalID', vector: 'sourceRefId' }
		},
		
		'sif-simpleVector': {
			sourceTable: 'naDataModel',
			vectorTable: 'sifElementVectors', 
			sourceColumns: ['refId', 'Name', 'Description', 'XPath', 'Type', 'Mandatory', 'Format'],
			vectorColumns: [], // vec0 virtual table - no joinable metadata
			joinable: false,
			keyFields: { source: 'refId', vector: null }
		},
		
		'sif-atomicVector': {
			sourceTable: 'naDataModel',
			vectorTable: 'sifElementVectors_atomic',
			sourceColumns: ['refId', 'Name', 'Description', 'XPath', 'Type', 'Mandatory', 'Format'], 
			vectorColumns: ['refId', 'factType', 'factText', 'semanticCategory', 'conceptualDimension', 'createdAt'],
			joinable: true,
			keyFields: { source: 'refId', vector: 'sourceRefId' }
		}
	};

	function getSchema(dataProfile, semanticMode) {
		const key = `${dataProfile}-${semanticMode}`;
		const schema = schemas[key];
		
		if (!schema) {
			const availableKeys = Object.keys(schemas).join(', ');
			throw new Error(`No schema defined for '${key}'. Available schemas: ${availableKeys}`);
		}
		
		return schema;
	}

	function getSupportedCombinations() {
		return Object.keys(schemas);
	}

	function validateCombination(dataProfile, semanticMode) {
		try {
			getSchema(dataProfile, semanticMode);
			return true;
		} catch (err) {
			return false;
		}
	}

	// Generic query builders using schema definitions
	function buildJoinQuery(schema, whereClause, resultLimit) {
		const sourceColumns = schema.sourceColumns.map(col => `s.${col}`).join(', ');
		const vectorColumns = schema.vectorColumns.map(col => `v.${col} as vector_${col}`).join(', ');
		
		let query = `SELECT ${sourceColumns}, ${vectorColumns} 
				FROM ${schema.sourceTable} s 
				LEFT JOIN ${schema.vectorTable} v ON s.${schema.keyFields.source} = v.${schema.keyFields.vector}
				WHERE ${whereClause}`;
		
		if (resultLimit) {
			query += ` LIMIT ${parseInt(resultLimit)}`;
		}
		
		return query;
	}

	function buildSourceOnlyQueryGeneric(schema, whereClause, resultLimit) {
		const sourceColumns = schema.sourceColumns.join(', ');
		
		let query = `SELECT ${sourceColumns} 
				FROM ${schema.sourceTable}
				WHERE ${whereClause}`;
		
		if (resultLimit) {
			query += ` LIMIT ${parseInt(resultLimit)}`;
		}
		
		return query;
	}

	function buildVectorsOnlyQueryGeneric(schema, whereClause, resultLimit) {
		if (!schema.joinable || schema.vectorColumns.length === 0) {
			throw new Error(`Vector-only queries not supported for ${schema.sourceTable} with non-joinable vector table`);
		}
		
		const vectorColumns = schema.vectorColumns.join(', ');
		
		let query = `SELECT ${vectorColumns} 
				FROM ${schema.vectorTable}
				WHERE ${whereClause}`;
		
		if (resultLimit) {
			query += ` LIMIT ${parseInt(resultLimit)}`;
		}
		
		return query;
	}

	return {
		getSchema,
		getSupportedCombinations,
		validateCombination,
		buildJoinQuery,
		buildSourceOnlyQueryGeneric,
		buildVectorsOnlyQueryGeneric
	};
};

module.exports = moduleFunction;