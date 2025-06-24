#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, ''); //this just seems to come in handy a lot

//START OF moduleFunction() ============================================================
const moduleFunction = ({ moduleName } = {}) => () => {

	return `
---
**Project Overview**

This project involves creating valid, realistic XML test data objects for educational software data exchange. Your task is to finalize the "Current XML Object" by:

1. **Evaluating** it against its semantic specification.
2. **Correcting** any XML validation errors reported below.

---

**Current XML Object**

<!generatedSynthData!>

**Semantic Specification**

The semantic specification for this object is provided as a JSON object with keys representing xPaths referring to the current XML object:

<!elementSpecWorksheetJson!>

**Error Report**

An XML validator has been run on the current XML object. The results are as follows:

<!validationMessagesString!>

---

**Guidance for Correcting the XML**

- **Mandatory Elements**: Ensure all elements marked as mandatory in the semantic specification are present. Create new, valid elements if any are missing.

- **Remove Unspecified Elements**: If there are elements in the XML without corresponding xPath specifications, **remove them**.

- **Coherency**: Data values must align logically. For example:
  - A student's address should match that of the school.
  - Names should be consistent across properties. If the first name is "Joe" and the last name is "White," the full name should be "Joe White," not "Sam Smith."
  - Course categories should match course names. For example, "Intro to English" should not be categorized as "Mathematics."

- **External Codes**: Evaluate codes from external standards (e.g., SCED) for coherence and ensure they match other values in the object.

---

**Advice for Common Validation Errors**

1. **"Cannot find the declaration of element X"**

   - **Solution**: If multiple elements with the same name exist without a grouping element, retain only one of them.

2. **"The root element is not specified in the semantic specification"**

   - **Solution**: Remove any unnecessary plural parent elements and keep the most complete enclosed element.

3. **"The markup in the document following the root element must be well-formed"**

   - **Solution**: Delete any extra root-level elements so that only one root element remains.

4. **"Invalid content was found"**

   - **Solution**: Remove any elements not specified in the semantic specification.

5. **Namespace Errors**

   - **Solution**: Ensure the top-level element includes the namespace declaration:

     xmlns="http://www.sifassociation.org/datamodel/na/4.x"

6. **"Not facet-valid with respect to pattern"**

   - **Solution**: Correct the value to match the required pattern, such as fixing an improperly formatted UUID (e.g., "32 hex digits grouped into chunks of 8-4-4-4-12").

---

**Process Instructions**

Please follow these steps:

1. **Revise the XML**: Correct the errors as per the guidance above. IT IS MANDATORY THAT REVISIONS BE MADE TO THE XML TO FIX VALIDATION ERRORS. IT IS INCORRECT TO OUTPUT THE XML UNCHANGED IF ERRORS ARE LISTED.

2. **Validate Against Semantic Specification**: Ensure all values match the explanations in the semantic specification.

3. **Remove Unwanted Elements**: Eliminate any elements not found in the semantic specification.

4. **Check for Coherency**: Review the data for logical consistency.

5. **Final Review**: Go over all **four** of the previous tasks to ensure completeness and correctness.

6. **Handling "Not Facet-Valid" Errors**: If you cannot fix such an error, provide an explanation.

---

**Result Formatting Instructions**

- **XML Output**: Wrap the corrected XML with the following delimiters:

  <!frontDelimiter!>
  [Your Corrected XML Here]
  <!backDelimiter!>

  - Ensure there is **nothing** except well-formed XML between these delimiters.

- **Explanation**: Provide your reasoning for each processing step, wrapped with these delimiters:

<!frontDelimiter!>
EXPLANATIONS GO HERE
<!backDelimiter!>

---

		`;
};

//END OF moduleFunction() ============================================================

	module.exports = moduleFunction({ moduleName });