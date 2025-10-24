'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = function(args = {}) {
    // Get from process.global instead of args
    const { xLog, getConfig } = process.global;

    const qt = require('qtools-functional-library');

    // ===================================================================================
    // format - Format matches to match vectorTools2 output structure
    // ===================================================================================

    const format = function(args) {
        const { sifObject, cedsMatches, resultCount = 5, mode = 'pureIntelligence' } = args;

        xLog.verbose('\nFormatting results for compatibility with vectorTools2...');

        // Limit results to requested count
        const limitedMatches = cedsMatches.slice(0, resultCount);

        // Format each match to match expected structure
        const formattedResults = limitedMatches.map((match, index) => {
            return {
                // Core fields expected by unityCedsMatch
                rank: index + 1,
                refId: match.cedsRefId,
                cedsRefId: match.cedsRefId,
                cedsElement: match.cedsElement,

                // Distance/scoring fields
                distance: match.distance,
                score: match.score,
                confidence: match.confidence,

                // Intelligence-specific fields
                reasoning: match.reasoning,
                hierarchicalPath: match.hierarchicalPath,
                domain: match.domain,
                entity: match.entity,

                // Mode identification
                semanticAnalysisMode: mode,

                // Source information
                sifRefId: sifObject.refId,
                sifElementName: sifObject.ElementName,
                sifXPath: sifObject.XPath,

                // Compatibility with vectorTools2 format
                factTypesMatched: ['hierarchical_intelligence'],
                totalMatches: 1,

                // Record structure for display
                record: {
                    refId: match.cedsRefId,
                    ElementName: match.cedsElement,
                    Definition: `Hierarchical match: ${match.reasoning}`,
                    Description: match.reasoning,
                    XPath: match.hierarchicalPath
                }
            };
        });

        return formattedResults;
    };

    // ===================================================================================
    // formatForDatabase - Format for unityCedsMatches table
    // ===================================================================================

    const formatForDatabase = function(args) {
        const { sifObject, cedsMatches, semanticAnalysisMode } = args;

        return cedsMatches.map((match, index) => {
            return {
                sifRefId: sifObject.refId,
                sifElementName: sifObject.ElementName,
                sifXPath: sifObject.XPath,
                cedsRefId: match.cedsRefId,
                cedsElementName: match.cedsElement,
                distance: match.distance,
                score: match.score,
                confidence: match.confidence,
                reasoning: match.reasoning,
                semanticAnalysisMode: semanticAnalysisMode,
                matchRank: index + 1,
                hierarchicalPath: match.hierarchicalPath,
                domain: match.domain,
                entity: match.entity
            };
        });
    };

    // ===================================================================================
    // formatAsJSON - Format as JSON for external consumption
    // ===================================================================================

    const formatAsJSON = function(args) {
        const { sifObject, cedsMatches, resultCount = 5 } = args;

        const output = {
            queryType: 'hierarchical_intelligence',
            sifInput: {
                refId: sifObject.refId,
                elementName: sifObject.ElementName,
                xPath: sifObject.XPath,
                type: sifObject.Type,
                mandatory: sifObject.Mandatory
            },
            resultCount: Math.min(resultCount, cedsMatches.length),
            results: format(args)
        };

        return JSON.stringify(output, null, 2);
    };

    // ===================================================================================
    // formatAsVectorToolsCompatible - Match exact vectorTools2 output format
    // ===================================================================================

    const formatAsVectorToolsCompatible = function(args) {
        const { sifObject, cedsMatches, resultCount = 5 } = args;

        // Match the exact format from vectorTools2
        const results = cedsMatches.slice(0, resultCount).map((match, index) => {
            return {
                rank: index + 1,
                distance: match.distance,
                refId: match.cedsRefId,
                content: `${match.cedsElement} | ${match.hierarchicalPath}`
            };
        });

        return {
            queryString: sifObject.ElementName,
            resultCount: results.length,
            results: results
        };
    };

    // ===================================================================================

    return {
        format,
        formatForDatabase,
        formatAsJSON,
        formatAsVectorToolsCompatible
    };
};

module.exports = moduleFunction;