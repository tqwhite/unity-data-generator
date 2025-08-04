'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = function (args = {}) {
	const { xLog } = process.global;

	function buildShowAllQuery({ config, whereClause, resultLimit, validation, getCurrentSemanticMode, schemaRegistry }) {
		// Sanitize WHERE clause for user-friendly input
		const sanitizedWhereClause = validation.sanitizeWhereClause(whereClause);
		
		// Get schema for current dataProfile + semanticAnalyzer combination
		const semanticMode = getCurrentSemanticMode();
		const schema = schemaRegistry.getSchema(config.dataProfile, semanticMode);
		
		// Use appropriate query builder based on schema capabilities
		if (schema.joinable) {
			return schemaRegistry.buildJoinQuery(schema, sanitizedWhereClause, resultLimit);
		} else {
			return schemaRegistry.buildSourceOnlyQueryGeneric(schema, sanitizedWhereClause, resultLimit);
		}
	}

	function buildVectorsOnlyQuery({ config, whereClause, resultLimit, validation, getCurrentSemanticMode, schemaRegistry }) {
		// Sanitize WHERE clause for user-friendly input
		const sanitizedWhereClause = validation.sanitizeWhereClause(whereClause);
		
		// Get schema for current dataProfile + semanticAnalyzer combination
		const semanticMode = getCurrentSemanticMode();
		const schema = schemaRegistry.getSchema(config.dataProfile, semanticMode);
		
		// Use schema registry's generic vector query builder
		return schemaRegistry.buildVectorsOnlyQueryGeneric(schema, sanitizedWhereClause, resultLimit);
	}

	function buildSourceOnlyQuery({ config, whereClause, resultLimit, validation, getCurrentSemanticMode, schemaRegistry }) {
		// Sanitize WHERE clause for user-friendly input
		const sanitizedWhereClause = validation.sanitizeWhereClause(whereClause);
		
		// Get schema for current dataProfile + semanticAnalyzer combination
		const semanticMode = getCurrentSemanticMode();
		const schema = schemaRegistry.getSchema(config.dataProfile, semanticMode);
		
		// Use schema registry's generic source query builder
		return schemaRegistry.buildSourceOnlyQueryGeneric(schema, sanitizedWhereClause, resultLimit);
	}

	function buildMatchDiscrepanciesQuery({ config, whereClause, resultLimit }) {
		// This query finds SIF elements where simple and atomic vector analysis
		// produced different CEDS element matches - ignoring whereClause and using static logic
		
		let query = `
			SELECT 
				sif.refId as SIF_RefId,
				sif.Name as SIF_Name,
				sif.Description as SIF_Description,
				sif.XPath as SIF_XPath,
				simple._CEDSElementsRefId as Simple_CEDS_Match,
				atomic._CEDSElementsRefId as Atomic_CEDS_Match,
				c1.ElementName as Simple_Match_Name,
				c1.Definition as Simple_Match_Definition,
				c2.ElementName as Atomic_Match_Name,
				c2.Definition as Atomic_Match_Definition,
				simple.confidence as Simple_Confidence,
				atomic.confidence as Atomic_Confidence
			FROM naDataModel sif
			JOIN unityCedsMatches simple ON sif.refId = simple.naDataModelRefId
			JOIN unityCedsMatches atomic ON sif.refId = atomic.naDataModelRefId
			JOIN _CEDSElements c1 ON simple._CEDSElementsRefId = c1.GlobalID
			JOIN _CEDSElements c2 ON atomic._CEDSElementsRefId = c2.GlobalID
			WHERE simple.semanticAnalysisMode = 'simpleVector'
			  AND atomic.semanticAnalysisMode = 'atomicVector'
			  AND simple._CEDSElementsRefId != atomic._CEDSElementsRefId
		`;
		
		if (resultLimit) {
			query += ` LIMIT ${parseInt(resultLimit)}`;
		} else {
			query += ` LIMIT 10`; // Default limit for this specialized query
		}
		
		return query;
	}

	function buildCompareAnalysisQuery({ config, whereClause, resultLimit, validation }) {
		// Sanitize WHERE clause for user-friendly input
		const sanitizedWhereClause = validation.sanitizeWhereClause(whereClause);
		
		// This query compares original definitions with both atomic and simple vector analysis
		// It requires special handling to query both vector modes
		
		if (config.dataProfile === 'ceds') {
			let query = `
				SELECT 
					s.GlobalID,
					s.ElementName,
					s.Definition as OriginalDefinition,
					GROUP_CONCAT(a.factText, ' | ') as AtomicAnalysis,
					GROUP_CONCAT(a.factType, ', ') as FactTypes,
					GROUP_CONCAT(a.semanticCategory, ', ') as Categories
				FROM _CEDSElements s
				LEFT JOIN cedsElementVectors_atomic a ON s.GlobalID = a.sourceRefId
				WHERE ${sanitizedWhereClause}
				GROUP BY s.GlobalID, s.ElementName, s.Definition
			`;
			
			if (resultLimit) {
				query += ` LIMIT ${parseInt(resultLimit)}`;
			}
			
			return query;
		} else if (config.dataProfile === 'sif') {
			// SIF atomic vector analysis is not yet implemented
			xLog.error('compareAnalysis currently only supports CEDS data. SIF atomic vector analysis is not yet available. Use "sourceOnly" query for SIF data.');
			process.exit(1);
		} else {
			throw new Error(`compareAnalysis currently only supports CEDS data. SIF atomic vector analysis is not yet available. Use 'sourceOnly' query for SIF data.`);
		}
	}

	function buildShowQueryInfoQuery({ config, whereClause, resultLimit }) {
		// This is a special query type that doesn't actually query the database
		// Instead, it shows what queries would be generated
		return null; // Will be handled specially in the main function
	}

	return {
		buildShowAllQuery,
		buildVectorsOnlyQuery,
		buildSourceOnlyQuery,
		buildMatchDiscrepanciesQuery,
		buildCompareAnalysisQuery,
		buildShowQueryInfoQuery
	};
};

module.exports = moduleFunction;