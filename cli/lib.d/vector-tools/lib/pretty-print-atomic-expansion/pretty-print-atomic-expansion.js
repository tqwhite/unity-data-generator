'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = ({ moduleName } = {}) => ({ unused } = {}) => {
	const { xLog, getConfig, rawConfig, commandLineParameters, projectRoot } = process.global;
	const moduleConfig = getConfig(moduleName);

	// Helper function for verbose query analysis display
	const prettyPrintAtomicExpansion =  (verboseData) => {
		if (!verboseData) return;

		// Accumulate output into a string array
		const outputLines = [];

		outputLines.push('\n╔═══════════════════════════════════════════════════════════════════════════════════════════════════════╗');
		outputLines.push('║                                      QUERY EXPANSION ANALYSIS                                         ║');
		outputLines.push('╚═══════════════════════════════════════════════════════════════════════════════════════════════════════╝');
		outputLines.push(`├─ Original Query: "${verboseData.originalQuery}"`);
		outputLines.push('│');

		verboseData.enrichedStrings.forEach((enrichedData, index) => {
			const isLast = index === verboseData.enrichedStrings.length - 1;
			const connector = isLast ? '└─' : '├─';

			outputLines.push(
				`${connector} Enriched String ${index + 1} [${enrichedData.type}]: "${enrichedData.enrichedString}"`,
			);

			if (enrichedData.matches && enrichedData.matches.length > 0) {
				enrichedData.matches.forEach((match, matchIndex) => {
					const isLastMatch = matchIndex === enrichedData.matches.length - 1;
					const matchConnector = isLast ? '   ' : '│  ';
					const matchPrefix = isLastMatch ? '└─' : '├─';

					const distance = match.distance ? match.distance.toFixed(4) : 'N/A';
					let matchDescription = `[${distance}] RefID: ${match.sourceRefId}`;

					// Add fact details for atomic results
					if (match.factType && match.factText) {
						matchDescription += ` (${match.factType}: "${match.factText}")`;
					}

					outputLines.push(`${matchConnector} ${matchPrefix} ${matchDescription}`);
				});
			} else {
				const noMatchConnector = isLast ? '   ' : '│  ';
				outputLines.push(`${noMatchConnector} └─ (no matches found)`);
			}

			if (!isLast) {
				outputLines.push('│');
			}
		});

		outputLines.push('');

		// Output accumulated string all at once
		return outputLines.join('\n');
	};

	return { prettyPrintAtomicExpansion };
};

module.exports = moduleFunction({ moduleName }); //returns initialized moduleFunction