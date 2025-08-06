#!/usr/bin/env node
'use strict';
// Suppress punycode deprecation warning
process.noDeprecation = true;

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

// const qt = require('qtools-functional-library'); //also exposes qtLog(); qt.help({printOutput:true, queryString:'.*', sendJson:false});

const os = require('os');
const path = require('path');
const fs = require('fs');

console.log(`HELLO FROM ${__dirname}/${moduleName}`);

//START OF moduleFunction() ============================================================
const moduleFunction =
	({ moduleName } = {}) =>
	({ unused } = {}) => {
		const { xLog, getConfig, rawConfig, commandLineParameters, projectRoot } =
			process.global;
		const localConfig = getConfig(moduleName); //moduleName is closure

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

For each element, also identify one or more subjects that fit the definition:
  - **Subject**: What aspect of the educational system is this describing:
    Student Demographics & Identity: This is the largest category, covering student characteristics, personal information, family details, addresses, and identity markers. Examples include ability grouping indicators, student time allocation, and demographic classifications.
    Assessment & Testing: Definitions related to educational assessments, testing accommodations, evaluation procedures, scoring systems, and performance measurements.
    School Operations & Administration: Administrative processes, organizational structures, accreditation, school designations, and operational management systems.
    Academic Performance & Records: Academic awards, grades, transcripts, course records, and educational achievements.
    Facilities & Infrastructure: Physical buildings, construction details, architectural elements, and facility management.
    Federal Programs & Compliance: Federal education programs, compliance requirements, and regulatory frameworks.
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
  
  - **Category*: Select a data definition category one or more that fit the definition from this list:

    Assessment & Testing: Assessment forms, items, results, scoring, rubrics, performance measures
    Student Information & Demographics: Personal data, demographics, characteristics, status indicators
    Academic Programs & Curriculum: Courses, programs, instruction, grades, credits, subjects, learning activities
    Staff & Personnel: Employee information, positions, qualifications, compensation, professional development
    Financial & Budget: Funding, costs, budgets, financial aid, tuition, salaries, expenditures
    Facilities & Infrastructure: Buildings, sites, locations, addresses, capacity, maintenance, safety
    Special Education & Disabilities: IDEA services, IEPs, accommodations, disability classifications, related services
    Organization & Administration: Institutional identifiers, governance, policies, compliance, administrative processes
    Early Learning & Child Development: Early childhood programs, developmental milestones, family services
    Technology & Digital Resources: Digital devices, internet access, online systems, electronic resources
    Health & Medical: Health screenings, medical conditions, immunizations, wellness services
    Credentials & Certifications: Degrees, certificates, licenses, awards, professional qualifications
    Enrollment & Attendance: Registration, membership, participation, admission, withdrawal processes
    Data & Reporting: Data collection, records, identifiers, status tracking, reporting periods

  - **Data_Meaning**: What sort of information is the definition providing. Choose one or more from this list:
  
    Address/Location: Geographic and spatial information including addresses, coordinates, and physical locations.
    Age: Age-related information and age ranges for individuals or groups.
    Authorization/Permission: Approvals, consents, and authorization-related information.
    Category/Type: Classifications, taxonomies, and categorical groupings of entities.
    Count/Quantity: Numeric counts, totals, maximums, minimums, and quantitative measures.
    Curriculum/Subject: Academic subjects, courses, programs, and instructional content.
    Disability/Health: Health conditions, medical information, and disability-related data.
    Document/Form: References to forms, reports, certificates, and other documents.
    Frequency: How often something occurs or is repeated over time.
    Goal/Objective: Targets, outcomes, and intended achievements.
    Grade/Score: Academic grades, test scores, ratings, and performance measures.
    Identifier/Code: Unique identifiers, codes, and reference numbers.
    Indicator/Boolean: Yes/no flags, true/false indicators, and binary status information.
    Language: Language-related information including native language and linguistic data.
    Measurement/Units: Physical measurements, dimensions, and units of measure.
    Method/Process: Procedures, techniques, approaches, and methodological information.
    Money/Financial: Monetary amounts, costs, salaries, fees, and financial data.
    Name/Title: Names, titles, labels, and descriptive text.
    Percentage/Ratio: Percentages, ratios, proportions, and rates.
    Priority/Ranking: Rankings, priorities, sequences, and ordered positions.
    Reason/Explanation: Explanations, rationales, and justifications for decisions or actions.
    Relationship: Associations, connections, and relationships between entities.
    Status: Current state, condition, or status of entities or processes.
    Time/Date: Temporal information including dates, times, durations, and schedules.
    URL/Web Address: Web addresses, uniform resource locators, and online references.

Return a JSON object with this structure:
{
  "elements": [
    {
      "element_id": "<descriptive_identifier>",
      "facts": [
        {"text": "<standalone statement>"}
      ],
      "Subject": ["<subject">, "<other subject>" ],
      "Category": ["<category1">, "<other category>" ],
      "Data_Meaning": ["<meaning1">, "<other meaning>" ]
    }
  ]
}

`;

		// ===================================================================================


//TQ SAYS: THIS NEEDS TO BE FIXED TO MATCH THE PROMPT STRING JSON OUTPUT ABOVE.

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

			return embeddingStrings;
		};

		

		// ===================================================================================

		return { getTemplateString, convertAtomicFactsToEmbeddingStrings };
	};

//END OF moduleFunction() ============================================================


module.exports = moduleFunction({ moduleName });
