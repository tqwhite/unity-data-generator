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

## 1. Identify Keys and References
- **Primary Keys**: Look for properties named "refId" - these are unique identifiers for each object
- **Foreign Keys**: Look for properties ending in "RefId" or containing "refId" (except the primary "refId" itself) - these should reference other objects in the dataset

## 2. Analyze Current Relationships
- Map all refId values present in the dataset
- Identify all foreign key fields that should reference these refIds
- Check if foreign keys currently point to valid refIds within the dataset

## 3. Fix Referential Integrity
- **Update Foreign Keys**: Modify any foreign key values to reference actual refIds that exist in the current dataset
- **Maintain Logical Relationships**: Ensure relationships make sense (e.g., student references should point to actual student objects)
- **Preserve Data Structure**: Keep all other properties unchanged except for foreign key corrections

## 4. Add Rainbow Color Property for Debugging
- Add a "UDG_DEBUG_INDICATOR" property to each JSON object
- Use rainbow colors: red, orange, yellow, green, blue, indigo, violet
- Assign colors randomly but ensure variety across objects

# EXAMPLE
If you have objects with refIds: "abc-123", "def-456", "ghi-789"
Then foreign keys should only reference these three values, not random UUIDs.

# PROCESS INSTRUCTIONS
1. Parse each JSON object in the processedElements collection
2. Extract all refId values to create a reference map
3. Identify all foreign key properties (properties containing "refId" or ending in "RefId")
4. Update foreign keys to reference valid refIds from the dataset
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