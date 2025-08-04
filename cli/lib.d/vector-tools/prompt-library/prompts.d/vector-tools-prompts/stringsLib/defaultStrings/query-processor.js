#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

//START OF moduleFunction() ============================================================

const moduleFunction = function(args = {}) {
    const { passThroughParameters } = args;
    const { extractionLibrary, defaultExtractionFunction } = passThroughParameters;

    const workingFunction = function() {
        
        const systemPrompt = `You are a semantic query processor for vector search results.
Your task is to analyze vector similarity search results and provide the most relevant matches.

Given a query and vector search results, you should:
- Evaluate the semantic relevance of each result
- Consider the context and intent of the original query
- Rank results by true semantic similarity, not just numerical scores
- Provide clear, actionable results

Focus on semantic meaning and practical utility for the user.`;

        const processQueryPrompt = function(data) {
            const promptText = `Process these vector search results for the query: "<!queryString!>"

Search Results:
<!searchResults!>

Analyze and rank these results by semantic relevance to the query.

[START QUERY RESULTS]
<!-- Provide ranked results with explanations -->
[END QUERY RESULTS]`;

            return {
                role: 'user',
                content: promptText.qtTemplateReplace(data)
            };
        };

        const extractionParameters = {
            getQueryResults: {
                frontDelimiter: '[START QUERY RESULTS]',
                backDelimiter: '[END QUERY RESULTS]'
            }
        };

        const extractionList = [
            extractionLibrary.getQueryResults(extractionParameters)
        ];

        const extractionFunction = defaultExtractionFunction({ extractionList });

        return {
            thinker: 'processQuery',
            prompts: {
                system: systemPrompt,
                processQueryPrompt
            },
            extractionFunction
        };
    };

    return workingFunction;
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;