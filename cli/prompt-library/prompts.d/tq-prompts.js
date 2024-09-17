#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

// const qt = require('qtools-functional-library'); //also exposes qtLog(); qt.help({printOutput:true, queryString:'.*', sendJson:false});

const os = require('os');
const path = require('path');
const fs = require('fs');

console.log(`HELLO FROM ${__dirname}/${moduleName}`);

// npm i qtools-functional-library
// npm i qtools-config-file-processor
// npm i qtools-parse-command-line
// npm i qtools-asynchronous-pipe-plus # often want this for later

//
// const commandLineParser = require('qtools-parse-command-line');
// const configFileProcessor = require('qtools-config-file-processor');
//
// const path=require('path');
// const fs=require('fs');
// const os=require('os');
//
// --------------------------------------------------------------------------------
// FIND PROJECT ROOT
// const findProjectRoot=({rootFolderName='system', closest=true}={})=>__dirname.replace(new RegExp(`^(.*${closest?'':'?'}\/${rootFolderName}).*$`), "$1");
// const projectRoot=findProjectRoot(); // call with {closest:false} if there are nested rootFolderName directories and you want the top level one
//--------------------------------------------------------------
// FIGURE OUT CONFIG
// const configName= os.hostname() == 'qMax.local' ? 'qbook' : '${configDirName}' ;
// const configDirPath = `${projectRoot}/configs/instanceSpecific/${configName}/`;
// const config = configFileProcessor.getConfig('systemParameters.ini', configDirPath)
//
//
// const commandLineParameters = commandLineParser.getParameters();
//
//
// console.dir({['config']:config}, { showHidden: false, depth: 4, colors: true });
// console.dir({['commandLineParameters']:commandLineParameters}, { showHidden: false, depth: 4, colors: true });

