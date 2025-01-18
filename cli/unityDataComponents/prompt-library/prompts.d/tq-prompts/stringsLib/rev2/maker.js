#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

//START OF moduleFunction() ============================================================
const moduleFunction = ({ moduleName } = {}) => () => {

	return `
Your task is to develop an XML object that will be used as testing data for an educational data portability standard. This will be based on fictitious people and schools that we are going to make up. We will need to create details for students and classrooms, teaching various conventionally American educational topics. The standard has objects for all aspects of education and we will need to create details for all of the objects. An Object Standard Definition is provided below in the form of a JSON object with a property for each element in the XML to be produced.

**GUIDELINES**:

- **Coherence**: Ensure that all data values are logically consistent. For example, if a student's address is provided, it should be consistent with the school's location if appropriate.

- **Consistency**: Within objects, maintain consistency in data values. For example, if the first name is 'Joe' and the last name is 'White,' it would be incorrect to say the full name is 'Sam Smith.' The correct full name is 'Joe White.'

**CONVENTIONS**:

- **Attributes**: Elements starting with '@' are **ATTRIBUTES** in the XML.

- **UUIDs**: Any element or attribute containing '**RefId**' is a UUID in the format of 32 hexadecimal digits, displayed in five groups separated by hyphens, following the pattern '**8-4-4-4-12**' (e.g., '550e8400-e29b-41d4-a716-446655440000').

- **Plural Elements**: If an element name is plural, create **TWO INSTANCES** of its subordinate elements when appropriate.

- **Enumerations**: For elements with a '**Format**' field listing specific values (e.g., 'YesReportingOffenses', 'YesNoReportedOffenses', 'No', 'NA'), **SELECT ONE** of those values for the element.

**OBJECT STANDARD DEFINITION**:

The following Object Standard Definition is drawn from the **SIF** standard:

<!elementSpecWorksheetJson!>

**PROCESS INSTRUCTIONS**:

1. **Element Listing**: List and organize the elements by their 'XPath'. **DO NOT** include this list in your response.

2. **Value Generation**:

   - Create **FICTITIOUS VALUES** for each element, ensuring they are **COHERENT** and match the expected **DATA TYPES**.

   - For UUIDs, **GENERATE UNIQUE IDENTIFIERS** following the specified format.

   - For elements with a '**Format**' field listing specific values, **SELECT ONE VALUE** from the list.

3. **XML Assembly**:

   - Construct the XML object using the provided '**XPath**'s, adhering to **SIF** standards.

   - **FOLLOW THE SEQUENCE** of elements as listed in the '**Object Standard Definition**'.

   - Include **OPTIONAL ELEMENTS** unless specified otherwise.

4. **Validation**:

   - Ensure the XML is **WELL-FORMED** and adheres to the definitions and conventions of **SIF**.

   - Validate that all **DATA TYPES** are correctly represented (e.g., strings, tokens).

5. **Output**:

   - Provide **ONLY** the XML content within the specified delimiters.

**RESULT FORMATTING INSTRUCTIONS**:

- **Output Format**: Wrap the XML in the following delimiters, with **NO ADDITIONAL TEXT**:

<!frontDelimiter!>
 TESTING DATA XML GOES HERE
<!backDelimiter!>

There should be *nothing* except well-formed XML between those delimiters.

		`;
};

//END OF moduleFunction() ============================================================

	module.exports = moduleFunction({ moduleName });