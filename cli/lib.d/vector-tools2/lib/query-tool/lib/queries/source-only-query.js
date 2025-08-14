'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = function (args = {}) {
	const { xLog } = process.global;

	// Build sourceOnly query - shows source table records only
	function buildQuery({ dataProfile, whereClause, resultLimit, semanticMode }) {
		if (dataProfile === 'ceds') {
			return buildCedsSourceOnlyQuery({ whereClause, resultLimit });
		} else if (dataProfile === 'sif') {
			return buildSifSourceOnlyQuery({ whereClause, resultLimit });
		} else {
			throw new Error(`Unsupported data profile: ${dataProfile}`);
		}
	}

	function buildCedsSourceOnlyQuery({ whereClause, resultLimit }) {
		let query = `
			SELECT 
				GlobalID,
				ElementName,
				AltName,
				Definition,
				Format,
				HasOptionSet,
				UsageNotes,
				URL,
				Version,
				TermID
			FROM _CEDSElements
		`;

		// Add WHERE clause if provided
		if (whereClause && whereClause.trim()) {
			query += ` WHERE ${whereClause}`;
		}

		// Add ORDER BY for consistent results
		query += ` ORDER BY ElementName`;

		// Add LIMIT if specified
		if (resultLimit) {
			query += ` LIMIT ${resultLimit}`;
		}

		return query;
	}

	function buildSifSourceOnlyQuery({ whereClause, resultLimit }) {
		let query = `
			SELECT 
				refId,
				Name,
				Description,
				XPath,
				Type,
				Characteristics,
				Mandatory,
				Format,
				createdAt,
				updatedAt
			FROM naDataModel
		`;

		// Add WHERE clause if provided
		if (whereClause && whereClause.trim()) {
			query += ` WHERE ${whereClause}`;
		}

		// Add ORDER BY for consistent results
		query += ` ORDER BY Name`;

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