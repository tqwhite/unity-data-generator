'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');
const path = require('path');

const moduleFunction = function(args = {}) {
    const { xLog, getConfig } = process.global;

    const loadSemanticAnalyzer = (analyzerName) => {
        const validAnalyzers = ['simpleVector', 'atomicVector'];

        // Map command line names to directory names
        const analyzerMap = {
            'simpleVector': 'simple-vector',
            'atomicVector': 'atomic-vector'
        };

        if (!validAnalyzers.includes(analyzerName)) {
            xLog.error(`Invalid semantic analyzer: ${analyzerName}`);
            xLog.status(`Valid options: ${validAnalyzers.join(', ')}`);
            xLog.status(`Defaulting to simpleVector`);
            analyzerName = 'simpleVector';
        }

        const analyzerDir = analyzerMap[analyzerName];
        const analyzerPath = path.join(__dirname, analyzerDir, `${analyzerDir}.js`);

        try {
            const analyzerModule = require(analyzerPath);
            const analyzer = analyzerModule();
            xLog.verbose(`Loaded ${analyzerName} semantic analyzer`);

            // Validate interface
            if (typeof analyzer.generateVectors !== 'function' || 
                typeof analyzer.scoreDistanceResults !== 'function') {
                throw new Error(`Invalid analyzer interface in ${analyzerName}`);
            }

            return analyzer;
        } catch (err) {
            xLog.error(`Failed to load ${analyzerName}: ${err.message}`);

            // Fallback to simple-vector
            if (analyzerName !== 'simpleVector') {
                xLog.status(`Falling back to simpleVector`);
                return require('./simple-vector/simple-vector.js')();
            }

            throw err;
        }
    };

    return { loadSemanticAnalyzer };
};

module.exports = moduleFunction();