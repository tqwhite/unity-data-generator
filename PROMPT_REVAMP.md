# Prompt Processing Chain Analysis

## Overview

This document analyzes the complete processing chain for AI prompt handling in the Unity Object Generator system, starting from xml-maker.js line 25. The goal is to understand the current architecture before restructuring to eliminate brittleness and improve clarity.

## Current Processing Chain

### **Step 1: Initialize Prompt Generator (xml-maker.js:25)**
```javascript
const promptGenerator = require('../lib/prompt-generator')({promptLibraryModulePath});
```
**File:** `/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/code/cli/lib.d/unity-data-generator/synthDataThinkers/xml-maker/xml-maker.js`

**What:** Creates a prompt generator instance with path to prompt library  
**Why:** Sets up the interface to access prompt templates and extraction functions

### **Step 2: Task Pipeline Setup (xml-maker.js:54-74)**
```javascript
const taskList = new taskListPlus();
// First task: Generate prompt elements
taskList.push((args, next) => {
    const promptElements = formulatePromptList(promptGenerator)(args);
    // ... logging ...
    next('', { ...args, promptElements });
});
```

**Data Flow:**
- **Input:** `args` (contains `latestWisdom`, `elementSpecWorksheetJson`)
- **Transform:** `formulatePromptList()` calls `promptGenerator.iterativeGeneratorPrompt()`
- **Output:** `promptElements` containing `{promptList, extractionParameters, extractionFunction}`

**What happens in prompt-generator.js:**
1. Loads prompt library: `require(promptLibraryModulePath)()`
2. Gets prompt config: `promptLibrary[employerModuleName]` (e.g., 'xml-maker')
3. Extracts: `{promptTemplate, extractionParameters, extractionFunction}`
4. Template replacement: `promptTemplate.qtTemplateReplace(replaceObj)`
5. Returns structured prompt data

**File:** `/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/code/cli/lib.d/unity-data-generator/synthDataThinkers/lib/prompt-generator.js`

**Why:** Separates prompt generation logic from execution. The prompt generator becomes a reusable component that can handle different thinker types.

### **Step 3: AI Request (xml-maker.js:79-88)**
```javascript
taskList.push((args, next) => {
    const { promptList } = promptElements;
    accessSmartyPants({ promptList, systemPrompt }, localCallback);
});
```

**Data Flow:**
- **Input:** `promptElements.promptList` (array of chat messages)
- **Transform:** `accessSmartyPants()` → `smartyPants.accessExternalResource()`  
- **Output:** Raw AI response as `wisdom` (string)

**What:** Sends formatted prompt to AI service and gets raw text response  
**Why:** Abstraction layer for AI communication - could swap different AI services

### **Step 4: Response Processing (xml-maker.js:93-107)**
```javascript
taskList.push((args, next) => {
    const { wisdom: rawWisdom, promptElements, latestWisdom } = args;
    const { extractionFunction } = promptElements;
    
    // Log raw response
    xLog.saveProcessFile(`${moduleName}_responseList.log`, ...);
    
    // Extract structured data
    const { generatedSynthData } = extractionFunction(rawWisdom);
    const wisdom = {...latestWisdom, generatedSynthData};
    
    next('', { ...args, wisdom });
});
```

**Data Flow:**
- **Input:** `rawWisdom` (raw AI response string)
- **Transform:** `extractionFunction(rawWisdom)` - parses delimited content
- **Output:** `wisdom` object with `generatedSynthData` (extracted XML)

**What:** Parses raw AI response to extract structured data using delimiters  
**Why:** AI returns unstructured text, but system needs clean XML data

### **Step 5: Pipeline Execution (xml-maker.js:112-123)**
```javascript
const initialData = {
    promptGenerator,
    formulatePromptList,
    accessSmartyPants,
    systemPrompt,
    ...args,
};
pipeRunner(taskList.getList(), initialData, (err, args) => {
    const { wisdom } = args;
    callback(err, { wisdom, args });
});
```

**Data Flow:**
- **Input:** `initialData` (all functions and initial args)
- **Transform:** `pipeRunner()` executes task pipeline sequentially
- **Output:** Final `wisdom` object with extracted, structured data

**What:** Executes the entire pipeline and returns results  
**Why:** Ensures sequential execution with error handling and data flow between steps

