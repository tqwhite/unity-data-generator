'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = function (args = {}) {
	const { xLog } = process.global;

	// Build unityCedsComparison query - shows elements with unityCedsMatch AI recommendations
	function buildQuery({ dataProfile, whereClause, resultLimit, semanticMode }) {
		if (dataProfile === 'sif') {
			return buildSifUnityCedsComparisonQuery({ whereClause, resultLimit });
		} else {
			throw new Error('unityCedsComparison query is only available for SIF data profile');
		}
	}

	function buildSifUnityCedsComparisonQuery({ whereClause, resultLimit }) {
		let query = `
			SELECT 
				sif.refId as SIF_RefId,
				sif.Name as SIF_Name,
				sif.Description as SIF_Description,
				sif.XPath as SIF_XPath,
				unity._CEDSElementsRefId as Unity_CEDS_Match,
				unity.confidence as Unity_Confidence,
				unity.updatedAt as Unity_ModifiedAt,
				unity.semanticAnalyzerVersion as Unity_Version,
				c_unity.ElementName as Unity_Match_Name,
				c_unity.Definition as Unity_Match_Definition,
				c_unity.Format as Unity_Match_Format,
				c_unity.UsageNotes as Unity_Match_UsageNotes
			FROM naDataModel sif
			JOIN unityCedsMatches unity ON sif.refId = unity.naDataModelRefId
			JOIN _CEDSElements c_unity ON unity._CEDSElementsRefId = c_unity.GlobalID
			WHERE 1=1
		`;

		// Add additional WHERE conditions if provided
		if (whereClause && whereClause.trim()) {
			const sanitizedWhere = whereClause.replace(/"/g, "'");
			query += ` AND (${sanitizedWhere})`;
		}

		// Add ORDER BY for consistent results
		query += ` ORDER BY sif.Name, unity.confidence DESC`;

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