//START OF moduleFunction() ============================================================
const moduleFunction =
	({ moduleName } = {}) =>
	({ dotD }) => {
		const { xLog, getConfig, rawConfig, commandLineParameters } =
			process.global;
		const localConfig = getConfig(moduleName); //moduleName is closure

		const workingFunction = () => {
			return {
				'tqs-maker': {
					extractionParameters: {
						frontDelimiter: '[START XML SAMPLE]',
						backDelimitter: '[END XML SAMPLE]',
					},
					promptTemplate: `
		Your goal is to develop testing data for an educational data portability standard. This will be based on fictitious people and schools that we are going to make up. We will need to create details for students and classrooms, teaching various conventionally American educational topics. The standard has objects for all aspects of education and we will need to create details for all of the objects. They will be requested in small groups. You will have summaries of information developed in previous inquiries so that you can fabricate details that are consistent throughout the details.

Coherency is important. For this, coherence means that data values align with each other in ways that make sense to the user of this testing data. For example, addresses of students should match that of the school. Within objects, the invented data needs to be consistent, eg, the student model has properties of first, last and full name. If the first is 'Joe' and the last is 'White', it would be incorrect to say the full name is 'Sam Smith'. The coherent value is 'Joe White'.

The results are to be expressed in XML, the language of the data standard. You will be given xPaths that describe the data element under consideration along with other details, usually a description, sometimes a codeset. You are to infer all data types. If the name of an element says it is a list, you will generate two of the subordinate elements. 

Due to token limitations, the objects are built gradually. New data will be added to a preexisting object if it is supplied. The entire object should be revised when appropriate to make it consistent and coherent but no incumbent data should be lost. You should only create XML elements that are explicitly mentioned in either the preexisting object or the xPaths mentioned in the specifications to avoid creating erroneous elements that would be respected on subsequent passes.


Conventions: At signs (@) refer to attributes. Anything with 'refId' in its name is a UUID. If a property name is plural and it seems like the right thing to do, create two elements for it. The specificaiton has field names that sometimes correspond to the name of elements, eg, description. Do not be confused. You still supposed to make up values for those fields, not use the text of the specification.

Always wrap the XML part of your response in delimiters like this:

<!frontDelimiter!>
 TESTING DATA XML GOES HERE
<!backDelimitter!>

There should be *nothing* except well-formed XML between those delimiters.

There are a few things that, working on this, you need to watch out for:

repeating the same data in separate elements, eg, if there is are two addresses or phone number elements in an object, they should be different when appropriate. Deciding if it's appropriate requires your judgment. Addresses referring to the same place should be the same.

This is the preexisting object that you are enhancing based on the the new specifications.

Current XML:

<!currentXml!>

Using the following definition information, you are going to 

1) identify the corresponding element (or elements) in the current XML, 

2) if any are found, update those based on the definitions and present the revised elements as the new segment. 

If none are found in the current XML, create new elements according to the definition. 

It is imperative that you always express the entire XML object with NO elisions, commented references, and no omitted or summarized elements. Every single property and value from the preexisting element and newly generated data, all of the details must be shown. 

The testing data XML that is expressed should contain only the new (or updated) objects. If you found list elements, the containing element should be included.

Definition Information:

<!specObjJson!>

Check the XML sample testing data to make sure it only has the correct elements and that they are consistent and coherent.


		`,
				},
				'tqs-review': {
					extractionParameters: {
						frontDelimiter: '[START XML SAMPLE]',
						backDelimitter: '[END XML SAMPLE]',
					},
					promptTemplate: `
	Merge these new segment into the base to produce a final, merged object. Attributes of new segment elements should be applied to existing base elements. Review the object for consistency and coherence. if elements of the same type have the same refId, change them so they are all different UUIDs.

This is important, if the new segment has elements that are the same type as elements in the base, the new elements should be merged into the corresponding base elements. The merged XML should have at most two subordinate elements of the same type. Review the similar elements for repetition and revise the test data if necessary. It is crucial that all elements of the Base are retained. 

For example, you might get

example base

<Examples>
\t<Example RefId=\"123e4567-e89b-12d3-a456-426614174000\">
\t\t<Sub1> hello </Sub1>
\t\t<Sub2> goodbye </Sub2>
\t</Example>
\t<Example RefId=\"123e4567-e89b-12d3-a456-426614174001\">
\t\t<Sub1> orange </Sub1>
\t\t<Sub2> black </Sub2>
\t</Example>
</Examples>

example new segment:

<Example>
\t<NewSub>kitten</NewSub>
</Example>

The new merged element could look like this before you revise the facts 'kitten' to be different.

<Examples>
\t<Example RefId=\"123e4567-e89b-12d3-a456-426614174000\">
\t\t<Sub1> hello </Sub1>
\t\t<Sub2> goodbye </Sub2>
\t<NewSub>kitten</NewSub>
\t</Example>
\t<Example RefId=\"123e4567-e89b-12d3-a456-426614174001\">
\t\t<Sub1> orange </Sub1>
\t\t<Sub2> black </Sub2>
\t<NewSub>kitten</NewSub>
\t</Example>
</Examples>

It is crucial that all existing elements be kept and shown in your response. Never eliminate elements from the base. In the example below, notice that the elements Sub1 and Sub2 are retained with NewSub being added (then revised to prevent duplication). Never ever ever replace Base XML with comments such as, \"<!-- Existing Example data here -->\". That makes the result completely useless.

Example of merging new data while keeping elements: 

<Examples>
\t<Example RefId=\"123e4567-e89b-12d3-a456-426614174000\">
        <!-- Existing Example data here -->
\t\t<NewSub>kitten</NewSub>
\t</Example>
\t<Example RefId=\"123e4567-e89b-12d3-a456-426614174001\">
        <!-- Existing Example data here -->
\t\t<NewSub>kitten</NewSub>
\t</Example>
</Examples>

CRUCIAL POINT: NONE OF THE ELEMENTS (Examples, Sub1, etc) SHOWN IN THE EXAMPLES ABOVE SHOULD APPEAR IN THE RESULTING OBJECT. THEY ARE ILLUSTRATIONS ONLY.

Finally, the top level element requires a namespace identification. For this project it is:

 xmlns="http://www.sifassociation.org/datamodel/na/4.x"
 
EC,

<Example  xmlns="http://www.sifassociation.org/datamodel/na/4.x">
</Example>

Here is the real data:


Base:

<!potentialFinalObject!>

Merge this new segment. 

This merged element is to be a complete XML object for testing.

New segment:

<!newXmlSegment!>


Wrap the resulting XML with delimiters like this:

<!frontDelimiter!>
 MERGED XML GOES HERE
<!backDelimitter!>

There should be *nothing* except well-formed XML between those delimiters.


		`,
				},
				
				
				
				
				
				
				
				
				
				
				'fix-problems': {
					extractionParameters: {
						frontDelimiter: '[START XML SAMPLE]',
						backDelimitter: '[END XML SAMPLE]',
						explanationFrontDelimitter: '[START EXPLANATIONS]',
						explanationBackDelimitter: '[END EXPLANATIONS]',
					},
					promptTemplate: `
This project is the creation of valid, realistic test data objects for use in education software data exchange. The task at hand is to finalize 'current XML object' below by evaluating it in comparison to its semantic specification and to correct any XML validation errors that have been reported.


Here is the current XML object:

<!potentialFinalObject!>


Here is the semantic specification for this object. It is expressed as a JSON object with keys that are xPaths referring to the current XML object. 

<!xpathJsonData!>


An XML validator was run on the current XML object. Here is the result:

<!validationMessage!>

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
	• Make sure that the top level element includes the follow namespace declration: xmlns="http://www.sifassociation.org/datamodel/na/4.x"

INSTRUCTIONS

Please... 

1) revise the XML to solve the error(s) then 

2) compare the object and all of its values to the semantic specification. Make sure that the values match the explanation in the semantic specification then

3) since there can be many unwanted elements not found in the semantic specification, make sure ALL are removed then

4) review your work to make sure that all of the values are coherent with each other and finally

5) Go back over it one more time to make sure all three of the previous tasks were done correctly.

To facilliate subsequent processing, please format your output according to these instructions:

Wrap the resulting XML with delimiters like this:

<!frontDelimiter!>
 MERGED XML GOES HERE
<!backDelimitter!>

There should be *nothing* except well-formed XML between those delimiters.

Explain your reasoning for each step of the processing. Wrap the explanatory text with delimiters like this:

<!explanationFrontDelimitter!>
EXPLANATIONS GO HERE
<!explanationBackDelimitter!>



		`,
				},
				
			};
		};

		dotD.library.add(moduleName, workingFunction);

		return { workingFunction };
	};

//END OF moduleFunction() ============================================================


module.exports = moduleFunction({ moduleName });
