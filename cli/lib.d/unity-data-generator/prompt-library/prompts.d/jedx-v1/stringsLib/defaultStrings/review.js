#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

//START OF moduleFunction() ============================================================
const moduleFunction =
	({ moduleName } = {}) =>
	({ dotD, passThroughParameters } = {}) => {
		const promptTemplate = `
This is the quality control step in a process that is generating JSON Test Data that matches a specification and has fictitious data values that resemble data that would occur in the real world. 

The requirements for the JSON are specified in the Object Standard Definition below. Your goal is to examine the JSON and make sure it is of the highest quality.

GUIDANCE FOR EVALUATING AND REVISING JSON TO INSURE THAT IT IS CORRECT

The main function is to compare the JSON Test Data to the Object Standard Definition and REVISE THE JSON TO INSURE THAT IT IS CONSISTENT, ACCURATELY REPRESENTS THE OBJECT STANDARD DEFINITION AND IS COHERENT.

Being coherent is important. For this, coherence means that the fictitious data values align with each other in ways that make sense to the user of this testing data. For example, addresses of students should match that of the school. Within objects, the invented data needs to be consistent, eg, the student model has properties of first, last and full name. If the first is 'Joe' and the last is 'White', it would be incorrect to say the full name is 'Sam Smith'. The coherent value is 'Joe White'.

The order of the JSON properties is also important. You should revise the JSON to insure that the properties appear in the same order as they appear in the Object Standard Definition.

An IMPORTANT EXCEPTION to adhering to the Object Standard Definition is that the JSON Test Data should NOT have unnecessary array wrapping with multiple items when only one object is needed. If there are redundant array structures that create multiple similar objects, choose the most complete and coherent one to keep.

OBJECT STANDARD DEFINITION

Here is the Object Standard Definition:

<!elementSpecWorksheetJson!>

JSON TEST DATA

Here is the JSON Test Data for review:

<!generatedSynthData!>

PROCESS INSTRUCTIONS

1) Examine the JSON paths from the JSON Test Data and compare the order to the order in the Object Standard Definition. Revise the JSON Test Data to make the sequence correct. Please mention any issues with this in your response.

2) Look at each value in the JSON Test Data and look for other values that relate to it. Use that to revise the entire JSON Test Data so that everything is coherent in the sense mentioned above. Please mention any issues with this in your response.

3) Look at the properties, refIds, codesets, and other required fields in the Object Standard Definition to make sure they are all of optimum correctness.

4) Think up other things you can do to make sure that the revised JSON Test Data fulfills the Object Standard Definition and is coherent and easily understandable to a person using it. Please mention these ideas in the response.

RESULT FORMATTING INSTRUCTIONS

Wrap the finished JSON with delimiters like this:

<!getgeneratedSynthData.frontDelimiter!>
 REVISED JSON GOES HERE
<!getgeneratedSynthData.backDelimiter!>

There should be *nothing* except well-formed, valid JSON between those delimiters.


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
		];
		const extractionFunction = defaultExtractionFunction({extractionList});
		
		const thinker='xml-review';

		const workingFunction = () => {
			return { promptTemplate, extractionParameters, extractionFunction, thinker };
		};

		dotD == undefined || dotD.library.add(moduleName, workingFunction, thinker);

		return { workingFunction };
	};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction({ moduleName });
