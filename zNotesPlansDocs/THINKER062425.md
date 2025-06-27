# Thinker Architecture Guide - qtools-ai-framework

*Last Updated: June 24, 2025*

## Overview

This document captures everything learned about thinkers and their processing within the qtools-ai-framework. Thinkers are the core processing units that receive AI-generated content and transform it through the framework's orchestration system.

## Framework Architecture

### Core Principle: Content Agnosticism

The qtools-ai-framework is **completely content-agnostic**. It knows nothing about:
- What data properties exist in `latestWisdom`
- What thinkers do with the data
- What format the data is in (XML, JSON, etc.)

The framework only orchestrates the flow of data through thinker sequences.

### Key Framework Services

**Location**: `/lib/qtools-ai-framework/lib/`

1. **conversation-generator**: Orchestrates thinker execution sequences
2. **facilitators**: Control conversation flow patterns (get-answer, answer-until-valid)
3. **prompt-generator**: Framework-level template substitution service
4. **smarty-pants-chooser**: AI provider abstraction (OpenAI, Claude, etc.)
5. **task-runner**: Executes facilitator chains
6. **x-log**: Structured logging with process file management

## Thinker Architecture

### What Thinkers Are

- **Application-provided modules**, NOT framework components
- Receive pre-configured services via dependency injection
- Transform `latestWisdom` objects through AI interactions
- Located in application directories (e.g., `/cli/lib.d/unity-data-generator/synthDataThinkers/`)

### Thinker Function Signatures

#### Module Instantiation
```javascript
const moduleFunction = function (args = {}) {
    // Extract framework services (dependency injection)
    const { xLog, getConfig } = process.global;
    const { thinkerParameters={}, promptGenerator } = args;
    
    // Configuration precedence: local > allThinkers > config file
    const localThinkerParameters = thinkerParameters.qtGetSurePath(moduleName, {});
    const allThinkersParameters = thinkerParameters.qtGetSurePath('allThinkers', {});
    const configFromSection = getConfig(moduleName);
    const finalConfig = { ...configFromSection, ...allThinkersParameters, ...localThinkerParameters };
    
    const { thinkerSpec, smartyPants } = args;
    
    return { executeRequest };
};
```

#### executeRequest Function
```javascript
const executeRequest = (args, callback) => {
    // Input args structure:
    const {
        latestWisdom,           // Accumulated data object from previous thinkers
        promptGenerator,        // Pre-configured template service (injected)
        elementSpecWorksheetJson, // Application-specific data
        thinkerSpec,           // Thinker configuration
        smartyPants,           // AI provider service
        // ... other application-specific properties
    } = args;
    
    // Process data through AI interaction
    // Transform latestWisdom and return new wisdom
    
    callback(err, { 
        wisdom: newWisdom,     // Updated latestWisdom object
        args: processedArgs    // Updated args with results
    });
};
```

### latestWisdom Data Flow

The `latestWisdom` object accumulates application-specific properties as it flows through thinkers:

```javascript
// Initial state (varies by application)
latestWisdom = {
    initialThinkerData: { /* application data */ }
}

// After xml-maker thinker
latestWisdom = {
    initialThinkerData: { /* application data */ },
    generatedSynthData: "<!-- Generated XML/JSON content -->",
    explanation: "AI explanation of the generation process"
}

// After xml-review thinker
latestWisdom = {
    initialThinkerData: { /* application data */ },
    generatedSynthData: "<!-- Revised XML/JSON content -->", // Overwrites previous
    explanation: "AI explanation of the review process"
}

// After check-validity thinker  
latestWisdom = {
    initialThinkerData: { /* application data */ },
    generatedSynthData: "<!-- Final XML/JSON content -->",
    explanation: "AI explanation",
    isValid: true,
    validationMessage: "Validation successful"
}
```

## AI Integration Patterns

### Standard AI Interaction Pattern

