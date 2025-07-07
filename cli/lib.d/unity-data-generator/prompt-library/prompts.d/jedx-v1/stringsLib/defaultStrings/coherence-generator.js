#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

//START OF moduleFunction() ============================================================
const moduleFunction =
	({ moduleName } = {}) =>
	({ dotD, passThroughParameters } = {}) => {
		const promptTemplate = `
# PRIMARY TASK DEFINITION
- This project creates valid, realistic JEDX employment test data objects for use in education software data exchange. Your task is to finalize the data collection by ensuring proper relationships, foreign key consistency, and balanced distribution of child entities among parents.

# INPUT DATA
You will receive a collection of JSON objects in the processedElements data:

<!processedElements!>

ERROR CORRECTION SECTION

A validation check might have been run on the INPUT DATA. IF there are errors, they are here:

<!validationMessagesString!>

(It is possible that no errors have yet been found.)

# COHERENCE ANALYSIS INSTRUCTIONS

## 0. *Eliminate duplicate guids in refIds**: Each of these objects is made by a separate process. If there are any refIds (private key only) that are duplicates, change them to different values before going on to step 1.

## 1. Identify Keys and References
- **Primary Keys**: Look for properties named "refId" - these are unique identifiers for each object
- **Foreign Keys**: Look for properties ending in "RefId" or containing "refId" (except the primary "refId" itself) - these should reference other objects in the dataset. 

## 2. Analyze Current Relationships
- Map all refId values present in the dataset
- Identify all foreign key fields that should reference these refIds
- You should identify these relationships and list them.

## 3. Fix Referential Integrity
- **Update Foreign Keys**: Modify any foreign key values to reference actual refIds that exist in the current dataset
- **Maintain Logical Relationships**: Ensure relationships make sense (e.g., student references should point to actual student objects)
- **Preserve Data Structure**: Keep all other properties unchanged except for foreign key corrections
- **Deal with multiple parent relationships**: There are arbitrary numbers of each object. If you detect a foreign key for which there is more than one parent/target element, choose the refId that seems most coherent eg, same state or city.
- **Do not leave parent objects that could have references empty**: If there are enough child objects, every parent object should have a descendant.

## 4. Add Rainbow Color Property for Debugging
- Add a "UDG_DEBUG_INDICATOR" property to each JSON object
- Use rainbow colors: red, orange, yellow, green, blue, indigo, violet
- Assign colors randomly but ensure variety across objects

## 5. Check your work for Business Logic Compliance
- The foreign keys of all objects should reference the refId of another object if you can find any sort of object that makes sense to link it to.
- All refIds of any objects that act as parents (ie, there are other elements with foreign keys whose name makes sense in correspondence to an element name), should have a subordinate object. That is, no parent object should have two descendents any parent objects have zero.

**CRITICAL BUSINESS LOGIC VALIDATION:**
- **Every worker MUST have exactly one compensation report** (no more, no fewer)
- **Every worker MUST have at least one hours report** (no orphaned workers)
- **Hours reports should be distributed evenly** (if 3 workers and 6 hours reports, then 2 reports per worker)
- **All jobs and workers must belong to the same organization** (no cross-organizational inconsistencies)
- **No worker should be severely overloaded** (having 3+ more reports than other workers)

**VALIDATION FAILURE CONDITIONS (must be fixed):**
- Worker with zero compensation reports = CRITICAL ERROR
- Worker with multiple compensation reports = CRITICAL ERROR
- Worker with zero hours reports = CRITICAL ERROR  
- Jobs in different organization than workers = CRITICAL ERROR
- Severe distribution imbalance (one worker with 4+ reports, another with 0) = CRITICAL ERROR

# YOU ARE NOT TO CREATE NEW OBJECTS TO ACHIEVE VALIDITY OR COHERENCE
- This data set might be part of another unseen data set. Creating objects here violates user intent. Do not do it.
- Subordinate foreign keys that are missing parent element references are considered valid.

GUIDANCE FOR CORRECTING RELATIONSHIP PROBLEMS

If there are validation errors, you MUST FIND A WAY TO CHANGE THE DATA to make it better UNLESS it could require creating new objects.

**ORGANIZATIONAL CONSISTENCY REQUIREMENTS:**
- All jobs and workers should belong to the SAME organization
- If jobs are in Organization A and workers are in Organization B, move ALL workers to Organization A
- OR move ALL jobs to Organization B 
- Maintain organizational hierarchy coherence

**DISTRIBUTION BALANCE REQUIREMENTS:**
- Each worker must have exactly ONE compensation report
- Hours reports should be distributed as evenly as possible among workers
- If Worker A has 4 reports and Worker B has 0 reports, reassign 2 reports from A to B
- NO orphaned entities allowed (workers with zero reports)
- NO duplicate compensation reports allowed (multiple per worker)

If there are referential integrity errors, correct them by:
- Updating foreign key RefIds to point to existing parent entities
- Ensuring proper parent-child relationship patterns

If there are distribution imbalances, correct them by:
- **Reassigning child entities more evenly among available parents**
- **Moving entities from overloaded parents to underloaded ones**
- **Ensuring every worker has exactly ONE compensation report per year**
- **Distributing hours reports as evenly as possible among workers**
- **NO WORKER should be left with ZERO reports (orphaned entities)**
- **NO WORKER should have multiple compensation reports (duplicates)**
- Maintaining business logic coherence

If there are RefId duplicates, correct them by:
- Generating new unique RefIds for duplicate entities
- Maintaining foreign key references after RefId changes
- Following UUID format specifications

# EXAMPLE
If you have objects with refIds: "abc-123", "def-456", "ghi-789"
Then foreign keys should only reference these three values, not random UUIDs.

# PROCESS INSTRUCTIONS
1. Parse each JSON object in the processedElements collection
2. Extract all refId values to create a reference map
3. Identify all foreign key properties (properties containing "refId" or ending in "RefId")
4. Update foreign keys to reference valid parent refIds from the dataset
5. Add the rainbowColor property to each object
6. Return the complete corrected processedElements object

# RESULT FORMATTING INSTRUCTIONS
Always wrap the complete modified processedElements object in delimiters like this:

<!getProcessedElements.frontDelimiter!>
COMPLETE PROCESSED ELEMENTS OBJECT WITH CORRECTED REFERENCES AND RAINBOW COLORS GOES HERE
<!getProcessedElements.backDelimiter!>

There should be *nothing* except well-formed, valid JSON between those delimiters.
		`;

		const extractionParameters = {
			getProcessedElements: {
				frontDelimiter: `[START COHERENCE RESULTS]`,
				backDelimiter: `[END COHERENCE RESULTS]`,
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

				// Remove JavaScript-style comments that are invalid in JSON
				// Be more careful - only remove // that are actually comments (after whitespace or comma)
				result = result.replace(/(\s|,)\s*\/\/.*$/gm, '$1');

				result = result.trim();

				try {
					const parsedElements = JSON.parse(result);
					return { processedElements: parsedElements };
				} catch (err) {
					return { processedElements: 'Invalid JSON in response' };
				}
			} else {
				return { processedElements: 'No coherence results found in response' };
			}
		};

		const extractionList = [getProcessedElements(extractionParameters)];
		const extractionFunction = defaultExtractionFunction({ extractionList });

		const thinker = 'coherence-generator';

		// Child object balancing function for beforeAiProcess tool
		const balanceChildObjects = (dataset) => {
			const { xLog } = process.global;

			// Parse the dataset if it's a string
			let parsedDataset;
			try {
				parsedDataset =
					typeof dataset === 'string' ? JSON.parse(dataset) : dataset;
			} catch (error) {
				xLog.error(`Failed to parse dataset: ${error.message}`);
				return dataset;
			}

			// Step 1: Find all somethingRefId relationships
			const relationships = {};
			const parentCounts = {};

			Object.keys(parsedDataset).forEach((key) => {
				const obj = parsedDataset[key];

				// Find all RefId fields that reference other objects
				Object.keys(obj).forEach((field) => {
					if (field.endsWith('RefId') && field !== 'RefId') {
						const relationshipType = field; // e.g., 'organizationRefId', 'workerRefId'
						const targetRefId = obj[field];

						if (!relationships[relationshipType]) {
							relationships[relationshipType] = [];
						}
						relationships[relationshipType].push({
							childKey: key,
							childObj: obj,
							targetRefId: targetRefId,
						});

						// Count parents for this relationship type
						if (!parentCounts[relationshipType]) {
							parentCounts[relationshipType] = new Set();
						}
						parentCounts[relationshipType].add(targetRefId);
					}
				});
			});

			xLog.verbose(
				`Found ${Object.keys(relationships).length} relationship types: ${Object.keys(relationships).join(', ')}`,
			);

			// Step 2: For each relationship type, balance the distribution
			Object.keys(relationships).forEach((relationshipType) => {
				const children = relationships[relationshipType];
				const uniqueParents = Array.from(parentCounts[relationshipType]);

				if (children.length === 0 || uniqueParents.length === 0) {
					return;
				}

				xLog.verbose(
					`Balancing ${relationshipType}: ${children.length} children across ${uniqueParents.length} parents`,
				);

				// Calculate distribution
				const childrenPerParent = Math.floor(
					children.length / uniqueParents.length,
				);
				const remainder = children.length % uniqueParents.length;

				// Distribute children among parents
				let childIndex = 0;
				uniqueParents.forEach((parentRefId, parentIndex) => {
					// Some parents get one extra child if there's a remainder
					const extraChild = parentIndex < remainder ? 1 : 0;
					const childrenForThisParent = childrenPerParent + extraChild;

					for (
						let i = 0;
						i < childrenForThisParent && childIndex < children.length;
						i++
					) {
						const child = children[childIndex];
						child.childObj[relationshipType] = parentRefId;
						childIndex++;
					}
				});

				xLog.verbose(
					`Distributed ${relationshipType}: ${childrenPerParent}${remainder > 0 ? '+1' : ''} children per parent`,
				);
			});

			// Return the balanced dataset in the same format it came in
			return typeof dataset === 'string'
				? JSON.stringify(parsedDataset, null, 2)
				: parsedDataset;
		};

		// Tool functions for data processing
		const tools = {
			beforeAiProcess: (processedElements) => {
				const { xLog } = process.global;
				try {
					const balancedElements = balanceChildObjects(processedElements);
					return balancedElements;
				} catch (error) {
					xLog.error(`JEDX Tools: Error in beforeAiProcess: ${error.message}`);
					throw error;
				}
			},

			afterAiProcess: (processedElements) => {
				const { xLog } = process.global;
				return processedElements;
			},
		};

		const workingFunction = () => {
			return {
				promptTemplate,
				extractionParameters,
				extractionFunction,
				thinker,
				balanceChildObjects,
				tools,
			};
		};

		dotD == undefined || dotD.library.add(moduleName, workingFunction);

		return { workingFunction };
	};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction({ moduleName });
