'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

/**
 * Pure Intelligence Semantic Analyzer
 * Implements the SemanticAnalyzer interface for hierarchical LLM-based semantic analysis
 *
 * Uses a three-step hierarchical approach: Domain → Entity → Element matching
 * with caching for efficiency and improved accuracy.
 *
 * @interface SemanticAnalyzer
 * @property {function(Object): Promise<Array>} extractAtomicFactsAndGenerateEmbeddings
 * @property {function(Array): Promise<Array>} scoreDistanceResults
 * @property {function(): string} getAnalyzerType - Returns 'pureIntelligence'
 * @property {function(): string} getVersion - Returns version identifier
 * @property {function(): function} getPrettyPrintFunction - Returns pretty print function
 */

class PureIntelligenceAnalyzer {
    constructor(args = {}) {
        const { xLog, getConfig } = process.global;
        this.xLog = xLog;
        this.moduleConfig = getConfig(moduleName);

        // Load sub-modules following polyArch2 principles
        // Create hierarchicalMatcher once and pass to modules that need it
        this.hierarchicalMatcher = require('./lib/hierarchical-matcher')();
        this.processIntelligenceModule = require('./lib/process-intelligence-vectors')({
            hierarchicalMatcher: this.hierarchicalMatcher
        });
        this.scoreResultsModule = require('./lib/score-intelligence-results')({
            hierarchicalMatcher: this.hierarchicalMatcher
        });

        this.xLog.verbose(`Initialized ${this.getAnalyzerType()} analyzer v${this.getVersion()} (STUB)`);
    }

    // ---------------------------------------------------------------------
    // Interface Implementation

    /**
     * Process intelligence vectors using hierarchical matching
     * @param {Object} args - Processing arguments
     * @returns {Promise<Array>} Array of generated intelligence vectors
     */
    async extractAtomicFactsAndGenerateEmbeddings(args) {
        return await this.processIntelligenceModule.extractIntelligenceAndGenerateEmbeddings(args);
    }

    /**
     * Score distance results using hierarchical intelligence matching
     * @param {Array} args - Scoring arguments
     * @returns {Promise<Array>} Array of scored results with hierarchical analysis
     */
    async scoreDistanceResults(args) {
        return await this.scoreResultsModule.scoreDistanceResults(args);
    }

    /**
     * Get analyzer type identifier
     * @returns {string} 'pureIntelligence'
     */
    getAnalyzerType() {
        return 'pureIntelligence';
    }

    /**
     * Get version identifier
     * @returns {string} Version string
     */
    getVersion() {
        return '1.0.0-stub';
    }

    /**
     * Get pretty print function for hierarchical match display
     * @returns {function} Pretty print function from version-specific implementation
     */
    getPrettyPrintFunction() {
        return this.hierarchicalMatcher.prettyPrintHierarchicalMatch || null;
    }

    // ---------------------------------------------------------------------
    // Additional pure-intelligence-specific interface methods

    /**
     * Get hierarchical matcher for direct access
     * @returns {Object} Hierarchical matcher module
     */
    getHierarchicalMatcher() {
        return this.hierarchicalMatcher;
    }

    /**
     * Get scoring method for version-specific scoring
     * @returns {function} Scoring method from current version
     */
    getScoringMethod() {
        return this.hierarchicalMatcher.scoringMethod || null;
    }
}

// =====================================================================
// MODULE EXPORTS
// =====================================================================

module.exports = PureIntelligenceAnalyzer;
