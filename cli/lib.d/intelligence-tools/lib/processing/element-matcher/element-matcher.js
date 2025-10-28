#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

/**
 * Element Matcher - Step 3 of Hierarchical LLM Matching
 *
 * Performs final detailed matching of SIF elements to specific CEDS elements
 * within the narrowed domain and entity context.
 */

const moduleFunction = function(args = {}) {
    const { xLog, getConfig } = process.global;
    const { openai, database } = args;

    const qt = require('qtools-functional-library');

    // ===================================================================================
    // Configuration
    // ===================================================================================

    const moduleConfig = getConfig('intelligenceTools') || {};
    const llmModel = moduleConfig.llmModels?.element || 'gpt-4';
    const temperature = moduleConfig.temperature || 0;

    // ===================================================================================
    // fetchCEDSElements - Get CEDS elements for domain/entity from database
    // ===================================================================================

    const fetchCEDSElements = function(domain, entity, callback) {
        if (!database) {
            callback(new Error('Database not provided'));
            return;
        }

        database.getTable('_CEDSElements', { suppressStatementLog: true }, (err, table) => {
            if (err) {
                callback(err);
                return;
            }

            const sql = `
                SELECT
                    GlobalID as refId,
                    ElementName,
                    Definition,
                    Domain,
                    Entity,
                    URL as refUrl
                FROM <!tableName!>
                WHERE Domain = ? AND Entity = ?
                ORDER BY ElementName
            `;

            table.getData(sql, {
                suppressStatementLog: true,
                params: [domain, entity]
            }, (err, results) => {
                if (err) {
                    callback(err);
                    return;
                }

                if (!results || results.length === 0) {
                    callback(new Error(`No CEDS elements found for ${domain} / ${entity}`));
                    return;
                }

                xLog.verbose(`Found ${results.length} CEDS elements for ${domain} / ${entity}`);
                callback(null, results);
            });
        });
    };

    // ===================================================================================
    // buildElementPrompt - Build LLM prompt for element matching
    // ===================================================================================

    const buildElementPrompt = function(sifElement, cedsElements, domain, entity) {
        const cedsElementsText = cedsElements.map((elem, idx) => {
            return `${idx + 1}. ID: ${elem.refId}
   Name: ${elem.ElementName}
   Definition: ${elem.Definition || elem.Description || 'N/A'}`;
        }).join('\n\n');

        return `You are an experienced administrator in a school district IT department. You have seen many school district database schemas and know the language and jargon of the education business.

The task at hand is to read the provided xPath and figure out where it fits in the CEDS (Common Education Data Standards) domain entity classification.

We are trying to identify the CEDS definition of a data element represented by an xPath in the CES domain entity system. 

Please examine the information about the SIF Element below. Consider all of the SIF Element data below but especially read the xPath word by word and carefully read the SIF Description to decide which of the available CEDS elements listed below is most likely to match the definition.

Analyze the semantic meaning and purpose of both elements. Consider:
- Name similarity (exact, partial, synonym)
- Definition/description alignment
- Data type compatibility
- Context within domain and entity

SIF ELEMENT:
- Name: ${sifElement.ElementName}
- XPath: ${sifElement.XPath}
- Type: ${sifElement.Type || 'N/A'}
- Description: ${sifElement.Description || 'N/A'}
- Mandatory: ${sifElement.Mandatory || 'N/A'}

CEDS CONTEXT:
- Domain: ${domain}
- Entity: ${entity}

CEDS ELEMENTS (choose the best match):
${cedsElementsText}

OUTPUT INSTRUCTIONS:
Return ONLY a JSON object with this exact structure:
{
  "cedsRefId": "CEDS_XXXXXX",
  "cedsElement": "Element Name",
  "confidence": 0.95,
  "reasoning": "Brief explanation of why this is the best match"
}

Confidence scale:
- 0.95-1.0: Exact or near-exact match
- 0.85-0.94: Strong semantic match
- 0.70-0.84: Reasonable match with minor differences
- 0.50-0.69: Partial match, may need verification
- Below 0.50: Weak match, likely incorrect`;
    };

    // ===================================================================================
    // askLLMForMatch - Query OpenAI for element matching
    // ===================================================================================

    const askLLMForMatch = function(sifElement, cedsElements, domain, entity, sessionHeader, callback) {
        if (!openai) {
            callback(new Error('OpenAI client not provided'));
            return;
        }

        const prompt = buildElementPrompt(sifElement, cedsElements, domain, entity);

        // Log prompt to process file
        if (sessionHeader) {
            const promptLogEntry = sessionHeader + [
                '====================================================================',
                'ELEMENT MATCHER - PROMPT',
                '====================================================================',
                `Timestamp: ${new Date().toISOString()}`,
                `SIF Element: ${sifElement.ElementName}`,
                `SIF XPath: ${sifElement.XPath}`,
                `Domain: ${domain}`,
                `Entity: ${entity}`,
                `Model: ${llmModel}`,
                `CEDS Elements to Consider: ${cedsElements.length}`,
                '',
                prompt,
                ''
            ].join('\n');
            xLog.saveProcessFile('element-matcher.log', promptLogEntry, { suppressLogNotification: true });
        }

        const params = {
            model: llmModel,
            messages: [{
                role: 'user',
                content: prompt
            }],
            temperature: temperature,
            max_tokens: 300,
            response_format: { type: "json_object" }
        };

        const callStartTime = Date.now();
        openai.chat.completions.create(params)
            .then((response) => {
                const processingTime = Date.now() - callStartTime;
                const content = response.choices[0].message.content.trim();

                let matchResult;
                try {
                    matchResult = JSON.parse(content);
                } catch (parseError) {
                    xLog.error(`Failed to parse LLM response: ${parseError.message}`);
                    xLog.error(`Response was: ${content}`);
                    callback(new Error(`Invalid JSON response from LLM: ${parseError.message}`));
                    return;
                }

                // Validate required fields
                if (!matchResult.cedsRefId || !matchResult.cedsElement || !matchResult.confidence) {
                    callback(new Error('LLM response missing required fields'));
                    return;
                }

                // Log response to process file
                if (sessionHeader) {
                    const responseLogEntry = [
                        '====================================================================',
                        'ELEMENT MATCHER - RESPONSE',
                        '====================================================================',
                        `Timestamp: ${new Date().toISOString()}`,
                        `Source: LLM (${llmModel})`,
                        `Processing Time: ${processingTime}ms`,
                        '',
                        JSON.stringify(matchResult, null, 2),
                        '',
                        ''
                    ].join('\n');
                    xLog.saveProcessFile('element-matcher.log', responseLogEntry, { append: true, suppressLogNotification: true });
                }

                callback(null, matchResult);
            })
            .catch((error) => {
                xLog.error(`OpenAI API error: ${error.message}`);
                callback(error);
            });
    };

    // ===================================================================================
    // matchElement - Main function: Match SIF element to CEDS element
    // ===================================================================================

    const matchElement = function(context, sessionHeader, callback) {
        // Handle optional sessionHeader parameter
        if (typeof sessionHeader === 'function') {
            callback = sessionHeader;
            sessionHeader = '';
        }

        const { sifElement, domain, entity } = context;

        xLog.verbose(`Matching element: ${sifElement.ElementName} in ${domain} / ${entity}`);

        // Step 1: Fetch CEDS elements for this domain/entity
        fetchCEDSElements(domain, entity, (err, cedsElements) => {
            if (err) {
                callback(err);
                return;
            }

            // Step 2: Ask LLM to find best match
            askLLMForMatch(sifElement, cedsElements, domain, entity, sessionHeader, (err, matchResult) => {
                if (err) {
                    callback(err);
                    return;
                }

                xLog.verbose(`Matched to: ${matchResult.cedsElement} (confidence: ${matchResult.confidence})`);

                // Step 3: Find the matched CEDS element to get its full details
                const matchedCedsElement = cedsElements.find(el =>
                    el.refId === matchResult.cedsRefId ||
                    el.GlobalID === matchResult.cedsRefId ||
                    el.ElementName === matchResult.cedsElement
                );

                xLog.verbose(`Found CEDS element definition: ${matchedCedsElement?.Definition ? 'Yes' : 'No'}`);

                // Step 4: Return enriched match result with definition
                const enrichedMatch = {
                    cedsRefId: matchResult.cedsRefId,
                    cedsElement: matchResult.cedsElement,
                    cedsDefinition: matchedCedsElement?.Definition || null,
                    confidence: matchResult.confidence,
                    reasoning: matchResult.reasoning,
                    distance: 1 - matchResult.confidence,  // Convert confidence to distance
                    score: matchResult.confidence,
                    domain: domain,
                    entity: entity,
                    hierarchicalPath: `${domain} → ${entity} → ${matchResult.cedsElement}`
                };

                callback(null, enrichedMatch);
            });
        });
    };

    // ===================================================================================

    return {
        matchElement,
        fetchCEDSElements,  // Exposed for testing
        buildElementPrompt  // Exposed for testing
    };
};

module.exports = moduleFunction;
