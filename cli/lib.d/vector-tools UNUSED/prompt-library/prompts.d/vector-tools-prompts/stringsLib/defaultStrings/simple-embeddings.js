#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

//START OF moduleFunction() ============================================================

const moduleFunction = function(args = {}) {
    const { passThroughParameters } = args;

    const workingFunction = function() {
        
        // Simple embeddings don't require complex prompts - they work directly with text
        // This prompt library entry mainly serves to document the process and provide
        // any future prompt-based preprocessing if needed
        
        const systemPrompt = `You are a text preprocessor for vector embedding generation.
Your task is to prepare text for optimal vector embedding creation.

Ensure the text:
- Is clear and complete
- Contains the essential semantic content
- Is appropriately formatted for embedding

Return the text ready for embedding generation.`;

        const preprocessTextPrompt = function(data) {
            // For simple embeddings, we typically just pass through the text
            // This could be enhanced later for preprocessing if needed
            return {
                role: 'user',
                content: `Prepare this text for embedding: <!text!>`
            };
        };

        return {
            thinker: 'generateSimpleEmbeddings',
            prompts: {
                system: systemPrompt,
                preprocessTextPrompt
            },
            // Simple embeddings don't require extraction functions
            // They work directly with the OpenAI embeddings API
        };
    };

    return workingFunction;
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;