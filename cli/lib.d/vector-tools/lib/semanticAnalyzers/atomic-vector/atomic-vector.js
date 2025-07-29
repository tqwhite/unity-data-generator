'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = function(args = {}) {
    const { xLog, getConfig } = process.global;

    // Load sub-modules
    const { generateVectors } = require('./lib/generate-vectors')();
    const { scoreDistanceResults } = require('./lib/score-distance-results')();

    // Return the interface
    return {
        generateVectors,
        scoreDistanceResults
    };
};

module.exports = moduleFunction;