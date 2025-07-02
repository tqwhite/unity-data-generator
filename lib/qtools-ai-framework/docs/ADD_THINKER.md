# Creating a New Thinker in qtools-ai-framework

This guide explains how to create a new thinker module for the qtools-ai-framework system.

## Overview

A "thinker" is a modular component that performs a specific AI-related task within a thought process. Thinkers receive input data, process it (often using AI), and return enhanced or transformed data.

## Basic Thinker Structure

All thinkers follow the same basic pattern:

1. **Module Setup** - Standard Node.js module with framework integration
2. **Configuration Handling** - Parameter merging from multiple sources
3. **Execute Function** - Main processing logic with callback pattern
4. **Return Interface** - Expose executeRequest function

## Step 1: Create the Thinker File

Create your thinker file in the appropriate thinkers directory:

```
/path/to/your/synthDataThinkers/access-smartypants/access-smartypants.js
```

## Step 2: Implement the Thinker

```javascript
#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

//START OF moduleFunction() ============================================================
const moduleFunction = function (args = {}) {
    const { xLog, getConfig } = process.global;
    const { thinkerParameters = {}, promptGenerator } = args;
    const localThinkerParameters = thinkerParameters.qtGetSurePath(moduleName, {});
    const allThinkersParameters = thinkerParameters.qtGetSurePath('allThinkers', {});

    // Priority: localThinkerParameters > allThinkersParameters > configFromSection
    const configFromSection = getConfig(moduleName);
    const finalConfig = { ...configFromSection, ...allThinkersParameters, ...localThinkerParameters };

    xLog.verbose(`Thinker Parameters (${moduleName})\n    `+Object.keys(finalConfig).map(name=>`${name}=${finalConfig[name]}`).join('\n    '));

    const executeRequest = (args, callback) => {
        xLog.status(`\n===============   ${moduleName}  ========================= [conversation-generator.js.moduleFunction]\n`);

        const latestWisdom = args.qtGetSurePath('latestWisdom');

        // Get input data from latestWisdom
        const inputData = latestWisdom.inputData || "Hello, World!";

        xLog.status(`${moduleName}: Processing input: ${inputData}`);

        // Simple processing - in a real thinker, this might involve AI calls
        const processedResult = `Smarty Pants says: ${inputData.toUpperCase()}!`;

        // Create enhanced wisdom object
        const wisdom = {
            ...latestWisdom,
            smartyPantsResult: processedResult,
            processingComplete: true,
            timestamp: new Date().toISOString()
        };

        xLog.status(`${moduleName}: Generated result: ${processedResult}`);

        // Return via callback
        callback('', { wisdom, args });
    };

    return { executeRequest };
};

if (require.main === module) {
    // Direct execution for testing
    const { xLog } = process.global || { xLog: console };
    xLog.status('access-smartypants thinker loaded successfully');
} else {
    module.exports = moduleFunction;
}
//END OF moduleFunction() ============================================================
```

## Step 3: Configuration Setup

Add configuration for your thought process in your configuration file (e.g., `config.ini`):

```ini
# Simple Thought Process Configuration
[SIMPLEST_THOUGHT_PROCESS]
promptLibraryName=your-prompt-library
promptLibraryModulePath=<!promptLibraryModulePath!>

# Conversation Definition
conversationThinkerListName=convo1
convo1.facilitatorModuleName=iterate-over-collection
convo1.thinkerList.0.configName=accessSmartyPants

# Thinker Configuration
accessSmartyPants.thinkerModuleName=access-smartypants
accessSmartyPants.description=Simple demonstration thinker that processes input data
```

## Step 4: Integration with Main Application

To use your new thinker in an application:

```javascript
// In your main application file
const facilitators = makeFacilitators({ 
    thoughtProcessConversationList,
    thoughtProcessName: 'SIMPLEST_THOUGHT_PROCESS' // References your config section
});

// Execute the thought process
facilitators.startConversation({
    latestWisdom: {
        inputData: "This is test data"
    }
}, callback);
```

## Key Concepts

### Thinker Parameters

Thinkers receive configuration from three sources (in priority order):

1. **Local Parameters** - Specific to this thinker instance
2. **All Thinkers Parameters** - Common to all thinkers in the process
3. **Config Section** - From the configuration file section

### Wisdom Object

The `latestWisdom` object is the primary data container that flows between thinkers:

- Contains input data, intermediate results, and accumulated knowledge
- Each thinker can add new properties or modify existing ones
- Passed to the next thinker in the conversation chain

### Callback Pattern

All thinkers use Node.js-style callbacks:

```javascript
callback(error, { wisdom, args });
```

- First parameter: error (empty string if no error)
- Second parameter: object with enhanced wisdom and args

### Logging

Use the framework's logging system:

- `xLog.status()` - Important status messages
- `xLog.verbose()` - Detailed debugging information
- `xLog.error()` - Error messages

## Testing Your Thinker

1. **Direct Execution**: Run the thinker file directly to test basic loading
2. **Integration Testing**: Create a minimal thought process to test integration
3. **Debug Logging**: Use verbose logging to trace data flow

## Best Practices

1. **Keep It Simple**: Start with minimal functionality and build up
2. **Handle Errors**: Always check for missing or invalid input data
3. **Use Configuration**: Make behavior configurable rather than hard-coded
4. **Log Appropriately**: Provide useful status information without overwhelming output
5. **Follow Patterns**: Use the same structure as existing thinkers for consistency

## Common Patterns

### AI Integration

```javascript
// For thinkers that use AI (with promptGenerator)
const promptList = promptGenerator.getPrompt({
    employerModuleName: 'your-prompt-name',
    ...latestWisdom
});
```

### Error Handling

```javascript
if (!requiredData) {
    const wisdom = {
        ...latestWisdom,
        error: "Missing required data",
        processingComplete: false
    };
    callback('', { wisdom, args });
    return;
}
```

### Data Validation

```javascript
const validateInput = (data) => {
    if (!data || typeof data !== 'string') {
        return { isValid: false, message: "Input must be a non-empty string" };
    }
    return { isValid: true };
};
```

This framework provides a flexible foundation for building AI-powered processing pipelines with modular, reusable components.