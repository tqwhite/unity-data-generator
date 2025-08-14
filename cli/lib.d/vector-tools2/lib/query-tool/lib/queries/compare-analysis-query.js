'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = function (args = {}) {
	const { xLog } = process.global;

	// Build compareAnalysis query - compares original definitions with atomic analysis
	function buildQuery({ dataProfile, whereClause, resultLimit, semanticMode }) {
		if (dataProfile === 'ceds') {
			return buildCedsCompareAnalysisQuery({ whereClause, resultLimit });
		} else if (dataProfile === 'sif') {
			// SIF atomic analysis not yet implemented
			xLog.error('compareAnalysis currently only supports CEDS data. SIF atomic vector analysis is not yet available. Use "sourceOnly" query for SIF data.');
			process.exit(1);
		} else {
			throw new Error(`Unsupported data profile: ${dataProfile}`);
		}
	}

	function buildCedsCompareAnalysisQuery({ whereClause, resultLimit }) {
		let query = `
			SELECT 
				s.GlobalID,
				s.ElementName,
				s.Definition as OriginalDefinition,
				GROUP_CONCAT(a.factText, ' | ') as AtomicAnalysis,
				GROUP_CONCAT(DISTINCT a.factType, ', ') as FactTypes,
				GROUP_CONCAT(DISTINCT a.semanticCategory, ', ') as Categories,
				COUNT(a.refId) as FactCount,
				MAX(a.confidence) as MaxConfidence,
				MIN(a.confidence) as MinConfidence,
				AVG(a.confidence) as AvgConfidence
			FROM _CEDSElements s
			LEFT JOIN cedsElementVectors_atomic a ON s.GlobalID = a.sourceRefId 
			WHERE 1=1
		`;

		// Add additional WHERE conditions if provided
		if (whereClause && whereClause.trim()) {
			// Parse whereClause to ensure it's compatible with GROUP BY
			const sanitizedWhere = whereClause.replace(/"/g, "'");
			query += ` AND (${sanitizedWhere})`;
		}

		// Add GROUP BY clause
		query += ` 
			GROUP BY s.GlobalID, s.ElementName, s.Definition
			ORDER BY s.ElementName
		`;

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