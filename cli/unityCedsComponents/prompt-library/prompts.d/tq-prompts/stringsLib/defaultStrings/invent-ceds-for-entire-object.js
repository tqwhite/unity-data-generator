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

This is a JSON representation of a data element that needs to be associated with a CEDS definition.

CONTEXT

CEDS is the federal Common Education Data Standard. It was included in your training data. 

You should evaluate the Object Standard Definition by looking at the description and data type, perhaps the data element name. The elements of the xPath might also be informative.

PROCESS INSTRUCTIONS

First, read each property in the object standard definition and understand the relationship between the property name and its value.

Some are special. The xPath can be broken into path segments that can inform the meaning and purpose of the object.

You should use your knowledge of the CEDS data dictionary to find three or four candidates that might apply to this element. 

The name of the object is a camel-case string that can be broken into parts that can also inform your understanding of the element.

And, of course the description and other information are very important.

Next, choose a few possible candidates from the CEDS dictionary. These should correspond to the description first but ambiguity should be resolved by your analysis of the other elements.

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
		error: 'NO CEDS DEFINITION FOUND'
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


EXPLANATION GOES HERE AT THE END

There should be *nothing* except RESULT DATA between those delimiters. Explanation should follow.

		`;
};

//END OF moduleFunction() ============================================================

	module.exports = moduleFunction({ moduleName });