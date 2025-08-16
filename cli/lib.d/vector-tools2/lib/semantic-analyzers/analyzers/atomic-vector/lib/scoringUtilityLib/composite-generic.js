#!/usr/bin/env node
'use strict';
// Suppress punycode deprecation warning
process.noDeprecation = true;

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

// const qt = require('qtools-functional-library'); //also exposes qtLog(); qt.help({printOutput:true, queryString:'.*', sendJson:false});

const os = require('os');
const path = require('path');
const fs = require('fs');

console.log(`HELLO FROM ${__dirname}/${moduleName}`);

//START OF moduleFunction() ============================================================
const moduleFunction = ({ moduleName } = {}) => ({ unused }={}) => {
	const { xLog, getConfig, rawConfig, commandLineParameters, projectRoot } = process.global;
	const localConfig = getConfig(moduleName); //moduleName is closure

    /**
     * Score and rank aggregated vector search matches using composite scoring algorithm
     * @param {Map} allMatches - Map of sourceRefId -> match data with distances, factTypes, etc.
     * @param {Object} options - Scoring options
     * @param {number} options.distanceWeight - Weight factor for distance penalty (default: 0.1)
     * @returns {Array} Array of scored and sorted results
     */
    const scoringMethod = (allMatches, options = {}) => {
        const { distanceWeight = 0.1 } = options;

        // Score and rank aggregated results
        const scoredResults = Array.from(allMatches.values()).map(match => {
            // Primary score: number of unique fact types matched
            const uniqueFactTypesCount = match.factTypes.size;

            // Secondary score: average distance (lower is better)
            const avgDistance = match.distances.reduce((a, b) => a + b, 0) / match.distances.length;

            // Composite score: more matched types is better, lower distance is better
            const compositeScore = uniqueFactTypesCount - (avgDistance * distanceWeight);

            return {
                refId: match.refId,
                score: compositeScore,
                distance: avgDistance,
                factTypesMatched: uniqueFactTypesCount,
                totalMatches: match.distances.length
            };
        });

        // Sort by composite score (higher is better)
        scoredResults.sort((a, b) => b.score - a.score);

        xLog.verbose(`Scored ${scoredResults.length} matches using composite scoring algorithm`);
        xLog.verbose(`Distance weight factor: ${distanceWeight}`);

        return scoredResults;
    };
    
    
	return { scoringMethod };
};

//END OF moduleFunction() ============================================================

	module.exports = moduleFunction({ moduleName });
