#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

/**
 * Domain Classifier - Step 1 of Hierarchical LLM Matching
 *
 * Classifies SIF xPaths into CEDS domains using LLM with caching
 * for cost-effective progressive narrowing.
 */

const moduleFunction = function(args = {}) {
    const { xLog, getConfig } = process.global;
    const { openai, database } = args;

    const qt = require('qtools-functional-library');

    // ===================================================================================
    // Configuration
    // ===================================================================================

    const moduleConfig = getConfig('intelligenceTools') || {};
    const llmModel = moduleConfig.llmModels?.domain || 'gpt-3.5-turbo';
    const temperature = moduleConfig.temperature || 0;

    // CEDS Domains
    const cedsDomains = [
        'K12',
        'Postsecondary',
        'Workforce',
        'Adult Education',
        'Early Learning',
        'Assessments',
        'Learning Resources'
    ];

    // ===================================================================================
    // extractPattern - Extract cacheable pattern from xPath
    // ===================================================================================

    const extractPattern = function(xpath) {
        // Extract the main entity type from xpath for caching
        // Examples:
        //   /xStudents/xStudent/... -> /xStudents/xStudent/%
        //   /Assessments/Assessment/... -> /Assessments/Assessment/%
        //   /xStaffs/xStaff/... -> /xStaffs/xStaff/%

        const parts = xpath.split('/').filter(x => x);

        if (parts.length === 0) return xpath;

        // Take first 2 meaningful parts (collection and entity type)
        const patternParts = parts.slice(0, Math.min(2, parts.length));

        return '/' + patternParts.join('/') + '/%';
    };

    // ===================================================================================
    // checkCache - Check database for cached domain classification
    // ===================================================================================

    const checkCache = function(xpath, callback) {
        if (!database) {
            callback(null, null);
            return;
        }

        const pattern = extractPattern(xpath);

        database.getTable('domainClassificationCache', { suppressStatementLog: true }, (err, table) => {
            if (err) {
                xLog.verbose(`Cache check failed: ${err.message}`);
                callback(null, null);
                return;
            }

            const sql = `
                SELECT domain, confidence
                FROM <!tableName!>
                WHERE xpathPattern = ?
                ORDER BY confidence DESC
                LIMIT 1
            `;

            table.getData(sql, {
                suppressStatementLog: true,
                params: [pattern]
            }, (err, results) => {
                if (err || !results || results.length === 0) {
                    callback(null, null);
                    return;
                }

                xLog.verbose(`Cache hit for pattern: ${pattern} -> ${results[0].domain}`);
                callback(null, results[0]);
            });
        });
    };

    // ===================================================================================
    // saveToCache - Save domain classification to cache
    // ===================================================================================

    const saveToCache = function(xpath, domain, confidence, callback) {
        if (!database) {
            callback(null);
            return;
        }

        const pattern = extractPattern(xpath);

        database.getTable('domainClassificationCache', { suppressStatementLog: true }, (err, table) => {
            if (err) {
                xLog.verbose(`Failed to get cache table: ${err.message}`);
                callback(null);
                return;
            }

            const cacheObject = {
                xpathPattern: pattern,
                domain: domain,
                confidence: confidence,
                exampleXPath: xpath,
                lastUsed: new Date().toISOString()
            };

            table.saveObject(cacheObject, { suppressStatementLog: true }, (err, refId) => {
                if (err) {
                    xLog.verbose(`Failed to save to cache: ${err.message}`);
                }
                callback(null);
            });
        });
    };

    // ===================================================================================
    // buildDomainPrompt - Build LLM prompt for domain classification
    // ===================================================================================

    const buildDomainPrompt = function(xpath) {
        return `You are a CEDS (Common Education Data Standards) domain classifier.

Given this xPath from a SIF (Schools Interoperability Framework) object:
${xpath}

Classify it into ONE of these CEDS domains:
- K12: Elementary and secondary education
- Postsecondary: Higher education
- Workforce: Employment and career data
- Adult Education: Adult learning programs
- Early Learning: Pre-K education
- Assessments: Testing and evaluation
- Learning Resources: Educational materials

Consider these patterns:
- xStudent, StudentPersonal, xStudents → K12
- xStaff, StaffPersonal, EmployeePersonal → K12
- xSchool, SchoolInfo → K12
- Assessment*, Test* → Assessments
- Course*, Curriculum* → could be K12, Postsecondary, or Adult Education
- Worker*, Employee* (non-education) → Workforce
- EarlyLearning*, PreK* → Early Learning
- LearningResource*, LearningStandard* → Learning Resources

Return ONLY the domain name, nothing else.`;
    };

    // Pattern-based fallbacks removed - pure intelligence approach only

    // ===================================================================================
    // askLLMForDomain - Query OpenAI for domain classification
    // ===================================================================================

    const askLLMForDomain = function(xpath, callback) {
        if (!openai) {
            callback(new Error('OpenAI client not provided'));
            return;
        }

        const prompt = buildDomainPrompt(xpath);

        const params = {
            model: llmModel,
            messages: [{
                role: 'user',
                content: prompt
            }],
            temperature: temperature,
            max_tokens: 50
        };

        openai.chat.completions.create(params)
            .then((response) => {
                const domain = response.choices[0].message.content.trim();

                // Validate domain - fail hard if invalid (pure intelligence approach)
                if (!cedsDomains.includes(domain)) {
                    const error = new Error(`LLM returned invalid domain: "${domain}". Valid domains: ${cedsDomains.join(', ')}`);
                    callback(error);
                    return;
                }

                callback(null, domain);
            })
            .catch((error) => {
                xLog.error(`OpenAI API error: ${error.message}`);
                callback(error);
            });
    };

    // ===================================================================================
    // classifyDomain - Main function: Classify xpath into CEDS domain
    // ===================================================================================

    const classifyDomain = function(xpath, callback) {
        xLog.verbose(`Classifying domain for xpath: ${xpath}`);

        // Step 1: Check cache
        checkCache(xpath, (cacheErr, cached) => {
            // Continue even if cache fails
            if (!cacheErr && cached && cached.confidence > 0.8) {
                xLog.verbose(`Using cached domain: ${cached.domain}`);
                callback(null, cached.domain);
                return;
            }

            // Step 2: Ask LLM
            askLLMForDomain(xpath, (err, domain) => {
                if (err) {
                    callback(err);
                    return;
                }

                xLog.verbose(`LLM classified domain: ${domain}`);

                // Step 3: Save to cache (high confidence for LLM results)
                // Continue even if cache save fails
                saveToCache(xpath, domain, 0.95, () => {
                    callback(null, domain);
                });
            });
        });
    };

    // ===================================================================================
    // getDomains - Return list of available CEDS domains
    // ===================================================================================

    const getDomains = function() {
        return [...cedsDomains];
    };

    // ===================================================================================

    return {
        classifyDomain,
        getDomains,
        extractPattern,
        buildDomainPrompt  // Exposed for testing
    };
};

module.exports = moduleFunction;
