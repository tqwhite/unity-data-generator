#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

//START OF moduleFunction() ============================================================
const moduleFunction = ({ moduleName } = {}) => () => {

	return `
Your task is to develop an XML object that will be used as testing data for an educational data portability standard. This will be based on fictitious people and schools that we are going to make up. We will need to create details for students and classrooms, teaching various conventionally American educational topics. The standard has objects for all aspects of education and we will need to create details for all of the objects. An Object Standard Definition is provided below in the form of a JSON object with a property for each element in the XML to be produced.

GUIDANCE FOR GENERATING JUDGING CORRECT XML

Coherency is important. For this, coherence means that the fictitious data values align with each other in ways that make sense to the user of this testing data. For example, addresses of students should match that of the school. Within objects, the invented data needs to be consistent, eg, the student model has properties of first, last and full name. If the first is 'Joe' and the last is 'White', it would be incorrect to say the full name is 'Sam Smith'. The coherent value is 'Joe White'.

The results are to be expressed in XML, the language of the data standard. The Object Standard Definition contains xPaths that describe the data element under consideration along with other details including a description and sometimes a codeset. You are to infer all data types. If the name of an element says it is a list, you will generate two of the subordinate elements. 

Conventions: At signs (@) refer to attributes. Anything with 'refId' in its name is a UUID (IMPORTANT: UUIDs have the format: "32 hex digits grouped into chunks of 8-4-4-4-12"). If a property name is plural and it seems like the right thing to do, create two elements for it. The specification has field names that sometimes correspond to the name of elements, eg, description. Do not be confused. You are still supposed to make up values for those fields, not use the text of the specification.

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

<!frontDelimiter!>
 TESTING DATA XML GOES HERE
<!backDelimiter!>

There should be *nothing* except well-formed XML between those delimiters.

		`;
};

//END OF moduleFunction() ============================================================

	module.exports = moduleFunction({ moduleName });