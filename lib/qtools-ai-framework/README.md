# qtools-ai-framework

__A FRAMEWORK FOR ORCHESTRATING AI-POWERED DATA PROCESSING PIPELINES__

This framework provides a structured approach to building AI-powered applications using a Thought Process/Conversation/Thinker architecture. It handles the orchestration of multiple AI interactions through configurable pipelines.

## SYNOPSIS

```javascript
const makeFacilitators = require('./lib/qtools-ai-framework')();

const facilitators = makeFacilitators({ 
    thoughtProcessConversationList,
    thoughtProcessName: 'UDG_Thought_Process'
});

const result = await facilitators.makeResponse({
    latestWisdom: initialData
});
```

## DESCRIPTION

The qtools-ai-framework implements a three-tier architectural metaphor:

**Thought Processes** - Top-level orchestration. Thought processes are mainly a sequence of conversations.

**Conversations** - Each conversation has a facilitator and a group of thinkers. A facilitator conducts conversational exchanges, giving and receiving wisdom, according to a pattern that is specific to this facilitator. For example, there is a facilitator that just asks one thinker to respond to a prompt. Another takes two thinkers and reruns one of them until the other says it's finished. 

**Thinkers** - An individual software entity that is happy to receive the data from other thinkers and add value to it. Often, this value is derived from a prompted interaction with some smartyPants AI but it can also be from some URL, a file, or any other thing a NodeJS module can do. The only requirement is that it obey the function signature of the thinker set.

The framework provides dependency injection, prompt management, and facilitator patterns for common processing needs.

## VERSIONS

- v2.0.2: Updated README
- v2.0.0: Added async processing and wisdom-bus architecture for thinker data interactions
- v1.02: added xLog.progress() and xLog.setProgressMessageStatus() (true to show, false to hide)
- v1.0.1: initial commit, works

## ARCHITECTURE

The qtools-ai-framework (QAF) implements a division of labor.

**QAF PROVIDES:**

**A configuration interpreter** - Reads your INI files and wires together your custom thinkers into working thought processes.

**Tools for thinkers** - Everything your thinkers need is injected at startup:

- `promptGenerator` - Gets prompts from your prompt library
- `smartyPants` - Talks to AI services (GPT, Claude, etc.)
- `xLog` - Saves debug files and shows progress
- Configuration values from your INI files

**Facilitators** - Ready-made conversation patterns:

- `iterate-over-collection` - Runs thinkers over lists of things (like processing multiple data records)
- `answer-until-valid` - Keeps asking thinkers to try again until one says "this is good"
- More patterns are being added as we learn more (and user patterns are on the roadmap)

**USER APPLICATION PROVIDES:**

**Prompt Libraries** - Organized collections of prompts:

- Each thought process has its own prompt library
- Each thinker referenced in that thought process needs a corresponding prompt file in that library
- Prompts are user-created text files containing AI instructions
- Prompts can include substitution tags (like `<!dataProperty!>`) to insert data from thinkers
- Prompts define extraction markers to pull specific information from AI responses
- There's a one-to-one relationship between thinkers and their prompt files (matched by name)

**Thinkers** - Business logic modules that process wisdom:

- Thinkers receive the `args` object - a "data bus" containing all accumulated wisdom from previous thinkers
- They can access any data in `args` and add their own contributions
- The `latestWisdom` property must be preserved and passed forward (it's logged on crashes and returned to the application)
- Thinkers can use the injected `smartyPants` module to interact with AI services
- Thinkers can access any external resource - databases, APIs, files - as long as they return `wisdom` with `latestWisdom` and `isValid` properties

### Key Principles

1. **Dependency Injection** - Framework services are injected into thinkers
2. **Configuration-Driven** - Thought processes defined in INI configuration
3. **Prompt Library Architecture** - Modular prompt management per thought process
4. **Wisdom-Bus Architecture** - Thread-safe data management with collision strategies
5. **Wisdom Pipeline** - Data flows through thinkers as accumulated "wisdom"

## WISDOM-BUS ARCHITECTURE

**NEW in v2.0**: The wisdom-bus provides thread-safe data management for thinker interactions, replacing the traditional `latestWisdom` pattern with a more robust accessor-based system.

### Core Concepts

**Wisdom-Bus** - A centralized data management system that:

- Provides thread-safe access to shared wisdom data
- Handles collision resolution when multiple thinkers access the same data
- Creates isolated namespaces for each process to prevent data corruption
- Maintains a complete process registry for debugging and tracking

**Accessors** - Process-specific interfaces that:

- Give each thinker its own namespace (`_proc_{processId}_{key}`)
- Provide `add()`, `get()`, `getAll()`, `exists()` methods for data manipulation
- Automatically handle collision detection and resolution
- Track all operations for debugging and process monitoring

**Collision Strategies** - Built-in approaches for handling data conflicts:

- `sequence` - Arrays maintain order, objects preserve all values with numeric suffixes
- `array` - Always convert to arrays and concatenate values
- `overwrite` - Last writer wins (simple replacement)
- `error` - Throw error on any collision (strict mode)

### Wisdom-Bus Benefits

1. **Thread Safety** - Multiple thinkers can safely access data simultaneously
2. **Process Isolation** - Each process gets its own namespace preventing cross-contamination
3. **Collision Resolution** - Automatic handling of data conflicts with configurable strategies
4. **Debugging Support** - Complete operation logging and process registry
5. **Migration Support** - Helper functions allow gradual transition from legacy patterns

### How Thinkers Use Wisdom-Bus

**New Pattern (v2.0+):**

```javascript
const executeRequest = (args, callback) => {
    // Wisdom-bus is injected as wisdomBus accessor - NOTE: This is an ACCESSOR, not the full wisdom-bus
    const { wisdomBus } = args;

    // Add data to the wisdom-bus using accessor methods
    wisdomBus.add('generatedData', myData);
    wisdomBus.add('isValid', true);

    // Get data from wisdom-bus using accessor methods
    const existingData = wisdomBus.get('previousData');
    const allWisdom = wisdomBus.getAll(); // Gets all accessible wisdom for this process

    // Traditional wisdom return for framework compatibility
    const wisdom = allWisdom; // No need to spread, getAll() returns complete accessible wisdom
    callback('', { wisdom, args });
};
```

**Important: Accessor Methods vs Full Wisdom-Bus**

Thinkers receive a **namespaced accessor**, not the full wisdom-bus. Available methods:

- `wisdomBus.add(key, value)` - Add data to your namespace
- `wisdomBus.get(key)` - Get data (checks your namespace first, then initial wisdom)
- `wisdomBus.getAll()` - Get all accessible data (your additions + initial wisdom)
- `wisdomBus.has(key)` - Check if key exists
- `wisdomBus.processId` - Your unique process identifier

**Legacy Pattern (still supported):**

```javascript
const executeRequest = (args, callback) => {
    const { latestWisdom } = args;

    const wisdom = { 
        ...latestWisdom, 
        generatedData: myData,
        isValid: true 
    };
    callback('', { wisdom, args });
};
```

### Migration Helper

For existing thinkers, the framework provides automatic migration:

```javascript
// Thinkers can work with both patterns
const migrateThinker = require('../wisdom-bus/migrate-thinker-helper').migrateThinker;

// Framework automatically wraps legacy thinkers
const wrappedThinker = migrateThinker(legacyThinker);
```

## CREATING A NEW THINKER

This section provides a complete guide to creating a new thinker from scratch, using the coherence-generator as an example.

### Understanding the Conference Metaphor

Think of the qtools-ai-framework like a big conference at a hotel.

**The Conference (Thought Process)**: The whole event has a purpose - maybe it's about "Making Better Synthetic Data" or "Matching Educational Records." That's your thought process.

**Panel Discussions (Conversations)**: Throughout the day, there are different panel discussions. Each panel has:

- A **moderator (facilitator)** who runs the show
- **Expert panelists (thinkers)** who share their knowledge
- A specific topic they're discussing

**How Panels Work Together**: Here's where it gets interesting. The morning panel might discuss "What data do we need?" The experts share their findings. Then the afternoon panel takes those findings and asks "Is this data any good?" If not, they send notes back to the morning panel saying "Try again, but fix these problems."

**The Final Report**: After those panels finish, another panel takes all the wisdom from every discussion and writes up the final conference report. That's your output.

**Real Example**: In our coherence-generator story:

1. First panel has thinkers who create synthetic data records
2. Second panel has a thinker who looks at all those records and says "Wait, these ID numbers don't match up!"
3. The second panel fixes the problems and hands back better data
4. Everyone's happy, conference ends, you get your data

### Step 1: Define the Thinker in Configuration

**Planning Your Thinker**: Before writing code, ask yourself:

- What expert knowledge does my thinker bring to the table?
- What information does it need from other thinkers?
- What wisdom will it pass on to the next thinker?

**The Configuration Tells the Story**: Your INI file is like a conference schedule. It says:

- Which thought process (conference) this belongs to
- Which conversation (panel) your thinker joins
- Who moderates that panel (facilitator)
- What other thinkers are on the panel with you

**How It All Connects**:

- A **thought process** has a list of conversations (panels) that run in order
- Each **conversation** has one facilitator and one or more thinkers
- **Thinkers** in a conversation share their wisdom with each other
- The output from one conversation becomes input for the next

Add the thinker to your thought process configuration:

```ini
[JEDX_Thought_Process]
thoughtProcessConversationList.1.facilitatorModuleName=answer-until-valid
thoughtProcessConversationList.1.conversationThinkerListName.0=groupCoherence

[conversation-generator]
groupCoherence.thinkerList.0.configName=coherenceGenerator

[thinkers]
coherenceGenerator.selfName=coherenceGenerator  
coherenceGenerator.module=<!thinkerFolderPath!>/coherence-generator/coherence-generator
coherenceGenerator.smartyPantsName=gpt
```

### Step 2: Create the Thinker Module Structure

```bash
mkdir -p synthDataThinkers/coherence-generator
touch synthDataThinkers/coherence-generator/coherence-generator.js
```

### Step 3: Implement the Thinker Module

**Understanding the Two-Stage Pattern**

A thinker module is like a factory that makes workers. Here's how it works:

**Stage 1 - Factory Setup (Module Instantiation)**:
When the framework starts up, it calls your module function. This is like setting up a factory.

Inputs at this stage:

- `xLog` - Your logging tool (from process.global)
- `getConfig` - Gets values from your INI files (from process.global)
- `thinkerParameters` - Special parameters just for this thinker
- `promptGenerator` - Tool to get prompts from your library
- `smartyPants` - Tool to talk to AI services

What happens: You set up all your tools and utilities, then return an object with an `executeRequest` function.

**Stage 2 - Doing the Work (executeRequest)**:
When it's your thinker's turn in the conversation, the framework calls `executeRequest`.

Inputs to executeRequest:

- `args` - A big object with everything about the current conversation
- `callback` - Function to call when you're done

Outputs from executeRequest (via callback):

- `wisdom` - Updated wisdom object with your contributions
- `args` - The whole args object (for framework use)

**The Magic of the Args Object**

Think of `args` like a shared notebook that all thinkers can read and write in. Unlike normal programming where we hide information, thinking works better when everyone can see everything.

Key properties in args:

- `wisdomBus` - **NEW v2.0**: Your thread-safe accessor for reading/writing wisdom data
- `latestWisdom` - **Legacy**: The accumulated knowledge from all previous thinkers (still supported)
- Other properties - Various data the conversation needs

**What You Must Return**

Your thinker MUST include these in its wisdom output:

1. `wisdom` - Must contain all wisdom data plus your new contributions
2. `isValid` - Set to true/false (even if not using answer-until-valid facilitator)

**Best practices:**

- **v2.0 pattern**: Use `wisdomBus.add()` to store data, `wisdomBus.getAll()` for wisdom return
- **Legacy pattern**: `const wisdom = { ...latestWisdom, yourNewData, isValid: true }`

Create the basic thinker structure:

```javascript
#!/usr/bin/env node
'use strict';

const moduleName = __filename.replace(__dirname + '/', '').replace(/.js$/, '');

const qt = require('qtools-functional-library');
const asynchronousPipePlus = new require('qtools-asynchronous-pipe-plus')();
const pipeRunner = asynchronousPipePlus.pipeRunner;
const taskListPlus = asynchronousPipePlus.taskListPlus;

const moduleFunction = function (args = {}) {
    const { xLog, getConfig } = process.global;
    const { thinkerParameters={}, promptGenerator, smartyPants, wisdomBus } = args;

    // Get configuration
    const localThinkerParameters = thinkerParameters.qtGetSurePath(moduleName, {});
    const allThinkersParameters = thinkerParameters.qtGetSurePath('allThinkers', {});
    const configFromSection = getConfig(moduleName);
    const finalConfig = { ...configFromSection, ...allThinkersParameters, ...localThinkerParameters };

    const systemPrompt = "Your AI system prompt here";

    // UTILITIES - Wisdom-bus pattern
    const formulatePromptList = (promptGenerator) => ({ wisdomBus } = {}) => {
        const wisdomData = wisdomBus.getAll(); // Get all accessible wisdom via accessor
        return promptGenerator.iterativeGeneratorPrompt({
            ...wisdomData,
            employerModuleName: moduleName,
        });
    };

    const accessSmartyPants = (args, callback) => {
        let { promptList, systemPrompt } = args;
        const localCallback = (err, result) => {
            callback('', result);
        };
        promptList.unshift({ role: 'system', content: systemPrompt });
        smartyPants.accessExternalResource({ promptList }, localCallback);
    };

    // DO THE JOB - Wisdom-bus pattern
    const executeRequest = (args, callback) => {
        const taskList = new taskListPlus();
        const { wisdomBus } = args;

        // Task 1: Generate prompts
        taskList.push((args, next) => {
            const { promptGenerator, formulatePromptList, wisdomBus } = args;
            const promptElements = formulatePromptList(promptGenerator)({ wisdomBus });
            next('', { ...args, promptElements });
        });

        // Task 2: Call AI
        taskList.push((args, next) => {
            const { accessSmartyPants, promptElements, systemPrompt } = args;
            const { promptList } = promptElements;
            accessSmartyPants({ promptList, systemPrompt }, (err, result) => {
                next(err, { ...args, ...result });
            });
        });

        // Task 3: Extract and process results
        taskList.push((args, next) => {
            const { wisdom: rawWisdom, promptElements, wisdomBus } = args;
            const { extractionFunction } = promptElements;
            const extractedData = extractionFunction(rawWisdom);

            // Add results to wisdom-bus using accessor methods
            Object.keys(extractedData).forEach(key => {
                wisdomBus.add(key, extractedData[key]); // Adds to your process namespace
            });
            wisdomBus.add('isValid', true);

            // Get all accessible wisdom for framework compatibility
            const wisdom = wisdomBus.getAll(); // Returns all accessible data for this process
            next('', { ...args, wisdom });
        });

        // Execute pipeline
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
    };

    return { executeRequest };
};

module.exports = moduleFunction;
```

### Step 4: Add Critical Data Validation

Add validation for required input data:

```javascript
const executeRequest = (args, callback) => {
    // Critical validation - Updated for wisdom-bus pattern
    const { wisdomBus, latestWisdom } = args;

    // v2.0 pattern: Check wisdom-bus for required data
    let requiredData;
    if (wisdomBus) {
        requiredData = wisdomBus.get('requiredProperty');
    } else {
        // Legacy pattern: Check latestWisdom
        requiredData = latestWisdom?.requiredProperty;
    }

    if (!requiredData) {
        const errorMsg = `CRITICAL ERROR in ${moduleName}: No requiredProperty received`;
        xLog.error(errorMsg);
        throw new Error(errorMsg);
    }

    // ... rest of implementation
};
```

### Step 5: Create the Prompt File

Create the prompt template in the appropriate prompt library:

```javascript
// prompt-library/prompts.d/jedx-v1/stringsLib/defaultStrings/coherence-generator.js

const moduleFunction = ({ moduleName } = {}) =>
    ({ dotD, passThroughParameters } = {}) => {
        const promptTemplate = `
# PRIMARY TASK DEFINITION
Your task description here...

# INPUT DATA
<!inputDataProperty!>

# PROCESS INSTRUCTIONS
1. Step one
2. Step two

# RESULT FORMATTING
<!getResults.frontDelimiter!>
RESULTS GO HERE
<!getResults.backDelimiter!>
        `;

        const extractionParameters = {
            getResults: {
                frontDelimiter: `[START RESULTS]`,
                backDelimiter: `[END RESULTS]`,
            },
        };

        const { extractionLibrary, defaultExtractionFunction } = passThroughParameters;

        // Custom extraction function
        const getResults = (extractionParameters) => (inString) => {
            // Extract and parse results
            // Return { propertyName: extractedValue }
        };

        const extractionList = [getResults(extractionParameters)];
        const extractionFunction = defaultExtractionFunction({extractionList});

        const thinker = 'coherence-generator';

        const workingFunction = () => {
            return { promptTemplate, extractionParameters, extractionFunction, thinker };
        };

        dotD == undefined || dotD.library.add(moduleName, workingFunction);
        return { workingFunction };
    };

module.exports = moduleFunction({ moduleName });
```

### Step 6: Integration Patterns

#### For answer-until-valid Facilitator

- Return `isValid: true/false` in wisdom
- Facilitator will retry until valid

#### For iterate-over-collection Facilitator

- Process `currentElement` from wisdom
- Results accumulate across iterations
- Sequential or Parallel (throtted batches)

#### Data Flow

- Input: `latestWisdom` object containing accumulated data
- Output: Updated `wisdom` object with new/modified properties

### Step 7: Testing

1. Run with minimal test case
2. Check log files in `/tmp/unityDataGeneratorTemp/`
3. Verify prompt generation in `[moduleName]_promptList.log`
4. Check AI responses in `[moduleName]_responseList.log`

## COMMON PATTERNS

### Wisdom Property Flow

The standard pattern for synthetic data generation using wisdom-bus:

```javascript
// sd-maker creates data
wisdomBus.add('generatedSynthData', synthData);
wisdomBus.add('isValid', true);

// sd-review modifies data
const currentData = wisdomBus.get('generatedSynthData');
const improvedData = improveData(currentData);
wisdomBus.add('generatedSynthData', improvedData);

// check-validity validates and preserves
const dataToValidate = wisdomBus.get('generatedSynthData');
const validationResult = validateData(dataToValidate);
wisdomBus.add('isValid', validationResult.isValid);
wisdomBus.add('validationMessage', validationResult.message);

// Final wisdom return
const wisdom = wisdomBus.getAll();
callback('', { wisdom, args });
```

### Error Handling

Always validate critical inputs using wisdom-bus:

```javascript
const executeRequest = (args, callback) => {
    const { wisdomBus } = args;

    // Check for required data using accessor
    const criticalData = wisdomBus.get('requiredProperty'); // Checks namespace first, then initial wisdom
    if (!criticalData) {
        const errorMsg = `CRITICAL ERROR in ${moduleName}: Missing required data`;
        xLog.error(errorMsg);

        // Add error info to wisdom-bus using accessor
        wisdomBus.add('isValid', false);
        wisdomBus.add('errorMessage', errorMsg);

        const wisdom = wisdomBus.getAll(); // Get all accessible wisdom
        return callback(new Error(errorMsg), { wisdom, args });
    }

    // Continue with processing...
};
```

## CONFIGURATION REFERENCE

### Thought Process Configuration

```ini
[ThoughtProcessName]
promptLibraryName=library-version
promptLibraryModulePath=<!promptLibraryModulePath!>
resultFileType=xml|json

thoughtProcessConversationList.0.facilitatorModuleName=iterate-over-collection
thoughtProcessConversationList.0.conversationThinkerListName.0=thinkerGroup
thoughtProcessConversationList.0.iterableSourceThinkerName=dataSource
thoughtProcessConversationList.0.resultValueWisdomPropertyName=currentElement

# Optional async configuration for iterate-over-collection
thoughtProcessConversationList.0.asyncMode=true              # Enable async processing
thoughtProcessConversationList.0.maxConcurrentRequests=3    # Max parallel requests
thoughtProcessConversationList.0.requestsPerSecond=2        # Rate limiting
```

### Thinker Configuration

```ini
[thinkers]
thinkerName.selfName=thinkerName
thinkerName.module=<!thinkerFolderPath!>/thinker-directory/thinker-file
thinkerName.smartyPantsName=gpt  # if AI access needed
```

## FACILITATOR TYPES

### iterate-over-collection

- Processes arrays of elements
- Accumulates results
- Configurable error handling
- **NEW: Asynchronous processing (parallel batches) support**

#### Async Processing Mode

The iterate-over-collection facilitator now supports asynchronous processing for improved performance when handling multiple elements:

**Configuration Options:**

- `asyncMode` (boolean, default: false) - Enable/disable async processing
- `maxConcurrentRequests` (number, default: 1) - Maximum parallel API requests
- `requestsPerSecond` (number, optional) - Rate limiting for API calls

**Example Configuration:**

```ini
[JEDX_Thought_Process]
thoughtProcessConversationList.0.facilitatorModuleName=iterate-over-collection
thoughtProcessConversationList.0.asyncMode=true
thoughtProcessConversationList.0.maxConcurrentRequests=3
thoughtProcessConversationList.0.requestsPerSecond=2
```

**Benefits:**

- Parallel processing of independent elements
- Configurable concurrency limits to prevent API overload
- Optional rate limiting for API compliance
- Automatic error handling with `continueOnError` support
- Progress tracking for all parallel operations

**How It Works:**

- When `asyncMode=true`, elements are processed in parallel up to `maxConcurrentRequests`
- Rate limiting ensures no more than `requestsPerSecond` API calls are made
- Results are collected using `Promise.allSettled` for resilient error handling
- Each element gets its own conversation instance with isolated wisdom context

### answer-until-valid

- Retries until `isValid: true`
- Useful for validation/refinement loops

## DEBUGGING

- Enable verbose logging: `-echoAlso` flag
- Process files saved to batchSpecificDebugLogParentDirPath
- Check `_promptList.log` and `_responseList.log` files
- Use `xLog.status()` and `xLog.verbose()` for debugging

## SEE ALSO

- unityDataGenerator - Example implementation
- qtools-functional-library - Utility functions
- qtools-asynchronous-pipe-plus - Pipeline execution

## VERSION HISTORY

- 1.0.0 - Initial framework architecture
- 2.0.0 - Configuration-driven prompt library selection + **Wisdom-Bus Architecture** for thread-safe data management
- 2.0.1 - Async processing support for iterate-over-collection with rate limiting
- 2.1.0 - Wisdom bus implementation; important architectural change

## OTHER COOL QTOOLS

[qtools-asynchronous-pipe-plus](https://www.npmjs.com/package/qtools-asynchronous-pipe-plus)
[qtools-config-file-processor](https://www.npmjs.com/package/qtools-config-file-processor)
[qtools-functional-library](https://www.npmjs.com/package/qtools-functional-library)