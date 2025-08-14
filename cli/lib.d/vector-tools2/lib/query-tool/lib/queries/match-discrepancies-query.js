'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = function (args = {}) {
	const { xLog } = process.global;

	// Build matchDiscrepancies query - finds elements where simple/atomic vectors disagree
	function buildQuery({ dataProfile, whereClause, resultLimit, semanticMode }) {
		if (dataProfile === 'sif') {
			return buildSifMatchDiscrepanciesQuery({ whereClause, resultLimit });
		} else {
			throw new Error('matchDiscrepancies query is only available for SIF data profile');
		}
	}

	function buildSifMatchDiscrepanciesQuery({ whereClause, resultLimit }) {
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
				atomic.confidence as Atomic_Confidence,
				simple.semanticAnalyzerVersion as Simple_Version,
				atomic.semanticAnalyzerVersion as Atomic_Version
			FROM naDataModel sif
			JOIN unityCedsMatches simple ON sif.refId = simple.naDataModelRefId
			JOIN unityCedsMatches atomic ON sif.refId = atomic.naDataModelRefId
			JOIN _CEDSElements c1 ON simple._CEDSElementsRefId = c1.GlobalID
			JOIN _CEDSElements c2 ON atomic._CEDSElementsRefId = c2.GlobalID
			WHERE simple.semanticAnalyzerVersion LIKE 'simple_%'
			  AND atomic.semanticAnalyzerVersion LIKE 'atomic_%'
			  AND simple._CEDSElementsRefId != atomic._CEDSElementsRefId
		`;

		// Add additional WHERE conditions if provided
		if (whereClause && whereClause.trim()) {
			const sanitizedWhere = whereClause.replace(/"/g, "'");
			query += ` AND (${sanitizedWhere})`;
		}

		// Add ORDER BY for consistent results
		query += ` ORDER BY sif.Name`;

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