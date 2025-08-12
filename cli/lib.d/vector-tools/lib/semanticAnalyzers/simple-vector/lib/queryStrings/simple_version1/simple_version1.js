'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = function(args = {}) {
    const { xLog, getConfig } = process.global;
    
    // ===================================================================================
    
    /**
     * Transform query strings for better search results
     * @param {string} value - The original query string
     * @returns {string} - Processed query string optimized for embedding search
     */
    const processQueryString = (value) => {
        if (!value) return '';
        
        // Apply the same transformations as we do for XPath fields
        // Step 1: Replace slashes with spaces
        let processed = value.replace(/\//g, ' ');
        
        // Step 2: Split words on camel case
        processed = processed.replace(/([a-z])([A-Z])/g, '$1 $2');
        
        // Step 3: Remove leading 'x' or 'X' characters from each word
        processed = processed.split(' ')
            .map(word => word.replace(/^[xX](?=[a-zA-Z])/g, ''))
            .join(' ');
        
        return processed;
    };

    // ===================================================================================
    
    /**
     * Score distance results for simple vector search
     * Simple scoring where score equals distance (lower distance = better match)
     * @param {Array} rawResults - Array of results with distance values
     * @param {Object} options - Scoring options (unused in simple vector but kept for interface consistency)
     * @returns {Array} Array of scored results
     */
    const scoringMethod = (rawResults, options = {}) => {
        // For simple-vector, score equals distance (no complex composite scoring)
        const scoredResults = rawResults.map((result, index) => ({
            rank: index + 1,
            refId: result.refId,
            distance: result.distance,
            score: result.distance, // Simple scoring: score = distance
            record: result.record
        }));

        xLog.verbose(`Scored ${scoredResults.length} matches using simple distance scoring`);
        xLog.verbose(`Simple vector scoring: score = distance (lower is better)`);

        return scoredResults;
    };
    
    // ===================================================================================
    
    return { processQueryString, scoringMethod };
};

module.exports = moduleFunction;