```javascript
// 1. Generate prompts using injected promptGenerator
const formulatePromptList = (promptGenerator) => ({ latestWisdom }) => {
    return promptGenerator.iterativeGeneratorPrompt({
        ...latestWisdom,
        employerModuleName: moduleName,
    });
};

// 2. Call AI service
const accessSmartyPants = (args, callback) => {
    let { promptList, systemPrompt } = args;
    promptList.unshift({ role: 'system', content: systemPrompt });
    smartyPants.accessExternalResource({ promptList }, callback);
};

// 3. Extract and process results
const extractedData = extractionFunction(rawWisdom);
const wisdom = {...latestWisdom, ...extractedData}; // Merge results
```

### smartyPants.accessExternalResource Call

```javascript
smartyPants.accessExternalResource({
    promptList: [
        { role: 'system', content: 'System prompt...' },
        { role: 'user', content: 'User prompt with template substitutions...' }
    ],
    // Optional parameters:
    temperature: 0.7,
    max_tokens: 4000,
    model: 'gpt-4' // Provider-specific
}, callback);
```

## Configuration-Driven Architecture

### Thought Process Configuration

AI behavior is controlled through `.ini` configuration files:

```ini
[UDG_Thought_Process]
promptLibraryName=udg-v1
promptLibraryModulePath=<!promptLibraryModulePath!>
thoughtProcessConversationList.0.facilitatorModuleName=get-answer
thoughtProcessConversationList.0.conversationThinkerListName=unityGenerator

[JEDX_Thought_Process]  
promptLibraryName=jedx-v1
promptLibraryModulePath=<!promptLibraryModulePath!>
thoughtProcessConversationList.0.facilitatorModuleName=get-answer
thoughtProcessConversationList.0.conversationThinkerListName=unityGenerator
```

### Dependency Injection Flow

1. **Application**: Calls `makeFacilitators({ thoughtProcessName: 'UDG_Thought_Process' })`
2. **Framework**: Reads configuration, instantiates `prompt-generator` with correct prompt library
3. **Thinkers**: Receive pre-configured `promptGenerator` via function arguments

**CRITICAL**: Thinkers should NEVER instantiate their own `prompt-generator`. Always use the injected one.

## Prompt Libraries

### Structure

```
/cli/lib.d/unity-data-generator/prompt-library/prompts.d/
├── udg-v1/
│   ├── udg-v1.js              # Main extraction logic
│   └── stringsLib/defaultStrings/
│       ├── maker.js           # Generation prompts
│       ├── review.js          # Review prompts
│       └── fix.js             # Fix prompts
└── jedx-v1/
    ├── jedx-v1.js             # JSON extraction logic
    └── stringsLib/defaultStrings/
        ├── maker.js           # JSON generation prompts
        ├── review.js          # JSON review prompts
        └── fix.js             # JSON fix prompts
```

### Extraction Logic Pattern

```javascript
// In prompt library main file (e.g., udg-v1.js, jedx-v1.js)
const expectedDataType = 'XML'; // or 'JSON'

let start_dataTypeSpecificCleanupDelimiter;
let end_dataTypeSpecificCleanupDelimiter;

switch (expectedDataType) {
    case 'JSON':
        start_dataTypeSpecificCleanupDelimiter = '{';
        end_dataTypeSpecificCleanupDelimiter = '}';
        break;
    case 'XML':
        start_dataTypeSpecificCleanupDelimiter = '<';
        end_dataTypeSpecificCleanupDelimiter = '>';
        break;
}

const getgeneratedSynthData = (extractionParameters) => (inString) => {
    // First: Extract content between START/END delimiters
    const { frontDelimiter, backDelimiter } = extractionParameters.getgeneratedSynthData;
    const regex = new RegExp(`${escapeRegExp(frontDelimiter)}(.*?)${escapeRegExp(backDelimiter)}`, 's');
    const match = inString.match(regex);
    
    if (match) {
        const result = match[1];
        // Second: Extract format-specific content (XML/JSON)
        const xmlContent = result.substring(
            result.indexOf(start_dataTypeSpecificCleanupDelimiter),
            result.lastIndexOf(end_dataTypeSpecificCleanupDelimiter) + 1,
        );
        return { generatedSynthData: xmlContent };
    } else {
        return { generatedSynthData: 'Content Missing in Response' };
    }
};
```

