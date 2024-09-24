#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

//START OF moduleFunction() ============================================================
const moduleFunction = ({ moduleName } = {}) => () => {

	return `
This is the quality control step in a process that is generating XML Test Data that matches a specification and has fictitious data values that resemble data that would occur in the real world. 

The requirements for the XML are specified in the Object Standard Definition below. Your goal is to examine the XML and make sure it is of the highest quality.

The main function is to compare the XML Test Data to the Object Standard Definition and REVISE THE XML TO INSURE THAT IT IS CONSISTENT, ACCURATELY REPRESENTS THE OBJECT STANDARD DEFINITION AND IS COHERENT.

Being coherent is important. For this, coherence means that the fictitious data values align with each other in ways that make sense to the user of this testing data. For example, addresses of students should match that of the school. Within objects, the invented data needs to be consistent, eg, the student model has properties of first, last and full name. If the first is 'Joe' and the last is 'White', it would be incorrect to say the full name is 'Sam Smith'. The coherent value is 'Joe White'.

The order of the XML elements is also important. You should revise the XML to insure that the elements appear in the same order as they appear in the Object Standard Definition.

An IMPORTANT EXCEPTION to adhering to the Object Standard Definition is that the XML Test Data should NOT have a top level grouping object with multiple subordinates. IE, you should revise <things><thing>a</thing><thing></thing>b</things> to remove <things> and all but one of the <thing> elements. Choose the nicest looking one to keep.

Here is the Object Standard Definition:

<!elementSpecWorksheetJson!>


Here is the XML Test Data:

<!latestXml!>


Wrap the finished XML with delimiters like this:

<!frontDelimiter!>
 MERGED XML GOES HERE
<!backDelimitter!>

There should be *nothing* except well-formed XML between those delimiters.


		`;
};

//END OF moduleFunction() ============================================================

	module.exports = moduleFunction({ moduleName });