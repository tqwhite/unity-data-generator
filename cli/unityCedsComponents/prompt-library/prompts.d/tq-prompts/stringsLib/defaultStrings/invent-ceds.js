#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

//START OF moduleFunction() ============================================================
const moduleFunction = ({ moduleName } = {}) => () => {

	return `
Your task is to find the correct CEDS ID for the object specified by the Object Standard Definition.

OBJECT STANDARD DEFINITION

Here is the Object Standard Definition:

<!elementSpecWorksheetJson!>

Note that the first line contains the column names.

PROCESS INSTRUCTIONS

The OBJECT STANDARD DEFINITION above contains many element definitions. FIRST, go over the list and select the elements that need CEDS definitions by eliminating elements whose name begins with an @ (at sign) or whose type column specifies it as a type definition (those that have the phrase 'DataType' in its type column, eg, TextDataType). For those, the entire line should be removed from the list before trying to figure out the CEDS data type and should NOT HAVE ANY OBJECT in the result array.

CEDS is the federal Common Education Data Standard. IT should be included in your training data. 

You should evaluate each line in the filtered Object Standard Definition by looking at the description and data type, perhaps the data element name. You should use your knowledge of the CEDS data dictionary to find three or four candidates that might apply to this element. 

Once you have found candidates, you should decide which one most closely matches the object standard.

Please explain your reasoning for accepting or rejecting the candidates.

It is important that you ONLY CONSIDER EXISTING CEDS DEFINITIONS and never hallucinate or make up definitions.

The RESULT DATA should be the 
	CEDS ID, 
	The CEDS definition, 
	the CEDS URL for that definition, 
	the Object Standard xPath, 
	its name, 
	its definition,
	your evaluation of how confident you are about the choice
	an array containing the list of candidates you found

Express the result in JSON as an ARRAY of these objects. Eg,

{
	CEDS:{
		id: string,
		type: string,
		definition: string,
		url: string
	},
	OBJECT:{
		name: string,
		definition: string,
		xpath: string
	},
	CONFIDENCE: string
	CANDIDATES:[
		string,
		string,
		...
	]
}

OR, if there is no viable CEDS definition, use this form:

{
	CEDS:{
		error: 'NO CEDS DEFINTION FOUND'
	},
	OBJECT:{
		name: string,
		type: string,
		definition: string,
		xpath: string
	},
	CONFIDENCE: string
	CANDIDATES:[]
}

RESULT FORMATTING INSTRUCTIONS

Always wrap the XML part of your response in delimiters like this:

<!frontDelimiter!>
 RESULT DATA HERE
<!backDelimiter!>

There should be *nothing* except RESULT DATA between those delimiters. Explanation should follow.

		`;
};

//END OF moduleFunction() ============================================================

	module.exports = moduleFunction({ moduleName });