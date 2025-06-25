#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

//START OF moduleFunction() ============================================================
const moduleFunction =
	({ moduleName } = {}) =>
	({ dotD, passThroughParameters } = {}) => {
		const promptTemplate = `
This project is the creation of valid, realistic test data objects for use in education software data exchange. The task at hand is to finalize 'current JSON object' below by evaluating it in comparison to its semantic specification and to correct any JSON validation errors that have been reported.


Here is the current JSON object:

<!generatedSynthData!>


Here is the semantic specification for this object. It is expressed as a JSON object with keys that are JSON paths referring to the current JSON object. 

<!elementSpecWorksheetJson!>

ERROR REPORT SECTION

A JSON validator was run on the current JSON object. Here is the result:

<!validationMessagesString!>

GUIDANCE FOR CORRECTING JSON VALIDATION ISSUES

If there is an error, you MUST FIND A WAY TO CHANGE THE JSON to make it better.

If there are JSON validation errors, you should correct them, keeping in mind the semantic specification and the following instructions.

These JSON validation errors are very technical and complex. You should read them carefully, step by step, look at the property it references and find a way to change the property to prevent the error. The exact text of the validation error is very important.

WHEN YOU COMPLETE THE REVISIONS, PLEASE REVIEW THE RESULTING JSON AND COMPARE IT TO MAKE SURE THE VALIDATION ERROR IS REPAIRED.

It is crucial that all properties marked as mandatory in the semantic specification are present. You should create new, valid properties if any mandatory ones are missing. All semantic information must be correct.

If there are properties in the JSON that do not have corresponding JSON path specifications, they should be removed.

Coherency is important. For this purpose, coherence means that data values align with each other in ways that make sense to the user of this testing data. For example, addresses of students should match that of the school. Within objects, the invented data needs to be consistent, eg, the student model has properties of first, last and full name. If the first is 'Joe' and the last is 'White', it would be incorrect to say the full name is 'Sam Smith'. The coherent value is 'Joe White'.

The process that is generating these test data objects has had a particularly difficult time with coherence in categories and the specific type. Eg, the name of a classroom topic and the category. We have seen "Intro to English" categorized as "Mathematics". When you see problems like this, change the data to be coherent with sensitivity to the rest of the data in the object.

Sometimes there are codes from outside standards, eg, SCED, but there are others, Please evaluate them for coherence and match them to the other values in the object.


ADVICE FOR SOLVING COMMON JSON PROBLEMS:

• "Property is not defined in specification"

	• Sometimes previous generating steps create properties that are not in the specification. If there are properties in the JSON that don't have corresponding JSON path specifications, remove them.

• "Missing required property"

	• If the specification indicates a property is mandatory but it's missing from the JSON, create a new property with appropriate fictitious data that matches the specification's requirements.

• "Invalid JSON structure"

	• This issue often arises when arrays are nested incorrectly or objects are malformed. Review the JSON structure and ensure it follows proper JSON syntax with correct brackets, braces, and commas.

• "Type mismatch" 

	• Sometimes properties that should be strings are generated as numbers or vice versa. Carefully compare the JSON values to the specification and ensure data types match expectations (string, number, boolean, array, object).

• "Duplicate properties"

	• JSON objects cannot have duplicate property names. If you find duplicate properties, keep the most complete and coherent one and remove the others.

• "Invalid UUID format"
	• UUIDs must follow the pattern: "32 hex digits grouped into chunks of 8-4-4-4-12" (e.g., "550e8400-e29b-41d4-a716-446655440000"). If a refId or other UUID field doesn't match this pattern, generate a properly formatted UUID.

PROCESS INSTRUCTIONS

Please... 

1) revise the JSON to solve the error(s) then 

2) compare the object and all of its values to the semantic specification. Make sure that the values match the explanation in the semantic specification then

3) since there can be many unwanted properties not found in the semantic specification, make sure ALL are removed then

4) review your work to make sure that all of the values are coherent with each other and finally

5) Go back over it one more time to make sure all four of the previous tasks were done correctly.

6) Explain why you were not able to fix a validation error, if one is presented.


RESULT FORMATTING INSTRUCTIONS

To facilitate subsequent processing, please format your output according to these instructions:

Wrap the resulting JSON with delimiters like this:

<!getgeneratedSynthData.frontDelimiter!>
 CORRECTED JSON GOES HERE
<!getgeneratedSynthData.backDelimiter!>

There should be *nothing* except well-formed, valid JSON between those delimiters.

Explain your reasoning for each step of the processing. Wrap the explanatory text with delimiters like this:

<!getExplanation.frontDelimiter!>
EXPLANATIONS GO HERE
<!getExplanation.backDelimiter!>


		`;
			const extractionParameters = {
				getgeneratedSynthData: {
					frontDelimiter: `[START DATA SAMPLE]`,
					backDelimiter: `[END DATA SAMPLE]`,
				},
				getExplanation: {
					frontDelimiter: `[START EXPLANATIONS]`,
					backDelimiter: `[END EXPLANATIONS]`,
				},
			};

		const { extractionLibrary, defaultExtractionFunction } =
			passThroughParameters;

		const extractionList=[
			extractionLibrary.getgeneratedSynthData(extractionParameters),
			extractionLibrary.getExplanation(extractionParameters),
		];
		const extractionFunction = defaultExtractionFunction({extractionList});
		
		const thinker='fix-problems';

		const workingFunction = () => {
			return { promptTemplate, extractionParameters, extractionFunction, thinker };
		};

		dotD == undefined || dotD.library.add(moduleName, workingFunction);

		return { workingFunction };
	};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction({ moduleName });
