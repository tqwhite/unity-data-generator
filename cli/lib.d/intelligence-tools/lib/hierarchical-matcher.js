'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = function(args = {}) {
    // Get from process.global instead of args
    const { xLog, getConfig } = process.global;
    const { database } = args;

    const qt = require('qtools-functional-library');
    const OpenAI = require('openai');

    // Get configuration
    const moduleConfig = getConfig('intelligenceTools') || {};

    // Initialize OpenAI client
    let openai = null;
    if (moduleConfig.openAiApiKey) {
        openai = new OpenAI({ apiKey: moduleConfig.openAiApiKey });
    } else {
        xLog.status('⚠️  OpenAI API key not found in config - hierarchical matching will fail');
    }

    // Load the hierarchical orchestrator
    const HierarchicalOrchestrator = require('./processing/hierarchical-orchestrator');

    // ===================================================================================
    // match - Perform hierarchical LLM matching
    // ===================================================================================

    const match = function(sifObject, sessionHeader, callback) {
        // Handle optional sessionHeader parameter
        if (typeof sessionHeader === 'function') {
            callback = sessionHeader;
            sessionHeader = '';
        }

        // Validate inputs
        if (!openai) {
            callback(new Error('OpenAI client not initialized - check API key in config'));
            return;
        }

        if (!database) {
            callback(new Error('Database not provided - required for CEDS element lookup'));
            return;
        }

        // Create orchestrator instance
        const orchestrator = HierarchicalOrchestrator({ openai, database });

        // Perform the 3-step hierarchical match
        orchestrator.performHierarchicalMatch(sifObject, sessionHeader, (err, result) => {
            if (err) {
                xLog.error(`Hierarchical matching failed: ${err.message}`);
                callback(err);
                return;
            }

            // Format result as array of matches for compatibility with vectorTools2
            // The orchestrator returns a single best match with domain → entity → element path
            const matches = [{
                cedsRefId: result.elementMatch.cedsRefId,
                cedsElement: result.elementMatch.cedsElement,
                cedsDefinition: result.elementMatch.cedsDefinition,
                distance: result.elementMatch.distance,
                score: result.elementMatch.score,
                confidence: result.confidence,
                reasoning: result.elementMatch.reasoning,
                domain: result.domain,
                entity: result.entity,
                hierarchicalPath: result.hierarchicalPath,
                processingTime: result.processingTime,
                timestamp: result.timestamp,
                method: result.method
            }];

            callback(null, matches);
        });
    };

    // ===================================================================================
    // matchWithCEDSDatabase - Match using actual CEDS elements from database
    // ===================================================================================

    const matchWithCEDSDatabase = function(sifObject, cedsElements, callback) {
        // The hierarchical approach fetches CEDS elements internally during
        // the element matching step, so we don't need to use the provided
        // cedsElements. Just delegate to the standard match function.
        match(sifObject, callback);
    };

    // ===================================================================================

    return {
        match,
        matchWithCEDSDatabase
    };
};

module.exports = moduleFunction;