#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

//START OF moduleFunction() ============================================================
const moduleFunction =
	({ moduleName } = {}) =>
	({ dotD, passThroughParameters } = {}) => {
		const promptTemplate = `
This project creates valid, realistic JEDX employment test data objects for use in education software data exchange. Your task is to analyze the data collection for validation errors and provide detailed feedback on referential integrity, foreign key consistency, and proper hierarchical relationships.

Here is the current data collection:

<!processedElements!>

VALIDATION ANALYSIS REQUIRED

Your primary responsibilities:

1) **FOREIGN KEY INTEGRITY ANALYSIS**: Check if fields ending in 'RefId' point to existing primary RefIds
   - organizationRefId fields ideally point to existing organization.RefId values
   - workerRefId fields ideally point to existing worker.RefId values  
   - jobRefId fields ideally point to existing job.RefId values
   - Pattern: {entityType}RefId → should find matching {entityType} with that RefId
   
   **IMPORTANT NOTE**: ORPHANED ENTITIES ARE ALLOWED
   - Child entities may reference parent RefIds that don't exist in the dataset
   - This is acceptable and should NOT be flagged as an error
   - Only flag as warning if desired, but NEVER mark dataset as INVALID for missing parent references
   - Focus validation on business logic within the provided entities

2) **REFID UNIQUENESS ANALYSIS**: Verify every entity has a completely unique RefId
   - Check for duplicate RefIds across different entities
   - RefIds should follow UUID format: "a1b2c3d4-e5f6-7890-ab12-cd34ef56gh78" (32 hex digits in 8-4-4-4-12 pattern)

3) **DISTRIBUTION BALANCE ANALYSIS**: CRITICALLY IMPORTANT - Evaluate if child entities are evenly distributed among parents
   - Each parent should have roughly equal numbers of children
   - Flag cases where distribution varies by more than 1 entity per parent
   - Example: 6 reports among 3 workers should be 2 reports each
   - **ORPHANED ENTITY DETECTION**: Any worker with ZERO reports is a CRITICAL ERROR
   - **OVERLOADED ENTITY DETECTION**: Any worker with significantly more reports than others is a MAJOR ERROR
   - **DUPLICATE COMPENSATION**: Multiple compensation reports per worker per year is INVALID

4) **HIERARCHICAL COMPLETENESS ANALYSIS**: Ensure proper organizational structure
   - All required parent entities must be present for referenced children
   - Child entities must have valid parent references
   - Flag missing parent entities
   - **CROSS-ORGANIZATIONAL CONSISTENCY**: All jobs and workers should belong to the SAME organization
   - **ORGANIZATIONAL LOGIC**: Jobs should exist in the same organization as their workers

VALIDATION CONTEXT

Here are the validation errors detected during initial analysis:

<!validationMessagesString!>

ANALYSIS INSTRUCTIONS

Please analyze the data collection and provide:

1) **Detailed validation assessment** - Review each validation error and assess its severity
2) **Relationship analysis** - Examine the coherence of entity relationships
3) **Data quality evaluation** - Check if entities follow proper business logic patterns
4) **Final validation verdict** - Determine if the data collection is valid or requires corrections

COMMON RELATIONSHIP PATTERNS TO VERIFY:

• **Organization → Jobs**: All jobs should reference the same organization (single organization model)
• **Organization → Workers**: All workers should reference the same organization  
• **Worker → Compensation Reports**: Each worker should have EXACTLY ONE compensation report per year
• **Worker → Hours Reports**: Each worker should have roughly EQUAL numbers of hours reports
• **Balanced Distribution**: If there are 3 workers and 6 reports, distribute 2 reports per worker
• **NO ORPHANED ENTITIES**: Every worker MUST have at least one compensation report and one hours report
• **NO OVERLOADED ENTITIES**: No worker should have significantly more reports than others
• **ORGANIZATIONAL CONSISTENCY**: Jobs and workers should be in the same organization

VALIDATION RESULT REQUIREMENTS

Based on your analysis, determine:
- **Is the data collection VALID or INVALID?**
- **What specific errors need to be addressed?**
- **What is the severity of each error?**
- **Are there any critical blocking issues?**

**CRITICAL VALIDATION FAILURE CONDITIONS** (automatically INVALID):
- Any duplicate RefId values across different entities  
- Any malformed RefId formats that don't follow UUID pattern
- **ANY WORKER WITH ZERO REPORTS** (orphaned entities within the dataset)
- **ANY WORKER WITH MULTIPLE COMPENSATION REPORTS** (duplicate business records)
- **SEVERE DISTRIBUTION IMBALANCE** (one worker with 3+ more reports than others)
- **CROSS-ORGANIZATIONAL INCONSISTENCIES** (jobs and workers in different organizations)

**NOTE**: Foreign keys pointing to non-existent RefIds are ALLOWED and should NOT cause validation failure

**REFERENCE ANALYSIS**: 
Foreign keys that point to RefIds not present in the current data collection are ACCEPTABLE and should be noted but NOT treated as validation errors. These represent valid orphaned entities. Only focus on errors within the provided dataset:
- Distribution balance among existing entities
- Duplicate RefIds
- Business logic violations (multiple compensation reports per worker)
- Cross-organizational inconsistencies

RESULT FORMATTING INSTRUCTIONS

Provide your detailed analysis and validation assessment. Wrap explanatory text with delimiters like this:

<!getExplanation.frontDelimiter!>
DETAILED VALIDATION ANALYSIS GOES HERE

Include:
- Summary of validation errors found
- Assessment of each error's severity and impact
- Recommendations for fixes if needed
- Final validation verdict (VALID or INVALID)

Example format:
## VALIDATION ANALYSIS SUMMARY
Found X validation errors requiring attention.

## DETAILED ERROR ANALYSIS
1. **Referential Integrity**: [Details...]
2. **RefId Uniqueness**: [Details...]
3. **Distribution Balance**: [Details...]

## FINAL VALIDATION VERDICT
Data collection is [VALID/INVALID] because [reasons...]

If INVALID, the following corrections are needed:
- [List specific fixes needed]
<!getExplanation.backDelimiter!>

		`;
		const extractionParameters = {
			getExplanation: {
				frontDelimiter: `[START VALIDATION ANALYSIS]`,
				backDelimiter: `[END VALIDATION ANALYSIS]`,
			},
		};

		const { extractionLibrary, defaultExtractionFunction } =
			passThroughParameters;

		const extractionList = [
			extractionLibrary.getExplanation(extractionParameters),
		];
		const extractionFunction = defaultExtractionFunction({ extractionList });

		const thinker = 'check-group-validity';

		const workingFunction = () => {
			return { promptTemplate, extractionParameters, extractionFunction, thinker };
		};

		dotD == undefined || dotD.library.add(moduleName, workingFunction);

		return { workingFunction };
	};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction({ moduleName });