'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = function (args = {}) {
	const { xLog } = process.global;

	// Generic table results formatter
	function formatTableResults(results, queryType) {
		if (!results || results.length === 0) {
			xLog.status('No results found for the given criteria');
			return;
		}

		xLog.status(`\nFound ${results.length} records (query type: ${queryType})\n`);

		results.forEach((row, index) => {
			xLog.status(`${index + 1}. [${row.GlobalID || row.refId}] ${row.ElementName || row.Name || 'No Name'}`);
			
			if (row.Definition) {
				xLog.status(`   Definition: ${row.Definition}`);
			}
			if (row.Description) {
				xLog.status(`   Description: ${row.Description}`);
			}
			if (row.XPath) {
				xLog.status(`   XPath: ${row.XPath}`);
			}
			if (row.Type) {
				xLog.status(`   Type: ${row.Type}`);
			}
			if (row.Format) {
				xLog.status(`   Format: ${row.Format}`);
			}
			if (row.UsageNotes) {
				xLog.status(`   Usage: ${row.UsageNotes}`);
			}

			// Vector-specific fields
			if (row.VectorRefId) {
				xLog.status(`   Vector ID: ${row.VectorRefId}`);
			}
			if (row.semanticAnalyzerVersion) {
				xLog.status(`   Analyzer: ${row.semanticAnalyzerVersion}`);
			}
			if (row.confidence !== undefined && row.confidence !== null) {
				xLog.status(`   Confidence: ${row.confidence}`);
			}
			if (row.factType) {
				xLog.status(`   FactType: ${row.factType}`);
			}
			if (row.factText) {
				xLog.status(`   FactText: ${row.factText}`);
			}
			if (row.semanticCategory) {
				xLog.status(`   Category: ${row.semanticCategory}`);
			}

			// Timestamp fields
			if (row.VectorCreatedAt) {
				const date = new Date(row.VectorCreatedAt).toLocaleDateString();
				xLog.status(`   Vector Created: ${date}`);
			}
			
			xLog.status(''); // Empty line between records
		});
	}

	// Specialized formatter for compareAnalysis results
	function formatComparisonResults(results, queryType) {
		if (!results || results.length === 0) {
			xLog.status('No results found for the given criteria');
			return;
		}

		xLog.status(`\nFound ${results.length} records with atomic analysis comparison\n`);

		results.forEach((row, index) => {
			xLog.status(`${index + 1}. [${row.GlobalID}] ${row.ElementName}`);
			
			xLog.status('   📄 ORIGINAL DEFINITION:');
			const originalText = row.OriginalDefinition || 'No original definition';
			xLog.status(`      ${originalText}`);
			
			if (row.AtomicAnalysis && row.AtomicAnalysis !== 'null') {
				xLog.status('   🔬 ATOMIC ANALYSIS:');
				const atomicParts = row.AtomicAnalysis.split(' | ').filter(part => part && part !== 'null');
				atomicParts.forEach(part => {
					xLog.status(`      • ${part}`);
				});
			}
			
			if (row.FactTypes && row.FactTypes !== 'null') {
				xLog.status('   🏷️  FACT TYPES:');
				xLog.status(`      ${row.FactTypes}`);
			}
			
			if (row.Categories && row.Categories !== 'null') {
				xLog.status('   📂 CATEGORIES:');
				xLog.status(`      ${row.Categories}`);
			}

			// Show statistics if available
			if (row.FactCount !== undefined) {
				xLog.status('   📊 STATISTICS:');
				xLog.status(`      Facts: ${row.FactCount}, Avg Confidence: ${parseFloat(row.AvgConfidence || 0).toFixed(3)}`);
			}
			
			xLog.status(''); // Extra spacing between entries
		});
	}

	// Specialized formatter for match discrepancies
	function formatDiscrepancyResults(results, queryType) {
		if (!results || results.length === 0) {
			xLog.status('No discrepancies found between simple and atomic vector analysis');
			return;
		}

		xLog.status(`\nFound ${results.length} discrepancies between simple and atomic vector analysis\n`);

		results.forEach((row, index) => {
			xLog.status(`${index + 1}. [${row.SIF_RefId}] ${row.SIF_Name}`);
			if (row.SIF_XPath) {
				xLog.status(`   XPath: ${row.SIF_XPath}`);
			}
			
			xLog.status(`   🔴 SIF DESCRIPTION:`);
			xLog.status(`      ${row.SIF_Description || 'No description'}`);
			
			xLog.status(`   🔵 SIMPLE VECTOR MATCH (confidence: ${row.Simple_Confidence}):`);
			xLog.status(`      [${row.Simple_CEDS_Match}] ${row.Simple_Match_Name}`);
			xLog.status(`      ${row.Simple_Match_Definition}`);
			
			xLog.status(`   🟠 ATOMIC VECTOR MATCH (confidence: ${row.Atomic_Confidence}):`);
			xLog.status(`      [${row.Atomic_CEDS_Match}] ${row.Atomic_Match_Name}`);
			xLog.status(`      ${row.Atomic_Match_Definition}`);
			
			if (row.Simple_Version && row.Atomic_Version) {
				xLog.status(`   🔧 VERSIONS: Simple: ${row.Simple_Version}, Atomic: ${row.Atomic_Version}`);
			}
			
			xLog.status(''); // Extra spacing between entries
		});
	}

	// Specialized formatter for Unity CEDS comparison
	function formatUnityComparisonResults(results, queryType) {
		if (!results || results.length === 0) {
			xLog.status('No Unity CEDS matches found for the given criteria');
			return;
		}

		xLog.status(`\nFound ${results.length} Unity CEDS AI recommendations\n`);

		results.forEach((row, index) => {
			const modifiedDate = row.Unity_ModifiedAt ? new Date(row.Unity_ModifiedAt).toLocaleDateString() : 'N/A';
			xLog.status(`${index + 1}. [${row.SIF_RefId}] ${row.SIF_Name}`);
			if (row.SIF_XPath) {
				xLog.status(`   XPath: ${row.SIF_XPath}`);
			}
			
			xLog.status(`   🔴 SIF DESCRIPTION:`);
			xLog.status(`      ${row.SIF_Description || 'No description'}`);
			
			xLog.status(`   🟢 UNITY AI RECOMMENDATION (confidence: ${row.Unity_Confidence}):`);
			xLog.status(`      [${row.Unity_CEDS_Match}] ${row.Unity_Match_Name}`);
			xLog.status(`      ${row.Unity_Match_Definition}`);
			
			if (row.Unity_Match_Format) {
				xLog.status(`      Format: ${row.Unity_Match_Format}`);
			}
			if (row.Unity_Match_UsageNotes) {
				xLog.status(`      Usage: ${row.Unity_Match_UsageNotes}`);
			}
			
			xLog.status(`   🕒 Modified: ${modifiedDate} (${row.Unity_Version})`);
			
			xLog.status(''); // Extra spacing between entries
		});
	}

	return {
		formatTableResults,
		formatComparisonResults,
		formatDiscrepancyResults,
		formatUnityComparisonResults
	};
};

module.exports = moduleFunction;