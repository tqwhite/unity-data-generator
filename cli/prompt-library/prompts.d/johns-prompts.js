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
				'johns-maker': {
					extractionParameters: {
						frontDelimiter: '[START XML SAMPLE]',
						backDelimitter: '[END XML SAMPLE]',
					},
					promptTemplate: `
		Your goal is to develop testing data for an educational data portability standard. This will be based on fictitious people and schools that we are going to make up. We will need to create details for students and classrooms, teaching various conventionally American educational topics. The standard has objects for all aspects of education and we will need to create details for all of the objects. They will be requested in small groups. You will have summaries of information developed in previous inquiries so that you can fabricate details that are consistent throughout the details.

Coherency is important. For this, coherence means that data values align with each other in ways that make sense to the user of this testing data. For example, addresses of students should match that of the school. Within objects, the invented data needs to be consistent, eg, the student model has properties of first, last and full name. If the first is 'Joe' and the last is 'White', it would be incorrect to say the full name is 'Sam Smith'. The coherent value is 'Joe White'.

The results are to be expressed in XML, the language of the data standard. You will be given xPaths that describe the data element under consideration along with other details, usually a description, sometimes a codeset. You are to infer all data types. If the name of an element says it is a list, you will generate two of the subordinate elements. 

Due to token limitations, the objects are built gradually. New data will be added to a preexisting object if it is supplied. The entire object should be revised when appropriate to make it consistent and coherent but no incumbent data should be lost. You should only create XML elements that are explicitly mentioned in either the preexisting object or the xPaths mentioned in the specifications to avoid creating erroneous elements that would be respected on subsequent passes.


Conventions: At signs (@) refer to attributes. Anything with 'refId' in its name is a UUID. If a property name is plural and it seems like the right thing to do, create two elements for it.  If the parent is singular and doesn't include the word 'List' you should assume you only need to create one element for it.  The specificaiton has field names that sometimes correspond to the name of elements, eg, description. Do not be confused. You still supposed to make up values for those fields, not use the text of the specification.

Always wrap the XML part of your response in delimiters like this:

<!frontDelimiter!>
 TESTING DATA XML GOES HERE
<!backDelimitter!>

There should be *nothing* except well-formed XML between those delimiters.
If you must chose between explanation and XML you must favor XML.
It is imperative that your response includes <!backDelimitter!> after <!frontDelimiter!>!

There are a few things that, working on this, you need to watch out for:

Repeating the same data in separate elements, eg, if there is are two addresses or phone number elements in an object, they should be different when appropriate. Deciding if it's appropriate requires your judgment. Addresses referring to the same place should be the same.

You are given the XPaths in document order. So when adding a new element to the XML it should always go at the end of the current parent.  Also when adding a new attribute to the XML should it always go at the end of the current element.

This is the preexisting object that you are enhancing based on the the new specifications.

Current XML:

<!potentialFinalObject!>

Using the following definition information, you are going to 

1) identify the corresponding element (or elements) in the current XML, 

2) if any are found, update those based on the definitions and present the revised elements as the new segment. 

If none are found in the current XML, create new elements according to the definition. 

It is imperative that you always express the entire XML object with NO elisions, commented references, and no omitted or summarized elements. Every single property and value from the preexisting element and newly generated data, all of the details must be shown. 

The testing data XML that is expressed should contain only the new (or updated) objects. If you found list elements, the containing element should be included.

Definition Information:

<!specObjJson!>

The 'Format' in the above can be either a comma separated list of valid codes (pick on at a time) or a regular expression.

Check the XML sample testing data to make sure it only has the correct elements and that they are consistent and coherent.


		`,
				},
				

				

				

				

				

				

				'johns-review': {
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
\t\t<Sub2> goodbye </Sub1>
\t</Example>
\t<Example RefId=\"123e4567-e89b-12d3-a456-426614174001\">
\t\t<Sub1> orange </Sub1>
\t\t<Sub2> black </Sub1>
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
\t\t<Sub2> goodbye </Sub1>
\t<NewSub>kitten</NewSub>
\t</Example>
\t<Example RefId=\"123e4567-e89b-12d3-a456-426614174001\">
\t\t<Sub1> orange </Sub1>
\t\t<Sub2> black </Sub1>
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
				

				

				

				

				
			};
		};

		dotD.library.add(moduleName, workingFunction);

		return { workingFunction };
	};

//END OF moduleFunction() ============================================================


module.exports = moduleFunction({ moduleName });
