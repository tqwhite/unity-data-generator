#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

//START OF moduleFunction() ============================================================
const moduleFunction = ({ moduleName } = {}) => () => {

	return `
This is the quality control step in a process that is choosing the correct CEDS ID parameter for a data specification.

GUIDANCE

Read the object information and choose the suggestion that seems best.

SIF ELEMENT DEFINITION

Here is the Object Standard Definition:

<!elementDefinition!>

SUGGESTION LIST

Here is the XML Test Data for review:

<!suggestionList!>

PROCESS INSTRUCTIONS

1) Form a semantic understanding of the SIF 

	a) Evaluate the names of the properties in the suggestion list and then consider the definitions. Especially notice the description.

	b) Look at the segments of the xPath and factor them into your understanding.

2) Compose a brief summary of your understanding of the meaning of the data that would be represented by a value structured according to the sif element definition.

3) Read the SUGGESTION LIST and understand each of them.

4) Based on the semantic understanding of the element defintion that you have formed, evaluate each potential definition in the suggestion list and choose the best answer.

IMPORTANT NOTE: There have been occasions where this prompt chose the correct element definition but in the output put the wrong CEDS ID. It appears to have been a typo. Please check the output to make sure that all elements are correct.

RESULT FORMATTING INSTRUCTIONS

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
	CEDS_RECOMMENDATION:{
		id: string,
		type: string,
		definition: string,
		url: string
	},
	SIF_ELEMENT:{
		name: string,
		definition: string,
		xpath: string,
		origCeds: string
	},
	CONFIDENCE: string
	CANDIDATES:[
		"candidate Description (CEDS ID: candidate ID)",
		"candidate Description (CEDS ID: candidate ID)",
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


EXPLANATION GOES HERE AT THE END

There should be *nothing* except RESULT DATA between those delimiters. Explanation should follow.

		`;
};

//END OF moduleFunction() ============================================================

	module.exports = moduleFunction({ moduleName });