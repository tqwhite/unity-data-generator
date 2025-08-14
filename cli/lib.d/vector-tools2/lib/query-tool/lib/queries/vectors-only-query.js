'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = function (args = {}) {
	const { xLog } = process.global;

	// Build vectorsOnly query - shows vector table records only
	function buildQuery({ dataProfile, whereClause, resultLimit, semanticMode }) {
		if (dataProfile === 'ceds') {
			return buildCedsVectorsOnlyQuery({ whereClause, resultLimit, semanticMode });
		} else if (dataProfile === 'sif') {
			return buildSifVectorsOnlyQuery({ whereClause, resultLimit, semanticMode });
		} else {
			throw new Error(`Unsupported data profile: ${dataProfile}`);
		}
	}

	function buildCedsVectorsOnlyQuery({ whereClause, resultLimit, semanticMode }) {
		const vectorTable = semanticMode === 'atomicVector' ? 'cedsElementVectors_atomic' : 'cedsElementVectors_simple';
		
		let query = `
			SELECT 
				refId,
				sourceRefId,
				semanticAnalyzerVersion,
				confidence,
				embedding,
				factText,
				factType,
				semanticCategory,
				createdAt,
				updatedAt
			FROM ${vectorTable}
		`;

		// Add WHERE clause if provided
		if (whereClause && whereClause.trim()) {
			query += ` WHERE ${whereClause}`;
		}

		// Add ORDER BY for consistent results
		query += ` ORDER BY sourceRefId, createdAt`;

		// Add LIMIT if specified
		if (resultLimit) {
			query += ` LIMIT ${resultLimit}`;
		}

		return query;
	}

	function buildSifVectorsOnlyQuery({ whereClause, resultLimit, semanticMode }) {
		const vectorTable = semanticMode === 'atomicVector' ? 'naDataModelVectors_atomic' : 'naDataModelVectors_simple';
		
		let query = `
			SELECT 
				refId,
				sourceRefId,
				semanticAnalyzerVersion,
				confidence,
				embedding,
				factText,
				factType,
				semanticCategory,
				createdAt,
				updatedAt
			FROM ${vectorTable}
		`;

		// Add WHERE clause if provided
		if (whereClause && whereClause.trim()) {
			query += ` WHERE ${whereClause}`;
		}

		// Add ORDER BY for consistent results
		query += ` ORDER BY sourceRefId, createdAt`;

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