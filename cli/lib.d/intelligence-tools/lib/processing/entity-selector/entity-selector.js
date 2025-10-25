#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

/**
 * Entity Selector - Step 2 of Hierarchical LLM Matching
 *
 * Selects the appropriate CEDS entity within a domain using LLM analysis
 * of xpath context and element information.
 */

const moduleFunction = function(args = {}) {
    const { xLog, getConfig } = process.global;
    const { openai, database } = args;

    const qt = require('qtools-functional-library');

    // ===================================================================================
    // Configuration
    // ===================================================================================

    const moduleConfig = getConfig('intelligenceTools') || {};
    const llmModel = moduleConfig.llmModels?.entity || 'gpt-3.5-turbo';
    const temperature = moduleConfig.temperature || 0;

    // Entity definitions cache
    let entitiesByDomain = null;

    // ===================================================================================
    // loadEntityDefinitions - Load CEDS entities from database
    // ===================================================================================

    const loadEntityDefinitions = function(callback) {
        if (entitiesByDomain) {
            callback(null, entitiesByDomain);
            return;
        }

        if (!database) {
            callback(new Error('Database not provided - required for entity definitions'));
            return;
        }

        database.getTable('_CEDSElements', { suppressStatementLog: true }, (err, table) => {
            if (err) {
                callback(new Error(`Failed to load entities from database: ${err.message}`));
                return;
            }

            const sql = `
                SELECT DISTINCT Domain, Entity
                FROM <!tableName!>
                WHERE Domain IS NOT NULL AND Entity IS NOT NULL
                ORDER BY Domain, Entity
            `;

            table.getData(sql, { suppressStatementLog: true }, (err, results) => {
                if (err) {
                    callback(new Error(`Database query failed: ${err.message}`));
                    return;
                }

                if (!results || results.length === 0) {
                    callback(new Error('No entities found in database - CEDS elements table may be empty'));
                    return;
                }

                // Group entities by domain
                entitiesByDomain = {};
                results.forEach(row => {
                    if (!entitiesByDomain[row.Domain]) {
                        entitiesByDomain[row.Domain] = [];
                    }
                    if (!entitiesByDomain[row.Domain].includes(row.Entity)) {
                        entitiesByDomain[row.Domain].push(row.Entity);
                    }
                });

                xLog.verbose(`Loaded entities for ${Object.keys(entitiesByDomain).length} domains`);
                callback(null, entitiesByDomain);
            });
        });
    };

    // ===================================================================================
    // getEntitiesForDomain - Get list of entities for a specific domain
    // ===================================================================================

    const getEntitiesForDomain = function(domain, callback) {
        loadEntityDefinitions((err, definitions) => {
            if (err) {
                callback(err);
                return;
            }

            const entities = definitions[domain] || [];
            callback(null, entities);
        });
    };

    // ===================================================================================
    // buildEntityPrompt - Build LLM prompt for entity selection
    // ===================================================================================

    const buildEntityPrompt = function(context, entities) {
        const { xpath, domain, elementName } = context;

        return `You are a CEDS (Common Education Data Standards) entity selector.

Within the ${domain} domain, identify the correct entity type for this SIF element.

SIF Element:
- XPath: ${xpath}
- Element Name: ${elementName}
- Domain: ${domain}

Available entities in ${domain} domain:
${entities.map(e => `- ${e}`).join('\n')}

Analyze the xpath structure to determine the entity type:
- /xStudents/xStudent/* → K12 Student
- /xStaffs/xStaff/* → K12 Staff
- /xSchools/xSchool/* → K12 School
- /Assessments/Assessment/* → Assessment
- /xCourses/xCourse/* → K12 Course

Return ONLY the entity name from the list above, nothing else.`;
    };

    // Pattern-based fallbacks removed - pure intelligence approach only

    // ===================================================================================
    // askLLMForEntity - Query OpenAI for entity selection
    // ===================================================================================

    const askLLMForEntity = function(context, entities, callback) {
        if (!openai) {
            callback(new Error('OpenAI client not provided'));
            return;
        }

        const prompt = buildEntityPrompt(context, entities);

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
                const entity = response.choices[0].message.content.trim();

                // Validate entity - fail hard if invalid (pure intelligence approach)
                if (!entities.includes(entity)) {
                    const error = new Error(`LLM returned invalid entity: "${entity}". Valid entities for ${context.domain}: ${entities.join(', ')}`);
                    callback(error);
                    return;
                }

                callback(null, entity);
            })
            .catch((error) => {
                xLog.error(`OpenAI API error: ${error.message}`);
                callback(error);
            });
    };

    // ===================================================================================
    // selectEntity - Main function: Select entity within domain
    // ===================================================================================

    const selectEntity = function(context, callback) {
        const { domain } = context;

        xLog.verbose(`Selecting entity for xpath: ${context.xpath} in domain: ${domain}`);

        // Load entities for this domain
        getEntitiesForDomain(domain, (err, entities) => {
            if (err || !entities || entities.length === 0) {
                const error = new Error(`No entities found in database for domain: ${domain}`);
                callback(error);
                return;
            }

            // Ask LLM
            askLLMForEntity(context, entities, (err, entity) => {
                if (err) {
                    callback(err);
                    return;
                }

                xLog.verbose(`Selected entity: ${entity}`);
                callback(null, entity);
            });
        });
    };

    // ===================================================================================

    return {
        selectEntity,
        getEntitiesForDomain,
        buildEntityPrompt  // Exposed for testing
    };
};

module.exports = moduleFunction;
