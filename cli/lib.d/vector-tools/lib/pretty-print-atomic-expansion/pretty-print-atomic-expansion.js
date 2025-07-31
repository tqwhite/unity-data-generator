'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = ({ moduleName } = {}) => ({ unused } = {}) => {
	const { xLog, getConfig, rawConfig, commandLineParameters, projectRoot } = process.global;
	const moduleConfig = getConfig(moduleName);

	// Helper function for verbose query analysis display
	const prettyPrintAtomicExpansion = (xLog) => (verboseData) => {
		if (!verboseData) return;

		xLog.status(
			'\n╔═══════════════════════════════════════════════════════════════════════════════════════════════════════╗',
		);
		xLog.status(
			'║                                      QUERY EXPANSION ANALYSIS                                         ║',
		);
		xLog.status(
			'╚═══════════════════════════════════════════════════════════════════════════════════════════════════════╝',
		);

		xLog.status(`├─ Original Query: "${verboseData.originalQuery}"`);
		xLog.status('│');

		verboseData.enrichedStrings.forEach((enrichedData, index) => {
			const isLast = index === verboseData.enrichedStrings.length - 1;
			const connector = isLast ? '└─' : '├─';

			xLog.status(
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

					xLog.status(`${matchConnector} ${matchPrefix} ${matchDescription}`);
				});
			} else {
				const noMatchConnector = isLast ? '   ' : '│  ';
				xLog.status(`${noMatchConnector} └─ (no matches found)`);
			}

			if (!isLast) {
				xLog.status('│');
			}
		});

		xLog.status('');
	};

	return { prettyPrintAtomicExpansion };
};

module.exports = moduleFunction({ moduleName }); //returns initialized moduleFunction