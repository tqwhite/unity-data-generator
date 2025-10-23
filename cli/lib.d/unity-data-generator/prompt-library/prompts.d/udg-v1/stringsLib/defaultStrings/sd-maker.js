#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

//START OF moduleFunction() ============================================================
const moduleFunction =
	({ moduleName } = {}) =>
	({ dotD, passThroughParameters } = {}) => {
		const promptTemplate = `
Your task is to develop an XML object that will be used as testing data for an educational data portability standard (xmlns="http://www.sifassociation.org/datamodel/na/4.x" should be injected into the top-level element). This will be based on fictitious people and schools that we are going to make up. We will need to create details for students and classrooms, teaching various conventionally American educational topics. The standard has objects for all aspects of education and we will need to create details for all of the objects. An Object Standard Definition is provided below in the form of a JSON object with a property for each element in the XML to be produced.

GUIDANCE FOR GENERATING JUDGING CORRECT XML

Coherency is important. For this, coherence means that the fictitious data values align with each other in ways that make sense to the user of this testing data. For example, addresses of students should match that of the school. Within objects, the invented data needs to be consistent, eg, the student model has properties of first, last and full name. If the first is 'Joe' and the last is 'White', it would be incorrect to say the full name is 'Sam Smith'. The coherent value is 'Joe White'.

The results are to be expressed in XML, the language of the data standard. The Object Standard Definition contains xPaths that describe the data element under consideration along with other details including a description and sometimes a codeset. You are to infer all data types. If the name of an element says it is a list, you will generate two of the subordinate elements. 

Conventions: At signs (@) refer to attributes. **Anything with 'refId' in its name should use the exact token: <!REFIDGOESHERE!>** (This will be replaced with unique UUIDs during post-processing). If a property name is plural and it seems like the right thing to do, create two elements for it. The specification has field names that sometimes correspond to the name of elements, eg, description. Do not be confused. You are still supposed to make up values for those fields, not use the text of the specification.

There are a few things that, working on this, you need to watch out for:

avoid dumb standard person names, eg, John or Jane Doe, Sam Smith, etc, in favor of ones that sound more interesting (but make sure that all names match ethnically). Do the same for other created names, choose less common alternatives.

repeating the same data in separate elements, eg, if there is are two addresses or phone number elements in an object, they should be different when appropriate. Deciding if it's appropriate requires your judgment. Addresses referring to the same place should be the same.

OBJECT STANDARD DEFINITION

Here is the Object Standard Definition:

<!elementSpecWorksheetJson!>

PROCESS INSTRUCTIONS

You should start by listing the elements to be produced. It is good to organize them by xPath. Follow that by creating fictitious values for each element that make sense based on the definition, data element name and type information. Review them to insure that they are coherent in the meaning defined above. You should not include these lists in the response.

Once you have good data elements, build them into an XML object based on the xPaths. Review this for correctness in every way that you can think of. 

Note that the sequence of elements in the Object Standard Definition is IMPORTANT. The resulting XML should have its elements appear in the same order.

RESULT FORMATTING INSTRUCTIONS

Always wrap the XML part of your response in delimiters like this:

<!getgeneratedSynthData.frontDelimiter!>
 TESTING DATA XML GOES HERE
<!getgeneratedSynthData.backDelimiter!>

There should be *nothing* except well-formed XML between those delimiters.

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

		// Define refId replacement token
		const refIdReplacementToken = '<!REFIDGOESHERE!>';

		
		const extractionList=[
			extractionLibrary.getgeneratedSynthData(extractionParameters),
		];
		const extractionFunction = defaultExtractionFunction({extractionList});
		
		const thinker='sd-maker';

		// UUID generation function
		const generateUuid = () => {
			const crypto = require('crypto');
			const randomBytes = crypto.randomBytes(16);
			
			// Set version (4) and variant bits
			randomBytes[6] = (randomBytes[6] & 0x0f) | 0x40; // Version 4
			randomBytes[8] = (randomBytes[8] & 0x3f) | 0x80; // Variant bits
			
			// Convert to hex string with dashes
			const hex = randomBytes.toString('hex');
			return [
				hex.substring(0, 8),
				hex.substring(8, 12),
				hex.substring(12, 16),
				hex.substring(16, 20),
				hex.substring(20, 32)
			].join('-');
		};

		// Tool functions for data processing
		const tools = {
			afterAiProcess: (wisdom) => {
				const { xLog } = process.global;
				if (!wisdom || !wisdom.generatedSynthData) {
					xLog.status('UDG SD-Maker Tools: No generatedSynthData found in wisdom');
					return wisdom;
				}
				
				try {
					// Convert to string if it's an object
					let dataString = typeof wisdom.generatedSynthData === 'string' 
						? wisdom.generatedSynthData 
						: JSON.stringify(wisdom.generatedSynthData);
					
					// Find all refId tokens and replace with unique UUIDs
					const tokenPattern = new RegExp(refIdReplacementToken, 'g');
					const matches = dataString.match(tokenPattern);
					
					if (matches) {
						
						// Replace each token with a unique UUID
						dataString = dataString.replace(tokenPattern, () => generateUuid());
						
						// Parse back to object if it was originally an object
						const updatedData = typeof wisdom.generatedSynthData === 'string' 
							? dataString 
							: JSON.parse(dataString);

						return {
							...wisdom,
							generatedSynthData: updatedData
						};
					} else {
						xLog.status(`UDG SD-Maker Tools: No ${refIdReplacementToken} tokens found`);
						return wisdom;
					}
				} catch (error) {
					xLog.error(`UDG SD-Maker Tools: Error in afterAiProcess: ${error.message}`);
					throw error;
				}
			}
		};

		const workingFunction = () => {
			return { 
				promptTemplate,
				extractionParameters, 
				extractionFunction, 
				thinker, 
				tools
			};
		};

		dotD == undefined || dotD.library.add(moduleName, workingFunction);

		return { workingFunction };
	};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction({ moduleName });
