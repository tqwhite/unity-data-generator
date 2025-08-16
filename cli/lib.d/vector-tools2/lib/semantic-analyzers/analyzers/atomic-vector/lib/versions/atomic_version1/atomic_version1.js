'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = function(args = {}) {
    const { xLog, getConfig } = process.global;
    const { prettyPrintAtomicExpansion } = require('./lib/pretty-print')();
    
    // ===================================================================================
    
    const getTemplateString = (persona) => `
${persona}
        
Given any definition or user query, break it into its smallest self-contained semantic statements and identify the underlying conceptual dimensions.

To accomplish this, first break the definition down to semantic components such as verb, subject, object and contextual elements.

Each statement must:
  - Express exactly one idea or fact.
  - Be phrased as a complete, standalone sentence.
  - Avoid generic verbs/modalities (e.g. "can be", "provides")—only core content.
  - Should be examined a second time to make sure that the fact is truly consistent with the meaning of the definition.

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
    
    // ===================================================================================
    
    const convertAtomicFactsToEmbeddingStrings = (
        extractedData,
        originalDefinition,
    ) => {
        const element = extractedData.elements[0];
        const {
            facts,
            semantic_categories,
            functional_role,
            conceptual_dimensions,
        } = element;
        const embeddingStrings = [];

        // Pattern 1: Primary Context Formula
        if (functional_role && semantic_categories.length > 0) {
            const primaryContext = `${originalDefinition} serves as ${functional_role} in ${semantic_categories.join(', ')} domain`;
            embeddingStrings.push({
                type: 'primary_context',
                text: primaryContext,
            });
        }

        // Pattern 2: Individual Facts
        facts.forEach((fact, idx) => {
            embeddingStrings.push({
                type: 'individual_fact',
                text: fact.text,
                factIndex: idx,
            });
        });

        // Pattern 3: Functional Role Formula
        if (functional_role) {
            const functionalFormula = `${functional_role}: ${originalDefinition}`;
            embeddingStrings.push({
                type: 'functional_role',
                text: functionalFormula,
            });
        }

        // Pattern 4: Conceptual Dimensions
        conceptual_dimensions.forEach((dim, idx) => {
            const dimText = `${dim.dimension} spectrum ${dim.position} characteristic`;
            embeddingStrings.push({
                type: 'conceptual_dimension',
                text: dimText,
                dimension: dim.dimension,
            });
        });

        // Pattern 5: Semantic Categories
        semantic_categories.forEach((category) => {
            const categoryText = `${category}: ${facts.map((f) => f.text).join(' ')}`;
            embeddingStrings.push({
                type: 'semantic_category',
                text: categoryText,
                category,
            });
        });

        return embeddingStrings;
    };

    // ===================================================================================

    const {scoringMethod} = require(`../../scoringUtilityLib/composite-generic`)(); 
    
    // ===================================================================================
    
    return { getTemplateString, convertAtomicFactsToEmbeddingStrings, prettyPrintAtomicExpansion, scoringMethod };
};

module.exports = moduleFunction;