## Key Files in the System

### **Prompt Library Files:**
- Main entry: `/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/code/cli/lib.d/unity-data-generator/prompt-library/prompts.d/udg-v1/udg-v1.js`
- String libraries: `/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/code/cli/lib.d/unity-data-generator/prompt-library/prompts.d/udg-v1/stringsLib/defaultStrings/`
- Alternate strings: `/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/code/cli/lib.d/unity-data-generator/prompt-library/prompts.d/udg-v1/stringsLib/rev2/`

### **Thinker Implementations:**
- `/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/code/cli/lib.d/unity-data-generator/synthDataThinkers/xml-maker/xml-maker.js`
- `/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/code/cli/lib.d/unity-data-generator/synthDataThinkers/xml-review/xml-review.js`
- `/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/code/cli/lib.d/unity-data-generator/synthDataThinkers/fix-problems/fix-problems.js`

### **Supporting Infrastructure:**
- Prompt generator: `/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/code/cli/lib.d/unity-data-generator/synthDataThinkers/lib/prompt-generator.js`
- Orchestration: `/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/code/lib/qtools-ai-framework/lib/conversation-generator/conversation-generator.js`

## The Delimiter Problem

There are **three conflicting places** where delimiters are defined:

### **1. Hardcoded in Extraction Functions (udg-v1.js:30-31, 55-56):**
```javascript
const startDelimiter = '[START DATA SAMPLE]';
const endDelimiter = '[END DATA SAMPLE]';
```

### **2. In extractionParameters (udg-v1.js:101-102, 109-110, 118-121):**
```javascript
extractionParameters: {
    frontDelimiter: `[START DATA SAMPLE]`,
    backDelimiter: `[END DATA SAMPLE]`,
}
```

### **3. In Prompt Templates (maker.js:44-46):**
```javascript
<!frontDelimiter!>
 TESTING DATA XML GOES HERE
<!backDelimiter!>
```

**The Problem:** Extraction functions ignore the `extractionParameters` completely and use their own hardcoded values. The `extractionParameters` serve no functional purpose - they're just documentation.

## Architecture Assessment

### **Why This Architecture Exists**

1. **Pipeline Pattern:** Each step is isolated and testable. Data flows predictably through transformations.

2. **Separation of Concerns:** 
   - Prompt generation (reusable across thinkers)
   - AI communication (swappable AI services)  
   - Response parsing (prompt-specific extraction)

3. **Debugging Support:** Each step logs its input/output for troubleshooting

4. **Error Handling:** Pipeline stops on any step failure

### **Current Problem Areas**

1. **Delimiter Brittleness:** Hardcoded delimiters in extraction functions don't match configurable ones
2. **Double Processing:** xml-maker.js lines 102-103 calls `extractionFunction()` twice unnecessarily  
3. **Mixed Responsibilities:** `promptElements` contains both prompt data AND extraction logic
4. **Logging Inconsistency:** Some steps log, others don't

## Extraction Function Flow

### **How Extraction Functions Are Called:**

1. **Thinkers** (xml-maker, xml-review, fix-problems) load prompt templates and extraction functions from the prompt library
2. **AI response** comes back as raw text
3. **Extraction functions** parse the raw response using delimiters to extract structured data
4. **Processed data** flows through the conversation chain

The key call happens in each thinker:
```javascript
const { extractionFunction } = promptElements;
const { generatedSynthData } = extractionFunction(rawWisdom);
```

### **Extraction Function Patterns in udg-v1.js:**

#### **xml-maker & xml-review:**
```javascript
extractionFunction: extractionFunction([getgeneratedSynthData])
```

#### **fix-problems:**
```javascript
extractionFunction: extractionFunction([getgeneratedSynthData, getExplanation])
```

## Next Steps for Restructuring

1. **Fix Delimiter Problem:** Unify delimiter definitions - use `extractionParameters` consistently
2. **Clean Up Double Processing:** Remove redundant `extractionFunction()` calls  
3. **Separate Concerns:** Split prompt data from extraction logic
4. **Standardize Logging:** Consistent logging across all pipeline steps
5. **Improve Error Handling:** Better validation and error messages

The architecture is fundamentally sound but needs cleanup to be more maintainable and less brittle.