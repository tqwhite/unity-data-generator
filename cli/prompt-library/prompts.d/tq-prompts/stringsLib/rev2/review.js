#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

//START OF moduleFunction() ============================================================
const moduleFunction = ({ moduleName } = {}) => () => {

	return `
Your task is to review and revise the provided XML Test Data to ensure it fully complies with the Object Standard Definition and is coherent and consistent.

**GUIDANCE FOR EVALUATING AND REVISING XML TO ENSURE THAT IT IS CORRECT**

- **Consistency with Object Standard Definition**: Ensure the XML Test Data matches the structure and specifications outlined in the Object Standard Definition.

- **Data Coherence**: Verify that fictitious data values align logically. For example, if a student's first name is "Joe" and the last name is "White," the full name should be "Joe White," not "Sam Smith."

- **Element Order**: Arrange the XML elements in the same order as they appear in the Object Standard Definition.

- **Exception Handling**: Do not include a top-level grouping element with multiple subordinates. For example, revise:

  <things>
    <thing>a</thing>
    <thing>b</thing>
  </things>

  to:

  <thing>a</thing>

**OBJECT STANDARD DEFINITION**

Here is the Object Standard Definition:

Here is the Object Standard Definition:

<!elementSpecWorksheetJson!>

**XML TEST DATA**

Here is the XML Test Data for review:

<!latestXml!>

**PROCESS INSTRUCTIONS**

1. **Compare XPath Order**: Extract XPaths from the XML Test Data and compare their order to those in the Object Standard Definition. Revise the XML Test Data to match the sequence. Mention any issues outside the XML delimiters.

2. **Ensure Data Coherence**: Review each value in the XML Test Data and adjust related values to ensure logical consistency. Coherence means that the fictitious data values align with each other in ways that make sense to the user of this testing data. For example, addresses of students should match that of the school. Within objects, the invented data needs to be consistent, eg, the student model has properties of first, last and full name. If the first is 'Joe' and the last is 'White', it would be incorrect to say the full name is 'Sam Smith'. The coherent value is 'Joe White'.

3. **Validate Attributes and Properties**: Check all attributes (e.g., 'RefId', 'Codeset') to ensure they are correctly implemented according to the Object Standard Definition.

4. **Additional Improvements**: Identify other enhancements to ensure the XML Test Data fulfills the Object Standard Definition and is easily understandable. Mention these ideas outside the XML delimiters.

**RESULT FORMATTING INSTRUCTIONS**

- **Response Structure**:
  - *Issues and Explanations*: Provide a brief summary of any issues found and the changes made.
  - *Revised XML*: Wrap the finished XML with delimiters like this:

<!frontDelimiter!>
 MERGED XML GOES HERE
<!backDelimiter!>

**IMPORTANT**

- Do not include any text except well-formed XML between the delimiters.
- Adherence to the Object Standard Definition is crucial, except for the specified exception regarding top-level grouping elements.


		`;
};

//END OF moduleFunction() ============================================================

	module.exports = moduleFunction({ moduleName });