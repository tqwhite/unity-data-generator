'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = function(args = {}) {
    const { xLog, getConfig } = process.global;

    // Load sub-modules
    const { processFactsIntoDatabaseVectors } = require('./lib/process-facts-into-database-vectors')();
    const { scoreDistanceResults } = require('./lib/score-distance-results')();

    // Return the interface
    return {
        processFactsIntoDatabaseVectors,
        scoreDistanceResults
    };
};

module.exports = moduleFunction;