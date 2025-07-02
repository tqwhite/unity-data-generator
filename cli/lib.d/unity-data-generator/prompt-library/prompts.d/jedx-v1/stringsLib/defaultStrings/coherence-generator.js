#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

//START OF moduleFunction() ============================================================
const moduleFunction =
	({ moduleName } = {}) =>
	({ dotD, passThroughParameters } = {}) => {
		const promptTemplate = `
# PRIMARY TASK DEFINITION
- Your task is to analyze multiple JSON objects for referential integrity and ensure all foreign key relationships are coherent within the dataset.

# INPUT DATA
You will receive a collection of JSON objects in the processedElements data:

<!processedElements!>

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

## 5. Check your work.
- The foreign keys of all objects should reference the refId of another object if you can find any sort of object that makes sense to link it to.
- All refIds of any objects that act as parents (ie, there are other elements with foreign keys whose name makes sense in correspondence to an element name), should have a subordinate object. That is, no parent object should have two descendents any parent objects have zero.

# ERRORS TO AVOID: These have been seen and care should be taken to prevent them.
- ❌ Minor referential integrity issue with cross-worker hour report references
- ❌ **CRITICAL**: Hours report references Job RefId instead of Worker RefId (type mismatch)
- ❌ **MAJOR**: Fundamental foreign key relationship errors 
- 🚨 **TYPE MISMATCH ERROR**: worker_hours_paid_path.json workerRefId field contains Job RefId (instead of Worker RefId

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
				const result = match[1].trim();
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
		
		const extractionList = [
			getProcessedElements(extractionParameters),
		];
		const extractionFunction = defaultExtractionFunction({extractionList});
		
		const thinker = 'coherence-generator';

		const workingFunction = () => {
			return { promptTemplate, extractionParameters, extractionFunction, thinker };
		};

		dotD == undefined || dotD.library.add(moduleName, workingFunction);

		return { workingFunction };
	};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction({ moduleName });