#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

//START OF moduleFunction() ============================================================
const moduleFunction = ({ moduleName } = {}) => () => {

	return `
This project is the creation of valid, realistic test data objects for use in education software data exchange. The task at hand is to finalize 'current XML object' below by evaluating it in comparison to its semantic specification and to correct any XML validation errors that have been reported.


Here is the current XML object:

<!generatedSynthData!>


Here is the semantic specification for this object. It is expressed as a JSON object with keys that are xPaths referring to the current XML object. 

<!elementSpecWorksheetJson!>

ERROR REPORT SECTION

An XML validator was run on the current XML object. Here is the result:

<!validationMessagesString!>

GUIDANCE FOR CORRECTING JUDGING CORRECT XML

If there is an error, you MUST FIND A WAY TO CHANGE THE XML to make it better.

If there are XML validation errors, you should correct them, keeping in mind the semantic specification and the following instructions.

These XML validation errors are very technical and complex. You should read them carefully, step by step, look at the element it references and find a way to change the element prevent the error. The exact text of the validation error is very important.

WHEN YOU COMPLETE THE REVISIONS, PLEASE REVIEW THE RESULTING XML AND COMPARE IT TO MAKE SURE THE VALIDATION ERROR IS REPAIRED.

It is crucial that All elements marked as mandatory in thee semantic specification are present. You should create new, valid elements if any mandatory ones are missing. All semantic information must be correct.

If there are elements in the XML that do not have corresponding xPath specifications, they should be removed.

Coherency is important. For this purpose, coherence means that data values align with each other in ways that make sense to the user of this testing data. For example, addresses of students should match that of the school. Within objects, the invented data needs to be consistent, eg, the student model has properties of first, last and full name. If the first is 'Joe' and the last is 'White', it would be incorrect to say the full name is 'Sam Smith'. The coherent value is 'Joe White'.

The process that is generating these test data objects has had a particularly difficult time with coherence in categories and the specific type. Eg, the name of a classroom topic and the category. We have seen "Intro to English" categorized as "Mathematics". When you see problems like this, change the data to be coherent with sensitivity to the rest of the data in the object.

Sometimes there are codes from outside standards, eg, SCED, but there are others, Please evaluate them for coherence and match them to the other valurs in the object.


ADVICE FOR SOLVING COMMON PROBLEMS:

• "Cannot find the declaration of element X"

	• Sometimes previous generating steps create a list with multiple elements and then subsequent steps remove the unwanted grouping element. If there are multiple elements with the same name and no grouping element, discard all except one of them.

• "The root element is not specified in the semantic specification"

	• Often, the generating entity creates an enclosing parent element with a plural name, e.g., <Things><Thing>value</Thing></Things>. If there is no XPath for the plural parent element, remove the parent element and keep the most complete of the enclosed elements.

• "The markup in the document following the root element must be well-formed"

	• This issue often arises when a plural parent element is removed, leaving behind several elements that formed a list before the removal. To solve this problem, review the elements and delete all but the most well-formed, coherent one.

• "Invalid content was found"

	• Sometimes, elements that are neither in the semantic specification nor the XML are generated. It is crucial to carefully compare the XML to the xPaths in the semantic specification and eliminate elements that are not specified there.

• Any namespace error
	• Make sure that the top level element includes the follow namespace declaration: xmlns="http://www.sifassociation.org/datamodel/na/4.x"

• "not facet-valid with respect to pattern"
	• This is probably followed by a regular expression specification. Review the regular expression, look at the line/column number and make the value consistent with the regular expression. This usually means that a UUID is incorrect, ie, not a "32 hex digits grouped into chunks of 8-4-4-4-12".

PROCESS INSTRUCTIONS

Please... 

1) revise the XML to solve the error(s) then 

2) compare the object and all of its values to the semantic specification. Make sure that the values match the explanation in the semantic specification then

3) since there can be many unwanted elements not found in the semantic specification, make sure ALL are removed then

4) review your work to make sure that all of the values are coherent with each other and finally

5) Go back over it one more time to make sure all three of the previous tasks were done correctly.

6) Explain why you were not able to fix a "not facet-valid" error, if one is presented.


RESULT FORMATTING INSTRUCTIONS

To faciliate subsequent processing, please format your output according to these instructions:

Wrap the resulting XML with delimiters like this:

<!frontDelimiter!>
 MERGED XML GOES HERE
<!backDelimiter!>

There should be *nothing* except well-formed XML between those delimiters.

Explain your reasoning for each step of the processing. Wrap the explanatory text with delimiters like this:

<!explanationFrontDelimiter!>
EXPLANATIONS GO HERE
<!explanationBackDelimiter!>



		`;
};

//END OF moduleFunction() ============================================================

	module.exports = moduleFunction({ moduleName });