#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

//START OF moduleFunction() ============================================================

const moduleFunction = function(args = {}) {
    const { passThroughParameters } = args;
    const { extractionLibrary, defaultExtractionFunction } = passThroughParameters;

    const workingFunction = function() {
        
        const systemPrompt = `You are an atomic-fact extractor with semantic categorization.
Given any definition or user query, break it into its smallest self-contained semantic statements and identify the underlying conceptual dimensions.

Each statement must:
  - Express exactly one idea or fact.
  - Be phrased as a complete, standalone sentence.
  - Avoid generic verbs/modalities (e.g. "can be", "provides")—only core content.

For each element, also identify:
  - **Semantic categories**: What domain/field concepts does this represent?
  - **Functional role**: What purpose or function does this serve?
  - **Conceptual dimensions**: What underlying distinctions or spectrums does this relate to?

Return a JSON object with this structure:
{
  "elements": [
    {
      "element_id": "<descriptive_identifier>",
      "facts": [
        {"text": "<standalone statement>"}
      ],
      "semantic_categories": ["<domain1>", "<domain2>"],
      "functional_role": "<primary purpose>",
      "conceptual_dimensions": [
        {"dimension": "<spectrum_name>", "position": "<where_on_spectrum>"}
      ]
    }
  ]
}

Conceptual dimensions are semantic axes that distinguish related concepts. Identify the relevant dimensions for your specific input - these examples show the pattern but are not exhaustive:
- temporal: span ↔ point
- spatial: area ↔ location  
- identity: class ↔ instance
- scope: general ↔ specific
- structure: container ↔ content
- granularity: aggregate ↔ atomic

Derive dimensions appropriate to your input's semantic domain.`;

        const userPrompt = `Extract atomic facts from this definition: <!definition!>

[START ATOMIC FACTS]
<!-- Extract atomic facts as JSON here -->
[END ATOMIC FACTS]`;

        const extractAtomicFactsPrompt = function(data) {
            const promptText = userPrompt.qtTemplateReplace(data);
            return {
                role: 'user',
                content: promptText
            };
        };

        const extractionParameters = {
            getAtomicFacts: {
                frontDelimiter: '[START ATOMIC FACTS]',
                backDelimiter: '[END ATOMIC FACTS]'
            }
        };

        const extractionList = [
            extractionLibrary.getAtomicFacts(extractionParameters)
        ];

        const extractionFunction = defaultExtractionFunction({ extractionList });

        return {
            thinker: 'extractAtomicFacts',
            prompts: {
                system: systemPrompt,
                extractAtomicFactsPrompt
            },
            extractionFunction,
            responseFormat: { type: 'json_object' }
        };
    };

    return workingFunction;
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction;