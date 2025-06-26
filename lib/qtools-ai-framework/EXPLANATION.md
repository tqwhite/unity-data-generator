# qtools-ai-framework: Application-Agnostic AI Orchestration

## Core Philosophy

The qtools-ai-framework is a **thought process orchestration engine** that provides structure and flow control for complex AI workflows, while remaining completely agnostic about the domain, data formats, and business logic of the applications that use it.

**Key Principle**: The framework orchestrates the *process* but knows nothing about the *content*. Applications provide the domain knowledge, AI interactions, and data processing logic through configuration and custom thinker modules.

---

## Configuration-Driven Architecture

The framework's behavior is entirely controlled through hierarchical `.ini` configuration files that define three levels of abstraction:

### 1. Thought Process Level

Defines the high-level sequence of conversations, each paired with a facilitator (execution pattern):

```ini
[UDG_Thought_Process]
thoughtProcessConversationList.0.facilitatorModuleName=get-answer
thoughtProcessConversationList.0.conversationThinkerListName=unityGenerator

thoughtProcessConversationList.1.facilitatorModuleName=answer-until-valid
thoughtProcessConversationList.1.conversationThinkerListName=refiner
```

### 2. Conversation Level

Defines groups of thinkers that work together on related tasks:

```ini
[conversation-generator]
unityGenerator.thinkerList.0.configName=getSpecificationData
unityGenerator.thinkerList.1.configName=xmlMaker
unityGenerator.thinkerList.2.configName=xmlReview

refiner.thinkerList.0.configName=fixProblems
refiner.thinkerList.1.configName=checkValidity
```

### 3. Thinker Level

Defines individual AI interaction modules (provided by the application):

```ini
[thinkers]
getSpecificationData.module=<!thinkerFolderPath!>/get-specification-data
xmlMaker.module=<!thinkerFolderPath!>/xml-maker
xmlMaker.smartyPantsName=gpt
```

---

## Framework vs Application Responsibilities

### Framework Provides (Content-Agnostic):

- **Entry Point & Initialization** (`jina.js`)
- **Flow Orchestration** (`task-runner.js`)
- **Execution Patterns** (facilitators: `get-answer`, `answer-until-valid`)
- **Conversation Management** (`conversation-generator`)
- **AI Provider Abstraction** (`smarty-pants-chooser`)
- **Template Processing** (`prompt-generator`)

### Application Provides (Domain-Specific):

- **Configuration Files** (defining thought processes, conversations, thinkers)
- **Thinker Modules** (custom AI interaction logic)
- **Domain Knowledge** (what properties exist in `latestWisdom`, how to process results)
- **Data Formats** (XML, JSON, or any other format the application needs)

---

## System Architecture Diagram

```
Application Entry Point
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRAMEWORK LAYER                             │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐   │
│  │   jina.js   │───▶│ task-runner  │───▶│  facilitators   │   │
│  │  (init)     │    │ (sequence)   │    │ (get-answer,    │   │
│  └─────────────┘    └──────────────┘    │  answer-until-  │   │
│                                         │  valid)         │   │
│                                         └─────────┬───────┘   │
│                                                   │           │
│                     ┌─────────────────────────────▼───────┐   │
│                     │    conversation-generator          │   │
│                     │    (orchestrates thinkers)         │   │
│                     └─────────────┬───────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐     │
│  │   Thinker   │    │   Thinker   │    │     Thinker     │     │
│  │  Module A   │    │  Module B   │    │    Module C     │     │
│  │(app-provided│    │(app-provided│    │ (app-provided)  │     │
│  │    code)    │    │    code)    │    │                 │     │
│  └─────┬───────┘    └─────┬───────┘    └─────┬───────────┘     │
│        │                  │                  │                 │
│        ▼                  ▼                  ▼                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              AI Provider (OpenAI, etc.)                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    Application-Specific Output
                    (generatedSynthData, etc.)
```

---

## Data Flow: The `latestWisdom` Object

The framework uses a single data structure called `latestWisdom` that flows through the entire system:

```javascript
// Initial state
latestWisdom = { initialThinkerData: "No data presented on first pass." }

// After each thinker adds domain-specific properties
latestWisdom = {
  elementSpecWorksheetJson: "...",      // Added by getSpecificationData
  generatedSynthData: "...",            // Added by xmlMaker
  explanation: "...",                   // Added by fixProblems
  isValid: true,                        // Added by checkValidity
  validationMessage: {...}              // Added by checkValidity
}
```

**Critical Point**: The framework has no knowledge of the properties of the latestWisdom object passed among thinker. It simply:

1. Passes `latestWisdom` to each thinker
2. Receives updated `latestWisdom` from each thinker
3. Passes the accumulated wisdom to the next thinker
4. Returns the final accumulated wisdom to the application

Only the thinkers know what is contained in the latest wisdom. The application is responsible for choosing the properties that are important when it is passed as output.

---

## Execution Flow

### 1. **Application Initialization**

```javascript
const { findTheAnswer, makeFacilitators } = initAtp();
const facilitators = makeFacilitators({ 
    thoughtProcessConversationList,
    thoughtProcessName: 'UDG_Thought_Process'
});
```

### 2. **Framework Orchestration**

```javascript
// task-runner.js
for (var i = 0, len = facilitators.length; i < len; i++) {
    const tmp = await facilitators[i].facilitator({
        latestWisdom,
        args,
    });
    latestWisdom = tmp.latestWisdom;  // Accumulates application-specific data
}
```

### 3. **Facilitator Execution**

```javascript
// get-answer.js (single-pass) or answer-until-valid.js (retry pattern)
const { latestWisdom, args } = await jinaConversation.getResponse(
    passThroughObject,
    options
);
```

### 4. **Conversation Management**

```javascript
// conversation-generator.js
thinkerList.forEach((thinkerName) => {
    const thinker = require(thinkerSpec.module)({  // Loads APPLICATION thinker
        thinkerSpec,
        smartyPants,
        thinkerParameters,
        promptGenerator
    });
    thinker.executeRequest(args, callback);  // Calls APPLICATION code
});
```

### 5. **Application Thinker Execution** (Outside Framework)

```javascript
// Application-provided thinker module
const wisdom = {
    ...latestWisdom,
    generatedSynthData: extractedXmlContent  // Application decides what this means
};
callback(err, { wisdom, args });
```

---

## Framework Features

### Facilitators (Execution Patterns)

**`get-answer`**: Single-pass execution

- Runs conversation once
- Returns result immediately
- Used for straightforward generation tasks

**`answer-until-valid`**: Retry pattern with validation

- Runs conversation repeatedly until validation passes
- Increases AI temperature on each retry for more creative solutions
- Used for tasks requiring external validation or quality checks

### Conversation Generator

- Loads and sequences application-provided thinker modules
- Manages `latestWisdom` flow between thinkers
- Provides dependency injection (AI providers, prompt generators)
- Handles error propagation and logging

### AI Provider Abstraction

- Supports multiple AI providers through configuration
- Handles API calls, rate limiting, error handling
- Abstracts prompt formatting and response parsing

### Prompt Generator

- Processes template variables using application-provided prompt libraries
- Supports different prompt library configurations per thought process
- Enables template reuse across different applications

---

## Key Design Principles

### 1. **Separation of Concerns**

- **Framework**: Orchestration, flow control, infrastructure
- **Application**: Domain logic, AI prompts, data processing

### 2. **Configuration Over Code**

- Thought processes defined in `.ini` files, not hardcoded
- Easy to modify behavior without code changes
- Different applications can use different configurations

### 3. **Dependency Injection**

- Framework provides services (AI providers, prompt generators) to application thinkers
- No hardcoded paths or tight coupling
- Testable and modular architecture

### 4. **Content Agnosticism**

- Framework never knows about domain-specific data formats
- Applications define their own data structures and processing logic
- Same framework can orchestrate XML generation, JSON processing, or any other domain

### 5. **Error Resilience**

- Comprehensive error handling and retry mechanisms
- Detailed logging for debugging
- Graceful degradation when AI services fail

---

## Thinker Module Specification

Thinkers are application-provided modules that implement the core domain logic and AI interactions. The framework loads and executes these modules according to the conversation configuration, but has no knowledge of their internal workings.

### Thinker Module Structure

Each thinker module must export a function that follows this pattern:

```javascript
const moduleFunction = function (args = {}) {
    const { xLog, getConfig } = process.global;
    const { thinkerParameters={}, thinkerSpec, smartyPants } = args;

    // Thinker-specific initialization and configuration

    const executeRequest = (args, callback) => {
        // Access the latestWisdom from previous thinkers
        const { latestWisdom } = args;

        // Perform thinker-specific logic (AI calls, data processing, etc.)

        // Create updated wisdom object with new properties
        const wisdom = {
            ...latestWisdom,
            // Add or modify properties as needed by this thinker
            newProperty: processedData,
            anotherProperty: extractedResults
        };

        // Return the updated wisdom to the framework
        callback(err, { wisdom, args });
    };

    return { executeRequest };
};

module.exports = moduleFunction;
```

### Framework-Provided Dependencies

When the framework instantiates a thinker, it provides these dependencies:

- **`thinkerSpec`**: Configuration object from the `[thinkers]` section
- **`smartyPants`**: AI provider instance (if `smartyPantsName` is configured)
- **`thinkerParameters`**: Application-specific parameters passed to all thinkers

### Required Function Signature

The framework expects each thinker to provide an `executeRequest` function with this exact signature:

```javascript
executeRequest(args, callback)
```

**Parameters:**

- **`args`** (Object): Contains `latestWisdom` and any additional data from the framework
  - `args.latestWisdom` - The accumulated wisdom object from all previous thinkers
  - Additional framework-managed properties (implementation details)

**Callback:**

- **`callback`** (Function): Error-first callback with signature `(err, result)`
  
  - `err` - Error object if processing failed, or falsy value for success
  
  - `result` - Object containing updated wisdom and args:
    
    ```javascript
    {
        wisdom: updatedLatestWisdomObject,
        args: optionallyModifiedArgsObject
    }
    ```

### Thinker Responsibilities

#### What Thinkers Must Do:

1. **Implement `executeRequest`**: Provide the required function signature
2. **Process `latestWisdom`**: Read and understand properties from previous thinkers
3. **Return Updated Wisdom**: Add, modify, or preserve properties in the wisdom object
4. **Handle Errors Gracefully**: Use the callback's error parameter for failures

#### What Thinkers Can Do:

1. **AI Interactions**: Use the provided `smartyPants` service for AI calls
2. **Data Processing**: Perform any domain-specific logic
3. **External APIs**: Call validation services, databases, or other external systems
4. **File Operations**: Read/write files, process spreadsheets, etc.

#### What Thinkers Should Not Do:

1. **Framework Concerns**: Don't manage conversation flow or facilitator logic
2. **Global State**: Don't modify `process.global` or other shared state
3. **Hard Dependencies**: Don't assume specific properties exist in `latestWisdom`
4. **Framework Assumptions**: Don't rely on framework implementation details

### Complete Thinker Function Signatures

#### Module Instantiation Signature

When the framework loads a thinker module, it calls the exported function with these parameters:

```javascript
const moduleFunction = function (instantiationArgs = {}) {
    // === FRAMEWORK-PROVIDED INSTANTIATION PARAMETERS ===

    // Core framework dependencies
    const { thinkerSpec, smartyPants } = instantiationArgs;

    // Application-provided configuration and services  
    const { thinkerParameters={}, promptGenerator } = instantiationArgs;

    // === PARAMETER DOCUMENTATION ===

    /**
     * @param {Object} thinkerSpec - Configuration from [thinkers] section
     * @param {string} thinkerSpec.selfName - The thinker's name (e.g., 'xmlMaker')
     * @param {string} thinkerSpec.module - Module path for this thinker
     * @param {string} thinkerSpec.smartyPantsName - AI provider name (e.g., 'gpt')
     * 
     * @param {Object} smartyPants - AI provider service instance
     * @param {Function} smartyPants.accessExternalResource - Method to call AI
     * 
     * @param {Object} thinkerParameters - Application-specific parameters
     * @param {Object} thinkerParameters[moduleName] - Parameters specific to this thinker
     * @param {Object} thinkerParameters.allThinkers - Parameters for all thinkers
     * 
     * @param {Object} promptGenerator - Application-provided prompt processing service
     * @param {Function} promptGenerator.iterativeGeneratorPrompt - Generate prompts
     */

    // === STANDARD INITIALIZATION PATTERN ===

    // Access global services provided by application
    const { xLog, getConfig } = process.global;

    // Extract thinker-specific configuration
    const moduleName = 'sample-thinker'; // Usually from __filename
    const localThinkerParameters = thinkerParameters.qtGetSurePath(moduleName, {});
    const allThinkersParameters = thinkerParameters.qtGetSurePath('allThinkers', {});
    const configFromSection = getConfig(moduleName);

    // Merge configuration with priority: local > all > config
    const finalConfig = { 
        ...configFromSection, 
        ...allThinkersParameters, 
        ...localThinkerParameters 
    };

    // === THINKER-SPECIFIC INITIALIZATION ===

    // Custom configuration, utilities, and setup code here
    const systemPrompt = "Your AI system prompt here...";

    // === REQUIRED EXECUTEREQUEST FUNCTION ===

    const executeRequest = (executionArgs, callback) => {
        // === FRAMEWORK-PROVIDED EXECUTION PARAMETERS ===

        /**
         * @param {Object} executionArgs - Runtime execution parameters
         * @param {Object} executionArgs.latestWisdom - Accumulated wisdom from previous thinkers
         * @param {string} executionArgs.latestWisdom.initialThinkerData - Initial framework data
         * @param {string} executionArgs.latestWisdom.elementSpecWorksheetJson - From getSpecificationData
         * @param {string} executionArgs.latestWisdom.generatedSynthData - From xmlMaker/xmlReview
         * @param {string} executionArgs.latestWisdom.explanation - From fixProblems  
         * @param {boolean} executionArgs.latestWisdom.isValid - From checkValidity
         * @param {Object} executionArgs.latestWisdom.validationMessage - From checkValidity
         * // NOTE: Properties depend on which thinkers ran previously
         * 
         * @param {Function} callback - Error-first callback (err, result)
         * @param {Object} result.wisdom - Updated latestWisdom object
         * @param {Object} result.args - Updated execution arguments
         */

        const { latestWisdom } = executionArgs;

        // === THINKER-SPECIFIC PROCESSING ===

        // thinker specific processes go here
        // eg,
        // FULLY QUALIFIED SMARTYPANTS EXAMPLE CALL:

        // Prepare AI prompt
        const promptList = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: 'Your prompt content based on latestWisdom...' }
        ];

        // Call AI service
        smartyPants.accessExternalResource(
            { 
                promptList,
                temperatureFactor: 0.7  // Optional temperature override
            }, 
            (err, aiResponse) => {
                if (err) {
                    return callback(err);
                }

                // Extract data from AI response
                const extractedContent = aiResponse.wisdom; // AI response content

                // Create updated wisdom object
                const wisdom = {
                    ...latestWisdom,
                    // Add thinker-specific properties
                    newProperty: extractedContent,
                    processingComplete: true,
                    processingTimestamp: new Date().toISOString()
                };

                // Return to framework
                callback(null, { wisdom, args: executionArgs });
            }
        );
    };

    // === REQUIRED RETURN OBJECT ===

    return { executeRequest };
};

// === REQUIRED MODULE EXPORT ===

module.exports = moduleFunction;
```

#### Alternative: Non-AI Thinker Example

For thinkers that don't use AI services:

```javascript
const executeRequest = (executionArgs, callback) => {
    const { latestWisdom } = executionArgs;

    // thinker specific processes go here
    // eg, data processing, file operations, validation

    try {
        // Process data without AI
        const processedData = performDataTransformation(latestWisdom.elementSpecWorksheetJson);

        const wisdom = {
            ...latestWisdom,
            processedSpecification: processedData,
            transformationComplete: true
        };

        callback(null, { wisdom, args: executionArgs });

    } catch (error) {
        callback(error);
    }
};
```

### Key Design Principles for Thinkers

1. **Single Responsibility**: Each thinker should have one clear purpose
2. **Wisdom Accumulation**: Build upon previous thinkers' work, don't replace it
3. **Error Transparency**: Report errors clearly through the callback mechanism
4. **Configuration-Driven**: Use `thinkerParameters` for customizable behavior
5. **Framework Agnostic**: Doesn't depend on framework implementation details

The framework provides the orchestration infrastructure, but thinkers contain all the domain knowledge and creative problem-solving logic that makes the application useful.

---

## Benefits of This Architecture

1. **Reusability**: Same framework supports different domains and data formats
2. **Maintainability**: Clear separation between orchestration and business logic
3. **Testability**: Framework and application components can be tested independently
4. **Flexibility**: Easy to add new thought processes, thinkers, or execution patterns
5. **Scalability**: Supports complex multi-stage AI workflows with validation and retry logic
6. **Debuggability**: Comprehensive logging and process file generation for AI interactions

The qtools-ai-framework provides the infrastructure for sophisticated AI thought processes while leaving the creative and domain-specific work to the applications that use it.