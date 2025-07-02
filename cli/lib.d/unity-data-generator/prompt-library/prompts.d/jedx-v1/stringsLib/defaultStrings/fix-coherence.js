#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

//START OF moduleFunction() ============================================================
const moduleFunction =
	({ moduleName } = {}) =>
	({ dotD, passThroughParameters } = {}) => {
		const promptTemplate = `
This project creates valid, realistic JEDX employment test data objects for use in education software data exchange. Your task is to finalize the data collection by ensuring proper relationships, foreign key consistency, and balanced distribution of child entities among parents.

Here is the current data collection:

<!processedElements!>

RELATIONSHIP AND COHERENCE REQUIREMENTS

Your primary responsibilities:

1) **FOREIGN KEY INTEGRITY**: Fields ending in 'RefId' are foreign keys that must point to existing primary RefIds
   - organizationRefId fields must point to existing organization.RefId values
   - workerRefId fields must point to existing worker.RefId values
   - jobRefId fields must point to existing job.RefId values
   - Pattern: {entityType}RefId → find matching {entityType} and use its RefId

2) **REFID UNIQUENESS**: Every entity must have a completely unique RefId
   - Never reuse RefIds across different entities
   - Generate new UUIDs when conflicts detected
   - Format: "a1b2c3d4-e5f6-7890-ab12-cd34ef56gh78" (32 hex digits in 8-4-4-4-12 pattern)

3) **DISTRIBUTION BALANCE**: Distribute child entities evenly among available parents
   - Each parent should have roughly equal numbers of children
   - If uneven distribution unavoidable, vary by only 1 entity per parent
   - Example: 6 reports among 3 workers = 2 reports each

4) **HIERARCHICAL COMPLETENESS**: Ensure proper organizational structure
   - All required parent entities must be present
   - Child entities must have valid parent references
   - Create missing parent entities if needed

ERROR CORRECTION SECTION

A validation check was run on the current data collection. Here is the result:

<!validationMessagesString!>

GUIDANCE FOR CORRECTING RELATIONSHIP PROBLEMS

If there are validation errors, you MUST FIND A WAY TO CHANGE THE DATA to make it better.

If there are referential integrity errors, correct them by:
- Updating foreign key RefIds to point to existing parent entities
- Creating missing parent entities if referenced by children
- Ensuring proper parent-child relationship patterns

If there are distribution imbalances, correct them by:
- Reassigning child entities more evenly among available parents
- Moving entities from overloaded parents to underloaded ones
- Maintaining business logic coherence

If there are RefId duplicates, correct them by:
- Generating new unique RefIds for duplicate entities
- Maintaining foreign key references after RefId changes
- Following UUID format specifications

WHEN YOU COMPLETE THE REVISIONS, PLEASE REVIEW THE RESULTING DATA AND VERIFY THAT ALL RELATIONSHIPS ARE COHERENT.

COMMON RELATIONSHIP PATTERNS TO ENFORCE:

• **Organization → Jobs**: All jobs should reference the same organization (single organization model)
• **Organization → Workers**: All workers should reference the same organization
• **Worker → Compensation Reports**: Each worker can have multiple compensation reports
• **Worker → Hours Reports**: Each worker can have multiple hours reports
• **Balanced Distribution**: If there are 3 workers and 6 reports, distribute 2 reports per worker

SPECIFIC ERROR CORRECTION STRATEGIES:

• **"Foreign key points to non-existent entity"**
	• Find the target entity type from the foreign key name (e.g., workerRefId → worker)
	• Locate existing entities of that type in the data collection
	• Update the foreign key to point to a valid existing RefId
	• If no suitable parent exists, create one with appropriate properties

• **"RefId duplication detected"**
	• Generate new unique RefIds for duplicate entities using proper UUID format
	• Maintain all existing foreign key relationships pointing to the changed RefIds
	• Ensure new RefIds follow the pattern: 8-4-4-4-12 hex digits with dashes

• **"Distribution imbalance found"**
	• Count total child entities and total parent entities
	• Calculate ideal distribution (total children ÷ total parents)
	• Reassign excess children from overloaded parents to underloaded ones
	• Maintain logical business relationships during reassignment

• **"Missing parent entities"**
	• Create the missing parent entity with a valid RefId
	• Populate required fields with realistic business data
	• Ensure the new parent follows the same structure as existing entities

COHERENCE AND BUSINESS LOGIC REQUIREMENTS:

Data values must align with each other in ways that make sense for employment data. For example:
- Job titles should match SOC classification codes
- Compensation amounts should be reasonable for job types
- Worker names and addresses should be realistic and consistent
- Organization information should be complete and coherent

PROCESS INSTRUCTIONS

Please...

1) **Analyze validation errors** reported above and understand each specific issue
2) **Fix referential integrity** by ensuring all foreign keys point to valid parent RefIds
3) **Resolve RefId duplicates** by generating new unique identifiers where needed
4) **Balance entity distribution** by reassigning children among parents more evenly
5) **Create missing parents** if required by referential integrity
6) **Review final result** for relationship coherence and business logic consistency

RESULT FORMATTING INSTRUCTIONS

To facilitate subsequent processing, please format your output according to these instructions:

Wrap the resulting data collection with delimiters like this:

<!getProcessedElements.frontDelimiter!>
CORRECTED DATA COLLECTION GOES HERE
<!getProcessedElements.backDelimiter!>

There should be *nothing* except valid JSON data between those delimiters.

Explain your reasoning for each correction. Wrap explanatory text with delimiters like this:

<!getExplanation.frontDelimiter!>
EXPLANATIONS GO HERE
<!getExplanation.backDelimiter!>

		`;
		const extractionParameters = {
			getProcessedElements: {
				frontDelimiter: `[START CORRECTED DATA]`,
				backDelimiter: `[END CORRECTED DATA]`,
			},
			getExplanation: {
				frontDelimiter: `[START COHERENCE EXPLANATIONS]`,
				backDelimiter: `[END COHERENCE EXPLANATIONS]`,
			},
		};

		const { extractionLibrary, defaultExtractionFunction } =
			passThroughParameters;

		// Create custom extraction function for processedElements
		const getProcessedElements = (extractionParameters) => (inString) => {
			const { frontDelimiter: startDelimiter, backDelimiter: endDelimiter } =
				extractionParameters.getProcessedElements;

			function escapeRegExp(string) {
				return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			}

			const escapedStartDelimiter = escapeRegExp(startDelimiter);
			const escapedEndDelimiter = escapeRegExp(endDelimiter);

			const regexString = `${escapedStartDelimiter}(.*?)${escapedEndDelimiter}`;
			const regex = new RegExp(regexString, 's');

			const match = inString.match(regex);

			if (match) {
				let result = match[1].trim();
				
				// Handle markdown code blocks (```json ... ```)
				if (result.startsWith('```json')) {
					result = result.replace(/^```json\s*/, '').replace(/\s*```$/, '');
				} else if (result.startsWith('```')) {
					result = result.replace(/^```\s*/, '').replace(/\s*```$/, '');
				}
				
				result = result.trim();
				
				try {
					const parsedElements = JSON.parse(result);
					return { processedElements: parsedElements };
				} catch (err) {
					return { processedElements: 'Invalid JSON in response' };
				}
			} else {
				return { processedElements: 'No corrected data found in response' };
			}
		};

		const extractionList = [
			getProcessedElements(extractionParameters),
			extractionLibrary.getExplanation(extractionParameters),
		];
		const extractionFunction = defaultExtractionFunction({ extractionList });

		const thinker = 'fix-coherence';

		const workingFunction = () => {
			return { promptTemplate, extractionParameters, extractionFunction, thinker };
		};

		dotD == undefined || dotD.library.add(moduleName, workingFunction);

		return { workingFunction };
	};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction({ moduleName });