## Facilitator Patterns

### get-answer Facilitator
- Executes single conversation sequence
- Returns result immediately
- Used for simple AI interactions

### answer-until-valid Facilitator
- Executes conversation repeatedly until validation passes
- Requires `check-validity` thinker that returns `{ isValid, validationMessage }`
- Uses `fix-problems` thinker for correction attempts
- Has iteration limits and timeout protection

## Common Thinker Types

### Generator Thinkers (xml-maker, json-maker)
- Create initial content from specifications
- Add `generatedSynthData` property to `latestWisdom`
- Use generation prompt templates

### Review Thinkers (xml-review)
- Quality control and content revision
- Overwrite `generatedSynthData` with improved version
- Use review prompt templates

### Validation Thinkers (check-validity)
- Validate content against external services or rules
- Add `isValid` and `validationMessage` properties
- Used by answer-until-valid facilitator

### Fix Thinkers (fix-problems)
- Correct identified issues
- Overwrite `generatedSynthData` with corrected version
- Used by answer-until-valid facilitator

## Application Integration

### Unity Data Generator (UDG)
- **Thought Processes**: UDG_Thought_Process (XML), JEDX_Thought_Process (JSON)
- **Thinkers**: xml-maker, xml-review, check-validity, fix-problems
- **Output**: Educational data in XML or JSON format

### Example Usage
```bash
unityDataGenerator StudentPersonals                                    # Uses UDG_Thought_Process (XML)
unityDataGenerator StudentPersonals --thoughtProcess=JEDX_Thought_Process  # Uses JEDX_Thought_Process (JSON)
```

## Debugging and Logging

### Process File Logging
```javascript
xLog.saveProcessFile(
    `${moduleName}_promptList.log`,
    `\n\n\n${moduleName}---------------------------------------------------\n${promptContent}\n----------------------------------------------------\n\n`,
    { append: true }
);
```

### Debug Data Flow
```javascript
// Use qtListProperties() for clean object inspection
latestWisdom.qtListProperties();
// Output: Shows all properties and their types without values
```

## Key Architectural Rules

1. **Framework is Content-Agnostic**: Never add application-specific logic to framework
2. **Dependency Injection**: Framework services are injected, never instantiated by thinkers
3. **Configuration-Driven**: Use thought process config, not command line flags
4. **Single Responsibility**: Each thinker has one clear purpose
5. **Data Flow**: `latestWisdom` accumulates properties as it flows through thinkers
6. **Error Handling**: Always provide error-first callbacks
7. **Logging**: Use framework logging services for consistency

## Troubleshooting Common Issues

### Content Truncation
- Check extraction delimiter configuration
- Verify prompt library uses correct `expectedDataType`
- Ensure delimiters match format (XML: `<>`, JSON: `{}`)

### Missing Dependencies
- Verify `promptGenerator` is received via dependency injection
- Check thought process configuration in `.ini` files
- Ensure framework services are passed through `args`

### Validation Loops
- Check `isValid` property is boolean, not string
- Verify validation service URL is accessible
- Ensure fix-problems thinker properly modifies content

## Future Extensions

To add new thinker capabilities:

1. **Create Thinker Module**: Follow standard function signature pattern
2. **Add to Configuration**: Update thought process conversation lists
3. **Create Prompt Templates**: Add to appropriate prompt library
4. **Test Integration**: Use framework logging to trace data flow

The framework automatically supports new thinkers without code changes.