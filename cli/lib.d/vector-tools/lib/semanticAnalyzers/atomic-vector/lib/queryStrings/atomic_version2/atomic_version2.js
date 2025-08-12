'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const moduleFunction = function(args = {}) {
    const { xLog, getConfig } = process.global;
    const { prettyPrintAtomicExpansion } = require('./lib/pretty-print')();

    // ===================================================================================

    const getTemplateString = (persona) => `
${persona}
        
Given any definition or user query, break it into its smallest self-contained semantic statements and identify the underlying conceptual dimensions.

To accomplish this, first deconstruct the definition into semantic components such as subject, verb, object, and contextual elements.

Each statement must:
  - Express exactly one idea or fact.
  - Be phrased as a complete, standalone sentence.
  - Avoid generic verbs or modalities (e.g., "can be", "provides")—use only precise, content-bearing language.
  - Be reviewed a second time to ensure the statement is truly consistent with the intended meaning of the original definition.

For each resulting element, identify the following:

- **Subject**: What aspect of the educational system is being described? Select one or more from the list below:

    Student Demographics & Identity – Student characteristics, personal information, family details, addresses, and identity markers (e.g., ability grouping, time allocation, demographic classifications).  
    Assessment & Testing – Assessments, accommodations, evaluation procedures, scoring systems, performance measurement.  
    School Operations & Administration – Administrative processes, organizational structures, accreditation, school designations, operational management.  
    Academic Performance & Records – Academic awards, grades, transcripts, course records, and achievements.  
    Facilities & Infrastructure – Physical buildings, construction, architectural elements, facility management.  
    Federal Programs & Compliance – Federal programs, compliance requirements, regulatory frameworks.  
    Staff & Personnel  
    Financial & Resources  
    Early Childhood Education  
    Credentials & Licensing  
    Postsecondary Education  
    Special Education & Services  
    Enrollment & Attendance  
    Health & Safety  
    Technology & Digital Resources  
    Other/Miscellaneous  

- **Category**: Select one or more data definition categories from the list below:

    Assessment & Testing – Assessment forms, items, results, scoring, rubrics, performance measures  
    Student Information & Demographics – Personal data, demographics, characteristics, status indicators  
    Academic Programs & Curriculum – Courses, programs, instruction, grades, credits, subjects, learning activities  
    Staff & Personnel – Employee info, positions, qualifications, compensation, professional development  
    Financial & Budget – Funding, costs, budgets, financial aid, tuition, salaries, expenditures  
    Facilities & Infrastructure – Buildings, sites, locations, addresses, capacity, maintenance, safety  
    Special Education & Disabilities – IDEA services, IEPs, accommodations, disability classifications, related services  
    Organization & Administration – Institutional identifiers, governance, policies, compliance, admin processes  
    Early Learning & Child Development – Early childhood programs, milestones, family services  
    Technology & Digital Resources – Digital devices, internet access, online systems, electronic resources  
    Health & Medical – Screenings, conditions, immunizations, wellness services  
    Credentials & Certifications – Degrees, certificates, licenses, awards, professional qualifications  
    Enrollment & Attendance – Registration, membership, participation, admission, withdrawal  
    Data & Reporting – Data collection, records, identifiers, status tracking, reporting periods  

- **Data_Meaning**: What type of information is being conveyed? Select one or more from the list below:

    Address/Location – Geographic/spatial data including addresses and coordinates  
    Age – Age-related values and ranges  
    Authorization/Permission – Approvals, consents, and related information  
    Category/Type – Classifications, groupings, taxonomies  
    Count/Quantity – Numeric totals, maximums, minimums  
    Curriculum/Subject – Instructional content, academic subjects, programs  
    Disability/Health – Health and disability-related information  
    Document/Form – Forms, reports, certificates  
    Frequency – Occurrence intervals or repetition over time  
    Goal/Objective – Targets, outcomes, desired achievements  
    Grade/Score – Academic grades, test scores, performance levels  
    Identifier/Code – Unique codes or reference numbers  
    Indicator/Boolean – True/false or yes/no flags  
    Language – Language identifiers, linguistic data  
    Measurement/Units – Physical measures, dimensions, units  
    Method/Process – Techniques, procedures, approaches  
    Money/Financial – Monetary amounts, funding, salaries, fees  
    Name/Title – Labels, names, descriptive terms  
    Percentage/Ratio – Percentages, ratios, proportions  
    Priority/Ranking – Rank orders, priorities, sequences  
    Reason/Explanation – Rationales, justifications, causes  
    Relationship – Associations and connections between entities  
    Status – State, condition, or status of a process or entity  
    Time/Date – Dates, times, durations, schedules  
    URL/Web Address – Online references or web locations  

- **Predicate_Nominal**: Identify the core noun phrase being defined. This is typically the head noun or phrase at the beginning of the definition, representing what the term *is*. It serves as the semantic anchor of the definition (e.g., “The abbreviation,” “The date,” “The status flag”).

Return the result in the following JSON structure:

{
  "elements": [
    {
      "element_id": "<descriptive_identifier>",
      "facts": [
        { "text": "<standalone statement>" }
      ],
      "Subject": ["<subject1>", "<subject2>"],
      "Category": ["<category1>", "<category2>"],
      "Data_Meaning": ["<meaning1>", "<meaning2>"],
      "predicate_nominal": "<core noun phrase being defined>"
    }
  ]
}

`;

    // ===================================================================================

    const convertAtomicFactsToEmbeddingStrings = (
        extractedData,
        originalDefinition,
    ) => {
        const element = extractedData.elements[0];
        const {
            facts,
            Subject,
            Category,
            Data_Meaning,
            predicate_nominal,
        } = element;
        const embeddingStrings = [];

        // Pattern 1: Subject-Category Context Formula
        if (Subject && Subject.length > 0 && Category && Category.length > 0) {
            const contextFormula = `${originalDefinition} relates to ${Subject.join(', ')} within ${Category.join(', ')} context`;
            embeddingStrings.push({
                type: 'subject_category_context',
                text: contextFormula,
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

        // Pattern 3: Subject Focus Formula  
        if (Subject && Subject.length > 0) {
            Subject.forEach((subject) => {
                const subjectFormula = `${subject}: ${originalDefinition}`;
                embeddingStrings.push({
                    type: 'subject_focus',
                    text: subjectFormula,
                    subject,
                });
            });
        }

        // Pattern 4: Category Classification
        if (Category && Category.length > 0) {
            Category.forEach((category) => {
                const categoryText = `${category} classification: ${facts.map((f) => f.text).join(' ')}`;
                embeddingStrings.push({
                    type: 'category_classification',
                    text: categoryText,
                    category,
                });
            });
        }

        // Pattern 5: Data Meaning Specification
        if (Data_Meaning && Data_Meaning.length > 0) {
            Data_Meaning.forEach((meaning) => {
                const meaningText = `${meaning} data type: ${originalDefinition}`;
                embeddingStrings.push({
                    type: 'data_meaning',
                    text: meaningText,
                    meaning,
                });
            });
        }

        // Pattern 6: Combined Subject-Data Meaning Pattern
        if (Subject && Subject.length > 0 && Data_Meaning && Data_Meaning.length > 0) {
            Subject.forEach((subject) => {
                Data_Meaning.forEach((meaning) => {
                    const combinedText = `${subject} ${meaning}: ${facts.map((f) => f.text).join(' ')}`;
                    embeddingStrings.push({
                        type: 'subject_meaning_combination',
                        text: combinedText,
                        subject,
                        meaning,
                    });
                });
            });
        }

        // Pattern 7: Predicate Nominal Focus
        if (predicate_nominal) {
            const predicateText = `${predicate_nominal}: ${originalDefinition}`;
            embeddingStrings.push({
                type: 'predicate_nominal_focus',
                text: predicateText,
                predicate_nominal,
            });
        }

        // Pattern 8: Predicate Nominal with Facts
        if (predicate_nominal && facts && facts.length > 0) {
            const factsText = `${predicate_nominal} - ${facts.map((f) => f.text).join(' ')}`;
            embeddingStrings.push({
                type: 'predicate_nominal_facts',
                text: factsText,
                predicate_nominal,
            });
        }

        // Pattern 9: Predicate Nominal with Data Meaning
        if (predicate_nominal && Data_Meaning && Data_Meaning.length > 0) {
            Data_Meaning.forEach((meaning) => {
                const predicateMeaningText = `${predicate_nominal} represents ${meaning} type data: ${originalDefinition}`;
                embeddingStrings.push({
                    type: 'predicate_nominal_meaning',
                    text: predicateMeaningText,
                    predicate_nominal,
                    meaning,
                });
            });
        }

        return embeddingStrings;
    };

    // ===================================================================================
    
    /**
     * Score and rank aggregated vector search matches using composite scoring algorithm
     * @param {Map} allMatches - Map of sourceRefId -> match data with distances, factTypes, etc.
     * @param {Object} options - Scoring options
     * @param {number} options.distanceWeight - Weight factor for distance penalty (default: 0.1)
     * @returns {Array} Array of scored and sorted results
     */
    const scoringMethod = (allMatches, options = {}) => {
        const { distanceWeight = 0.1 } = options;

        // Score and rank aggregated results
        const scoredResults = Array.from(allMatches.values()).map(match => {
            // Primary score: number of unique fact types matched
            const uniqueFactTypesCount = match.factTypes.size;

            // Secondary score: average distance (lower is better)
            const avgDistance = match.distances.reduce((a, b) => a + b, 0) / match.distances.length;

            // Composite score: more matched types is better, lower distance is better
            const compositeScore = uniqueFactTypesCount - (avgDistance * distanceWeight);

            return {
                refId: match.refId,
                score: compositeScore,
                distance: avgDistance,
                factTypesMatched: uniqueFactTypesCount,
                totalMatches: match.distances.length
            };
        });

        // Sort by composite score (higher is better)
        scoredResults.sort((a, b) => b.score - a.score);

        xLog.verbose(`Scored ${scoredResults.length} matches using composite scoring algorithm`);
        xLog.verbose(`Distance weight factor: ${distanceWeight}`);

        return scoredResults;
    };

    // ===================================================================================

    return { getTemplateString, convertAtomicFactsToEmbeddingStrings, prettyPrintAtomicExpansion, scoringMethod };
};

module.exports = moduleFunction;