'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

/**
 * Atomic Vector Semantic Analyzer
 * Implements the SemanticAnalyzer interface for atomic fact-based semantic analysis
 * 
 * This analyzer decomposes definitions into atomic semantic components and generates
 * multiple embeddings per source record, enabling more granular semantic matching.
 * 
 * @interface SemanticAnalyzer
 * @property {function(Object): Promise<Array>} extractAtomicFactsAndGenerateEmbeddings
 * @property {function(Array): Promise<Array>} scoreDistanceResults
 * @property {function(): string} getAnalyzerType - Returns 'atomic'
 * @property {function(): string} getVersion - Returns version identifier
 * @property {function(): function} getPrettyPrintFunction - Returns pretty print function
 */

class AtomicVectorAnalyzer {
    constructor(args = {}) {
        const { xLog, getConfig } = process.global;
        this.xLog = xLog;
        this.moduleConfig = getConfig(moduleName);
        
        // Load sub-modules following polyArch2 principles
        // Create atomicFactExtractor once and pass to modules that need it
        this.atomicFactExtractor = require('./lib/atomic-fact-extractor')();
        this.processFactsModule = require('./lib/process-facts-into-database-vectors')({
            atomicFactExtractor: this.atomicFactExtractor
        });
        this.scoreResultsModule = require('./lib/score-distance-results')({
            atomicFactExtractor: this.atomicFactExtractor
        });
        
        this.xLog.verbose(`Initialized ${this.getAnalyzerType()} vector analyzer v${this.getVersion()}`);
    }

    // ---------------------------------------------------------------------
    // Interface Implementation
    
    /**
     * Process facts into database vectors using atomic decomposition
     * @param {Object} args - Processing arguments
     * @returns {Promise<Array>} Array of generated atomic vectors
     */
    async extractAtomicFactsAndGenerateEmbeddings(args) {
        return await this.processFactsModule.extractAtomicFactsAndGenerateEmbeddings(args);
    }

    /**
     * Score distance results from vector search using atomic fact matching
     * @param {Array} args - Scoring arguments
     * @returns {Promise<Array>} Array of scored results with atomic decomposition
     */
    async scoreDistanceResults(args) {
        return await this.scoreResultsModule.scoreDistanceResults(args);
    }

    /**
     * Get analyzer type identifier
     * @returns {string} 'atomic'
     */
    getAnalyzerType() {
        return 'atomic';
    }

    /**
     * Get version identifier
     * @returns {string} Version string
     */
    getVersion() {
        return '2.0.0';
    }

    /**
     * Get pretty print function for atomic fact display
     * @returns {function} Pretty print function from version-specific implementation
     */
    getPrettyPrintFunction() {
        return this.atomicFactExtractor.prettyPrintAtomicExpansion || null;
    }

    // ---------------------------------------------------------------------
    // Additional atomic-specific interface methods
    
    /**
     * Get atomic fact extractor for direct access
     * @returns {Object} Atomic fact extractor module
     */
    getAtomicFactExtractor() {
        return this.atomicFactExtractor;
    }

    /**
     * Get scoring method for version-specific scoring
     * @returns {function} Scoring method from current version
     */
    getScoringMethod() {
        return this.atomicFactExtractor.scoringMethod || null;
    }
}

// =====================================================================
// MODULE EXPORTS
// =====================================================================

module.exports = AtomicVectorAnalyzer;