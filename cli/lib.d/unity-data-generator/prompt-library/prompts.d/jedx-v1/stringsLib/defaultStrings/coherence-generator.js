#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

//START OF moduleFunction() ============================================================
const moduleFunction =
	({ moduleName } = {}) =>
	({ dotD, passThroughParameters } = {}) => {
		const promptTemplate = `
# PRIMARY TASK DEFINITION
- Your task is to analyze multiple JSON objects for coherence and add a rainbow color property to each object.

# INPUT DATA
You will receive a collection of JSON objects in the processedElements data:

<!processedElements!>

# PROCESS INSTRUCTIONS
1. Parse each JSON object in the processedElements collection
2. Add a "rainbowColor" property to each JSON object 
3. Use rainbow colors: red, orange, yellow, green, blue, indigo, violet
4. Assign colors randomly but ensure variety across objects
5. Return the complete processedElements object with the new rainbowColor properties added

# RESULT FORMATTING INSTRUCTIONS
Always wrap the complete modified processedElements object in delimiters like this:

<!getProcessedElements.frontDelimiter!>
COMPLETE PROCESSED ELEMENTS OBJECT WITH RAINBOW COLORS GOES HERE
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