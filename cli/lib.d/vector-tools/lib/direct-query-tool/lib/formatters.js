'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = function (args = {}) {
	const { xLog } = process.global;

	function formatResults(results, queryType) {
		if (!results || results.length === 0) {
			xLog.status('No results found for the given criteria');
			return;
		}

		const showVectorDetails = queryType === 'showAll';
		const isCompareAnalysis = queryType === 'compareAnalysis';
		const isMatchDiscrepancies = queryType === 'matchDiscrepancies';
		xLog.status(`\nFound ${results.length} records (query type: ${queryType})\n`);

		results.forEach((row, index) => {
			if (isCompareAnalysis) {
				// Special formatting for compareAnalysis
				xLog.status(`${index + 1}. [${row.GlobalID || row.refId}] ${row.ElementName || row.Name || 'No Name'}`);
				
				if (row.XPath) {
					xLog.status(`   XPath: ${row.XPath}`);
				}
				
				xLog.status('   📄 ORIGINAL:');
				const originalText = row.OriginalDefinition || row.OriginalDescription || 'No original text';
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
				
				xLog.status(''); // Extra spacing between compare entries
			} else if (isMatchDiscrepancies) {
				// Special formatting for matchDiscrepancies
				xLog.status(`${index + 1}. [${row.SIF_RefId}] ${row.SIF_Name} - ${row.SIF_XPath || 'N/A'}`);
				xLog.status(`   🔴 SIF DESCRIPTION:`);
				xLog.status(`      ${row.SIF_Description || 'No description'}`);
				
				xLog.status(`   🔵 SIMPLE VECTOR MATCH (${row.Simple_Confidence}):`);
				xLog.status(`      [${row.Simple_CEDS_Match}] ${row.Simple_Match_Name}`);
				xLog.status(`      ${row.Simple_Match_Definition}`);
				
				xLog.status(`   🟠 ATOMIC VECTOR MATCH (${row.Atomic_Confidence}):`);
				xLog.status(`      [${row.Atomic_CEDS_Match}] ${row.Atomic_Match_Name}`);
				xLog.status(`      ${row.Atomic_Match_Definition}`);
				
				xLog.status(''); // Extra spacing between discrepancy entries
			} else {
				// Standard formatting for other query types
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
				if (row.Format) {
					xLog.status(`   Format: ${row.Format}`);
				}
				if (row.DataType) {
					xLog.status(`   DataType: ${row.DataType}`);
				}
				if (row.factType) {
					xLog.status(`   FactType: ${row.factType}`);
				}
				if (row.factText && showVectorDetails) {
					xLog.status(`   FactText: ${row.factText}`);
				}
				if (row.semanticCategory) {
					xLog.status(`   Category: ${row.semanticCategory}`);
				}
				if (row.conceptualDimension && showVectorDetails) {
					xLog.status(`   ConceptualDimension: ${row.conceptualDimension}`);
				}
				
				xLog.status(''); // Empty line between records
			}
		});
	}

	return {
		formatResults
	};
};

module.exports = moduleFunction;