#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

/**
 * Hierarchical Orchestrator
 *
 * Coordinates the 3-step hierarchical LLM matching process:
 * 1. Domain Classification (broad categorization)
 * 2. Entity Selection (narrow to entity type)
 * 3. Element Matching (specific element match)
 */

const moduleFunction = function(args = {}) {
    const { xLog, getConfig } = process.global;
    const { openai, database } = args;

    const qt = require('qtools-functional-library');

    // Load the three processing modules
    const DomainClassifier = require('./domain-classifier/domain-classifier');
    const EntitySelector = require('./entity-selector/entity-selector');
    const ElementMatcher = require('./element-matcher/element-matcher');

    // Initialize sub-modules
    const domainClassifier = DomainClassifier({ openai, database });
    const entitySelector = EntitySelector({ openai, database });
    const elementMatcher = ElementMatcher({ openai, database });

    // ===================================================================================
    // calculateConfidence - Calculate overall match confidence
    // ===================================================================================

    const calculateConfidence = function(domain, entity, elementMatch) {
        // For now, use the element match confidence as the overall confidence
        // since the LLM provides detailed analysis at that level
        return elementMatch.confidence || 0;
    };

    // ===================================================================================
    // performHierarchicalMatch - Main orchestration function
    // ===================================================================================

    const performHierarchicalMatch = function(sifObject, callback) {
        const startTime = Date.now();

        xLog.status('\n🔄 Performing Hierarchical Matching (3-step LLM process)...');
        xLog.verbose('=' .repeat(50));

        // Log the SIF element context
        xLog.verbose('SIF Element:');
        xLog.verbose(`  Name: ${sifObject.ElementName}`);
        xLog.verbose(`  XPath: ${sifObject.XPath}`);
        xLog.verbose(`  Type: ${sifObject.Type || 'N/A'}`);

        // Step 1: Domain Classification
        xLog.status('\nStep 1/3: Domain Classification...');
        domainClassifier.classifyDomain(sifObject.XPath, (err, domain) => {
            if (err) {
                xLog.error(`Domain classification failed: ${err.message}`);
                callback(err);
                return;
            }

            xLog.status(`  → Domain: ${domain}`);

            // Step 2: Entity Selection
            xLog.status('\nStep 2/3: Entity Selection...');
            const entityContext = {
                xpath: sifObject.XPath,
                domain: domain,
                elementName: sifObject.ElementName
            };

            entitySelector.selectEntity(entityContext, (err, entity) => {
                if (err) {
                    xLog.error(`Entity selection failed: ${err.message}`);
                    callback(err);
                    return;
                }

                xLog.status(`  → Entity: ${entity}`);

                // Step 3: Element Matching
                xLog.status('\nStep 3/3: Element Matching...');
                const elementContext = {
                    sifElement: sifObject,
                    domain: domain,
                    entity: entity
                };

                elementMatcher.matchElement(elementContext, (err, elementMatch) => {
                    if (err) {
                        xLog.error(`Element matching failed: ${err.message}`);
                        callback(err);
                        return;
                    }

                    xLog.status(`  → CEDS Element: ${elementMatch.cedsElement}`);
                    xLog.status(`  → Confidence: ${elementMatch.confidence}`);

                    // Calculate overall confidence
                    const overallConfidence = calculateConfidence(domain, entity, elementMatch);

                    // Build final result
                    const result = {
                        // Domain and entity from progressive narrowing
                        domain: domain,
                        entity: entity,

                        // Element match details
                        elementMatch: elementMatch,

                        // Overall metrics
                        confidence: overallConfidence,
                        hierarchicalPath: `${domain} → ${entity} → ${elementMatch.cedsElement}`,
                        processingTime: Date.now() - startTime,

                        // Metadata
                        timestamp: new Date().toISOString(),
                        method: 'hierarchical_llm'
                    };

                    xLog.status(`\n✅ Hierarchical matching complete in ${result.processingTime}ms`);
                    xLog.status(`   Path: ${result.hierarchicalPath}`);

                    callback(null, result);
                });
            });
        });
    };

    // ===================================================================================

    return {
        performHierarchicalMatch
    };
};

module.exports = moduleFunction;
