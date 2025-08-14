'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = function(args = {}) {
    const { xLog, getConfig } = process.global;

    /**
     * Pretty print atomic expansion analysis for version2 verboseData structure
     * Version2 uses: Subject, Category, Data_Meaning
     */
    const prettyPrintAtomicExpansion = (verboseData) => {
        if (!verboseData) return '';

        // Accumulate output into a string array
        const outputLines = [];

        outputLines.push('\n╔═══════════════════════════════════════════════════════════════════════════════════════════════════════╗');
        outputLines.push('║                                  VERSION2 QUERY EXPANSION ANALYSIS                                  ║');
        outputLines.push('╚═══════════════════════════════════════════════════════════════════════════════════════════════════════╝');
        outputLines.push(`├─ Original Query: "${verboseData.originalQuery}"`);
        outputLines.push('│');

        verboseData.enrichedStrings.forEach((enrichedData, index) => {
            const isLast = index === verboseData.enrichedStrings.length - 1;
            const connector = isLast ? '└─' : '├─';

            // Version2 specific formatting - show type and educational context
            let typeDisplay = enrichedData.type || 'unknown';
            if (enrichedData.subject) {
                typeDisplay += ` (Subject: ${enrichedData.subject})`;
            }
            if (enrichedData.category) {
                typeDisplay += ` [Category: ${enrichedData.category}]`;
            }
            if (enrichedData.meaning) {
                typeDisplay += ` {Meaning: ${enrichedData.meaning}}`;
            }
            if (enrichedData.predicate_nominal) {
                typeDisplay += ` <Predicate: ${enrichedData.predicate_nominal}>`;
            }

            outputLines.push(
                `${connector} Enriched String ${index + 1} [${typeDisplay}]: "${enrichedData.enrichedString}"`,
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
        outputLines.push('═'.repeat(100));
        outputLines.push('Version2 Analysis: Subject, Category, Data_Meaning, Predicate_Nominal (Educational Data Semantics)');
        outputLines.push('');

        // Output accumulated string all at once
        return outputLines.join('\n');
    };

    return { prettyPrintAtomicExpansion };
};

module.exports = moduleFunction;