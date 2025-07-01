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

**APPLICATION PROVIDES:**

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
4. **Wisdom Pipeline** - Data flows through thinkers as accumulated "wisdom"

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

**The Final Report**: After all the panels finish, someone takes all the wisdom from every discussion and writes up the final conference report. That's your output.

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

- `latestWisdom` - The accumulated knowledge from all previous thinkers. This is THE MOST IMPORTANT property.
- Other properties - Various data the conversation needs

**What You Must Return**

Your thinker MUST include these in its wisdom output:

1. `wisdom` - Must contain all of `latestWisdom` plus your new contributions
2. `isValid` - Set to true/false (even if not using answer-until-valid facilitator)

Best practice: `const wisdom = { ...latestWisdom, yourNewData, isValid: true }`

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
    const { thinkerParameters={}, promptGenerator, smartyPants } = args;

    // Get configuration
    const localThinkerParameters = thinkerParameters.qtGetSurePath(moduleName, {});
    const allThinkersParameters = thinkerParameters.qtGetSurePath('allThinkers', {});
    const configFromSection = getConfig(moduleName);
    const finalConfig = { ...configFromSection, ...allThinkersParameters, ...localThinkerParameters };

    const systemPrompt = "Your AI system prompt here";

    // UTILITIES
    const formulatePromptList = (promptGenerator) => ({ latestWisdom } = {}) => {
        return promptGenerator.iterativeGeneratorPrompt({
            ...latestWisdom,
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

    // DO THE JOB
    const executeRequest = (args, callback) => {
        const taskList = new taskListPlus();

        // Task 1: Generate prompts
        taskList.push((args, next) => {
            const { promptGenerator, formulatePromptList } = args;
            const promptElements = formulatePromptList(promptGenerator)(args);
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
            const { wisdom: rawWisdom, promptElements, latestWisdom } = args;
            const { extractionFunction } = promptElements;
            const extractedData = extractionFunction(rawWisdom);

            const wisdom = { ...latestWisdom, ...extractedData };
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
    // Critical validation
    const requiredData = args.qtGetSurePath('latestWisdom.requiredProperty');
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

The standard property for synthetic data generation:

```javascript
// sd-maker creates it
const wisdom = { ...latestWisdom, generatedSynthData };

// sd-review modifies it  
const wisdom = { ...latestWisdom, ...extractedData }; // overwrites generatedSynthData

// check-validity validates and preserves it
const wisdom = { ...latestWisdom, generatedSynthData, isValid, validationMessage };
```

### Error Handling

Always validate critical inputs:

```javascript
if (!criticalData) {
    const errorMsg = `CRITICAL ERROR in ${moduleName}: Missing required data`;
    xLog.error(errorMsg);
    throw new Error(errorMsg);
}
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
- 2.0.0 - Configuration-driven prompt library selection

## OTHER COOL QTOOLS

[qtools-asynchronous-pipe-plus](https://www.npmjs.com/package/qtools-asynchronous-pipe-plus)
[qtools-config-file-processor](https://www.npmjs.com/package/qtools-config-file-processor)
[qtools-functional-library](https://www.npmjs.com/package/qtools-functional-library)