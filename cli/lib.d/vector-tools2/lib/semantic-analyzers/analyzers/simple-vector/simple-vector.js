'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

/**
 * Simple Vector Semantic Analyzer
 * Implements the SemanticAnalyzer interface for basic vector-based semantic analysis
 * 
 * @interface SemanticAnalyzer
 * @property {function(Object): Object} extractAtomicFactsAndGenerateEmbeddings
 * @property {function(Array): Array} scoreDistanceResults
 * @property {function(): string} getAnalyzerType - Returns 'simple'
 * @property {function(): string} getVersion - Returns version identifier
 */

class SimpleVectorAnalyzer {
    constructor(args = {}) {
        const { xLog, getConfig } = process.global;
        this.xLog = xLog;
        this.moduleConfig = getConfig(moduleName);
        
        // Load sub-modules following polyArch2 principles
        this.processFactsModule = require('./lib/process-facts')();
        this.scoreResultsModule = require('./lib/score-results')();
        
        this.xLog.verbose(`Initialized ${this.getAnalyzerType()} vector analyzer v${this.getVersion()}`);
    }

    // ---------------------------------------------------------------------
    // Interface Implementation
    
    /**
     * Process facts into database vectors for simple (non-atomic) analysis
     * @param {Object} args - Processing arguments
     * @returns {Promise<Array>} Array of generated vectors
     */
    async extractAtomicFactsAndGenerateEmbeddings(args) {
        return await this.processFactsModule.extractAtomicFactsAndGenerateEmbeddings(args);
    }

    /**
     * Score distance results from vector search
     * @param {Array} args - Scoring arguments
     * @returns {Promise<Array>} Array of scored results
     */
    async scoreDistanceResults(args) {
        return await this.scoreResultsModule.scoreDistanceResults(args);
    }

    /**
     * Get analyzer type identifier
     * @returns {string} 'simple'
     */
    getAnalyzerType() {
        return 'simple';
    }

    /**
     * Get version identifier
     * @returns {string} Version string
     */
    getVersion() {
        return '2.0.0';
    }

    /**
     * Optional pretty print function for results display
     * @returns {function} Pretty print function
     */
    getPrettyPrintFunction() {
        return this.scoreResultsModule.prettyPrintResults || null;
    }
}

// =====================================================================
// MODULE EXPORTS
// =====================================================================

module.exports = SimpleVectorAnalyzer;