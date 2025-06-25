#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

//START OF moduleFunction() ============================================================
const moduleFunction =
	({ moduleName } = {}) =>
	({ dotD, passThroughParameters } = {}) => {
		const promptTemplate = `
Your task is to develop a JSON object that will be used as testing data for an educational data portability standard. This will be based on fictitious people and schools that we are going to make up. We will need to create details for students and classrooms, teaching various conventionally American educational topics. The standard has objects for all aspects of education and we will need to create details for all of the objects. An Object Standard Definition is provided below in the form of a JSON object with a property for each field in the JSON to be produced.

GUIDANCE FOR GENERATING CORRECT JSON

Coherency is important. For this, coherence means that the fictitious data values align with each other in ways that make sense to the user of this testing data. For example, addresses of students should match that of the school. Within objects, the invented data needs to be consistent, eg, the student model has properties of first, last and full name. If the first is 'Joe' and the last is 'White', it would be incorrect to say the full name is 'Sam Smith'. The coherent value is 'Joe White'.

The results are to be expressed in JSON, a structured data format. The Object Standard Definition contains JSON paths that describe the data element under consideration along with other details including a description and sometimes a codeset. You are to infer all data types from the context. If the name of a property says it is a list or is plural, you will generate an array with two sample items.

Conventions: Anything with 'refId' in its name is a UUID (IMPORTANT: UUIDs have the format: "32 hex digits grouped into chunks of 8-4-4-4-12"). If a property name is plural and it seems like the right thing to do, create an array with two objects for it. The specification has field names that sometimes correspond to the name of properties, eg, description. Do not be confused. You are still supposed to make up values for those fields, not use the text of the specification.

There are a few things that, working on this, you need to watch out for:

avoid dumb standard person names, eg, John or Jane Doe, Sam Smith, etc, in favor of ones that sound more interesting (but make sure that all names match ethnically). Do the same for other created names, choose less common alternatives.

repeating the same data in separate properties, eg, if there are two addresses or phone number properties in an object, they should be different when appropriate. Deciding if it's appropriate requires your judgment. Addresses referring to the same place should be the same.

OBJECT STANDARD DEFINITION

Here is the Object Standard Definition:

<!elementSpecWorksheetJson!>

A key point that should not be missed: If the path specification for an element contains [], it is an array and it's elements must *always* be enclosed in an array.

PROCESS INSTRUCTIONS

You should start by listing the properties to be produced. It is good to organize them by JSON path. Follow that by creating fictitious values for each property that make sense based on the definition, data element name and type information. Review them to insure that they are coherent in the meaning defined above. You should not include these lists in the response.

Once you have good data elements, build them into a JSON object based on the JSON paths. Review this for correctness in every way that you can think of. 

Note that the sequence of properties in the Object Standard Definition is IMPORTANT. The resulting JSON should have its properties appear in the same order.

RESULT FORMATTING INSTRUCTIONS

Always wrap the JSON part of your response in delimiters like this:

<!getgeneratedSynthData.frontDelimiter!>
 TESTING DATA JSON GOES HERE
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
		
		const thinker='xml-maker';

		const workingFunction = () => {
			return { promptTemplate, extractionParameters, extractionFunction, thinker };
		};

		dotD == undefined || dotD.library.add(moduleName, workingFunction);

		return { workingFunction };
	};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction({ moduleName });
