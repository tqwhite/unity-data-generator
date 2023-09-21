#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot


//START OF moduleFunction() ============================================================

const moduleFunction = ({config, commandLineParameters, moduleName}={})=>(args={})=>{


const prompts={
	"xml-maker": {
		"extractionParameters": {
			"frontDelimiter": "[START XML SAMPLE]",
			"backDelimitter": "[END XML SAMPLE]"
		},
		"promptTemplate": "Your goal is to develop testing data for an educational data portability standard. This will be based on fictitious people and schools that we are going to make up. We will need to create details for students and classrooms, teaching various conventionally American educational topics. The standard has objects for all aspects of education and we will need to create details for all of the objects. They will be requested in small groups. You will have summaries of information developed in previous inquiries so that you can fabricate details that are consistent throughout the details.\n\nCoherency is important. For this, coherence means that data values align with each other in ways that make sense to the user of this testing data. For example, addresses of students should match that of the school. Within objects, the invented data needs to be consistent, eg, the student model has properties of first, last and full name. If the first is 'Joe' and the last is 'White', it would be incorrect to say the full name is 'Sam Smith'. The coherent value is 'Joe White'.\n\nThe results are to be expressed in XML, the language of the data standard. You will be given xPaths that describe the data element under consideration along with other details, usually a description, sometimes a codeset. You are to infer all data types. If the name of an element says it is a list, you will generate two of the subordinate elements. \n\nDue to token limitations, the objects are built gradually. New data will be added to a preexisting object if it is supplied. The entire object should be revised when appropriate to make it consistent and coherent but no incumbent data should be lost. You should only create XML elements that are explicitly mentioned in either the preexisting object or the xPaths mentioned in the specifications to avoid creating erroneous elements that would be respected on subsequent passes.\n\n\nConventions: At signs (@) refer to attributes. Anything with 'refId' in its name is a UUID. If a property name is plural and it seems like the right thing to do, create two elements for it. The specificaiton has field names that sometimes correspond to the name of elements, eg, description. Do not be confused. You still supposed to make up values for those fields, not use the text of the specification.\n\nAlways wrap the XML part of your response in delimiters like this:\n\n<!frontDelimiter!>\n TESTING DATA XML GOES HERE\n<!backDelimitter!>\n\nThere should be *nothing* except well-formed XML between those delimiters.\n\nThere are a few things that, working on this, you need to watch out for:\n\nrepeating the same data in separate elements, eg, if there is are two addresses or phone number elements in an object, they should be different when appropriate. Deciding if it's appropriate requires your judgment. Addresses referring to the same place should be the same.\n\nThis is the preexisting object that you are enhancing based on the the new specifications.\n\nCurrent XML:\n\n<!currentXml!>\n\nUsing the following definition information, you are going to \n\n1) identify the corresponding element (or elements) in the current XML, \n\n2) if any are found, update those based on the definitions and present the revised elements as the new segment. \n\nIf none are found in the current XML, create new elements according to the definition. \n\nIt is imperative that you always express the entire XML object with NO elisions, commented references, and no omitted or summarized elements. Every single property and value from the preexisting element and newly generated data, all of the details must be shown. \n\nThe testing data XML that is expressed should contain only the new (or updated) objects. If you found list elements, the containing element should be included.\n\nDefinition Information:\n\n<!specObjJson!>\n\nCheck the XML sample testing data to make sure it only has the correct elements and that they are consistent and coherent.\n\n"
	},
	"xml-review": {
		"extractionParameters": {
			"frontDelimiter": "[START XML SAMPLE]",
			"backDelimitter": "[END XML SAMPLE]"
		},
		"promptTemplate": "Merge these new segment into the base to produce a final, merged object. Attributes of new segment elements should be applied to existing base elements. Review the object for consistency and coherence. if elements of the same type have the same refId, change them so they are all different UUIDs.\n\nThis is important, if the new segment has elements that are the same type as elements in the base, the new elements should be merged into the corresponding base elements. The merged XML should have at most two subordinate elements of the same type. Review the similar elements for repetition and revise the test data if necessary. It is crucial that all elements of the Base are retained. \n\nFor example, you might get\n\nexample base\n\n<Examples>\n\t<Example RefId=\"123e4567-e89b-12d3-a456-426614174000\">\n\t\t<Sub1> hello </Sub1>\n\t\t<Sub2> goodbye </Sub1>\n\t</Example>\n\t<Example RefId=\"123e4567-e89b-12d3-a456-426614174001\">\n\t\t<Sub1> orange </Sub1>\n\t\t<Sub2> black </Sub1>\n\t</Example>\n</Examples>\n\nexample new segment:\n\n<Example>\n\t<NewSub>kitten</NewSub>\n</Example>\n\nThe new merged element could look like this before you revise the facts 'kitten' to be different.\n\n<Examples>\n\t<Example RefId=\"123e4567-e89b-12d3-a456-426614174000\">\n\t\t<Sub1> hello </Sub1>\n\t\t<Sub2> goodbye </Sub1>\n\t<NewSub>kitten</NewSub>\n\t</Example>\n\t<Example RefId=\"123e4567-e89b-12d3-a456-426614174001\">\n\t\t<Sub1> orange </Sub1>\n\t\t<Sub2> black </Sub1>\n\t<NewSub>kitten</NewSub>\n\t</Example>\n</Examples>\n\nIt is crucial that all existing elements be kept and shown in your response. Never eliminate elements from the base. In the example below, notice that the elements Sub1 and Sub2 are retained with NewSub being added (then revised to prevent duplication). Never ever ever replace Base XML with comments such as, \"<!-- Existing Example data here -->\". That makes the result completely useless.\n\nExample of merging new data while keeping elements: \n\n<Examples>\n\t<Example RefId=\"123e4567-e89b-12d3-a456-426614174000\">\n        <!-- Existing Example data here -->\n\t\t<NewSub>kitten</NewSub>\n\t</Example>\n\t<Example RefId=\"123e4567-e89b-12d3-a456-426614174001\">\n        <!-- Existing Example data here -->\n\t\t<NewSub>kitten</NewSub>\n\t</Example>\n</Examples>\n\nHere is the real data:\n\n\nBase:\n\n<!potentialFinalObject!>\n\nMerge this new segment. \n\nThis merged element is to be a complete XML object for testing.\n\nNew segment:\n\n<!newXmlSegment!>\n\n\n\nWrap the resulting XML with delimiters like this:\n\n<!frontDelimiter!>\n MERGED XML GOES HERE\n<!backDelimitter!>\n\nThere should be *nothing* except well-formed XML between those delimiters.\n\n"
	},
	"; xml-review": {
		"promptTemplate": "\n; Simple repeat the text following the colon for debugging. Do not interpret. Just say it exactly:\n; <!frontDelimiter!>\n;  <mergedXmlResult />\n; <!backDelimitter!>\n; \n; "
	},
	"_segmentName": "prompt-generator"
}

	return prompts;
};

//END OF moduleFunction() ============================================================



module.exports = moduleFunction({moduleName});

//module.exports = moduleFunction({config, commandLineParameters, moduleName});

//module.exports = moduleFunction({moduleName})();

//module.exports = moduleFunction({config, commandLineParameters, moduleName})();
