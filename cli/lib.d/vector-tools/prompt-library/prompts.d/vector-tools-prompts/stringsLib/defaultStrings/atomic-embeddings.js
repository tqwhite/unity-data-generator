#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

//START OF moduleFunction() ============================================================

const moduleFunction = function(args = {}) {
    const { passThroughParameters } = args;

    const workingFunction = function() {
        
        // Atomic embeddings work with the output from atomic fact extraction
        // This prompt library entry documents the process and could provide
        // text preprocessing for individual atomic facts if needed
        
        const systemPrompt = `You are a semantic text processor for atomic fact embeddings.
Your task is to optimize individual atomic facts for vector embedding generation.

Each atomic fact should:
- Be semantically complete
- Contain the essential meaning
- Be optimized for semantic similarity matching

Process each atomic fact to ensure it's ready for embedding generation.`;

        const processAtomicFactPrompt = function(data) {
            // Process individual atomic facts for optimal embeddings
            return {
                role: 'user',
                content: `Process this atomic fact for embedding: <!factText!>

Context: <!context!>
Semantic Category: <!semanticCategory!>
Functional Role: <!functionalRole!>`
            };
        };

        return {
            thinker: 'generateAtomicEmbeddings',
            prompts: {
                system: systemPrompt,
                processAtomicFactPrompt
            },
            // Atomic embeddings work with pre-extracted atomic facts
            // They generate multiple embeddings per source record
        };
    };

    return workingFunction;
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;