'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = function(args = {}) {
    const { xLog, getConfig } = process.global;

    // Load sub-modules
    const { generateVectors } = require('./lib/generate-vectors')();
    const { scoreDistanceResults } = require('./lib/score-distance-results')();
    const { prettyPrintAtomicExpansion } = require('./lib/atomic-fact-extractor')();

    // Return the interface including version-specific pretty-print
    return {
        generateVectors,
        scoreDistanceResults,
        getPrettyPrintFunction: () => prettyPrintAtomicExpansion
    };
};

module.exports = moduleFunction;