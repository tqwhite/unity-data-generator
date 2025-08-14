'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = function (args = {}) {
	const { xLog } = process.global;

	// Build showAll query - joins source data with vector metadata
	function buildQuery({ dataProfile, whereClause, resultLimit, semanticMode }) {
		if (dataProfile === 'ceds') {
			return buildCedsShowAllQuery({ whereClause, resultLimit, semanticMode });
		} else if (dataProfile === 'sif') {
			return buildSifShowAllQuery({ whereClause, resultLimit, semanticMode });
		} else {
			throw new Error(`Unsupported data profile: ${dataProfile}`);
		}
	}

	function buildCedsShowAllQuery({ whereClause, resultLimit, semanticMode }) {
		const vectorTable = semanticMode === 'atomicVector' ? 'cedsElementVectors_atomic' : 'cedsElementVectors_simple';
		
		let query = `
			SELECT 
				s.GlobalID,
				s.ElementName,
				s.Definition,
				s.Format,
				s.UsageNotes,
				v.refId as VectorRefId,
				v.sourceRefId,
				v.embedding,
				v.semanticAnalyzerVersion,
				v.confidence,
				v.createdAt as VectorCreatedAt,
				v.updatedAt as VectorUpdatedAt
			FROM _CEDSElements s
			LEFT JOIN ${vectorTable} v ON s.GlobalID = v.sourceRefId
		`;

		// Add WHERE clause if provided
		if (whereClause && whereClause.trim()) {
			query += ` WHERE ${whereClause}`;
		}

		// Add ORDER BY for consistent results
		query += ` ORDER BY s.ElementName`;

		// Add LIMIT if specified
		if (resultLimit) {
			query += ` LIMIT ${resultLimit}`;
		}

		return query;
	}

	function buildSifShowAllQuery({ whereClause, resultLimit, semanticMode }) {
		const vectorTable = semanticMode === 'atomicVector' ? 'naDataModelVectors_atomic' : 'naDataModelVectors_simple';
		
		let query = `
			SELECT 
				s.refId,
				s.Name,
				s.Description,
				s.XPath,
				s.Type,
				s.Characteristics,
				v.refId as VectorRefId,
				v.sourceRefId,
				v.embedding,
				v.semanticAnalyzerVersion,
				v.confidence,
				v.createdAt as VectorCreatedAt,
				v.updatedAt as VectorUpdatedAt
			FROM naDataModel s
			LEFT JOIN ${vectorTable} v ON s.refId = v.sourceRefId
		`;

		// Add WHERE clause if provided
		if (whereClause && whereClause.trim()) {
			query += ` WHERE ${whereClause}`;
		}

		// Add ORDER BY for consistent results
		query += ` ORDER BY s.Name`;

		// Add LIMIT if specified
		if (resultLimit) {
			query += ` LIMIT ${resultLimit}`;
		}

		return query;
	}

	return {
		buildQuery
	};
};

module.exports = moduleFunction;