'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = function(args = {}) {
    const { xLog, getConfig } = process.global;

    /**
     * Pretty print atomic expansion analysis for version3 verboseData structure
     * Version3 uses: canonical tags, evidence, confidence, semantic verdicts
     */
    const prettyPrintAtomicExpansion = (verboseData) => {
        if (!verboseData) return '';

        // Accumulate output into a string array
        const outputLines = [];

        outputLines.push('\n╔═══════════════════════════════════════════════════════════════════════════════════════════════════════╗');
        outputLines.push('║                                  VERSION3 SEMANTIC ANALYSIS                                          ║');
        outputLines.push('║                            Canonical Tags • Evidence • Confidence                                    ║');
        outputLines.push('╚═══════════════════════════════════════════════════════════════════════════════════════════════════════╝');
        outputLines.push(`├─ Original Query: "${verboseData.originalQuery}"`);
        outputLines.push('│');

        verboseData.enrichedStrings.forEach((enrichedData, index) => {
            const isLast = index === verboseData.enrichedStrings.length - 1;
            const connector = isLast ? '└─' : '├─';

            // Version3 specific formatting - show canonical tags and evidence
            let typeDisplay = enrichedData.type || 'processed_query';
            
            // Display canonical tags if available
            if (enrichedData.canonical) {
                const canonicalTags = [];
                Object.entries(enrichedData.canonical).forEach(([key, value]) => {
                    if (value && value !== 'unknown') {
                        canonicalTags.push(`${key}=${value}`);
                    }
                });
                if (canonicalTags.length > 0) {
                    typeDisplay += ` {${canonicalTags.join(', ')}}`;
                }
            }

            // Display confidence if available
            if (enrichedData.confidence !== undefined) {
                typeDisplay += ` [conf: ${enrichedData.confidence.toFixed(2)}]`;
            }

            // Display evidence sources if available
            if (enrichedData.evidence?.sources && enrichedData.evidence.sources.length > 0) {
                typeDisplay += ` (sources: ${enrichedData.evidence.sources.join(', ')})`;
            }

            outputLines.push(
                `${connector} Enriched String ${index + 1} [${typeDisplay}]: "${enrichedData.enrichedString}"`,
            );

            // Show evidence details for version3
            if (enrichedData.evidence) {
                const evidenceConnector = isLast ? '   ' : '│  ';
                const evidenceItems = [];
                
                Object.entries(enrichedData.evidence).forEach(([key, value]) => {
                    if (key !== 'sources' && value && (typeof value === 'string' ? value.trim() : true)) {
                        if (Array.isArray(value)) {
                            if (value.length > 0) {
                                evidenceItems.push(`${key}: [${value.join(', ')}]`);
                            }
                        } else {
                            evidenceItems.push(`${key}: "${value}"`);
                        }
                    }
                });

                if (evidenceItems.length > 0) {
                    outputLines.push(`${evidenceConnector} ├─ Evidence: ${evidenceItems.join(' | ')}`);
                }
            }

            if (enrichedData.matches && enrichedData.matches.length > 0) {
                enrichedData.matches.forEach((match, matchIndex) => {
                    const isLastMatch = matchIndex === enrichedData.matches.length - 1;
                    const matchConnector = isLast ? '   ' : '│  ';
                    const matchPrefix = isLastMatch ? '└─' : '├─';

                    const distance = match.distance ? match.distance.toFixed(4) : 'N/A';
                    let matchDescription = `[${distance}] RefID: ${match.sourceRefId}`;

                    // Add semantic verdict info for version3
                    if (match.verdict) {
                        matchDescription += ` {${match.verdict}}`;
                        if (match.relation) {
                            matchDescription += ` (${match.relation})`;
                        }
                        if (match.semanticScore !== undefined) {
                            matchDescription += ` [sem: ${match.semanticScore.toFixed(3)}]`;
                        }
                    }

                    // Add fact details for atomic results
                    if (match.factType && match.factText) {
                        matchDescription += ` - ${match.factType}: "${match.factText}"`;
                    }

                    // Add reasoning if available
                    if (match.reasons && match.reasons.length > 0) {
                        matchDescription += ` (reasons: ${match.reasons.join(', ')})`;
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
        outputLines.push('Version3 Analysis: Canonical Tags + Evidence-Based Semantic Matching + Confidence Scoring');
        outputLines.push('Verdicts: SAME | RELATED | DIFFERENT | INSUFFICIENT_EVIDENCE');
        outputLines.push('Canonical Tags: entity, attribute, role, value_type + evidence tracking');
        outputLines.push('');

        // Output accumulated string all at once
        return outputLines.join('\n');
    };

    return { prettyPrintAtomicExpansion };
};

module.exports = moduleFunction;