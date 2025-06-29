# qtools-ai-framework Complete Flow Explanation

## Overview

The qtools-ai-framework orchestrates AI conversations through a sophisticated pipeline of facilitators, conversations, and thinkers. This document traces the complete flow from thought process initiation to final result.

## 1. Application Entry Point (e.g., unityDataGenerator.js)

### Initialization
```javascript
// Initialize the AI framework
const initAtp = require('../../../lib/qtools-ai-framework/jina')({
    configFileBaseName: moduleName,
    applicationBasePath,
    applicationControls: ['--thoughtProcess', '--promptVersion', '-showElements', '-allElements', '--elements']
});
```

**Side Effects:**
- Sets up `process.global` with `xLog`, `getConfig`, and `commandLineParameters`
- Loads configuration from INI files

### Thought Process Selection
```javascript
// Get thought process configuration
let thoughtProcessName = commandLineParameters.qtGetSurePath('values.thoughtProcess[0]', 'UDG_Thought_Process');
let { thoughtProcessConversationList, thinkerParameters } = getConfig(thoughtProcessName);
```

### Framework Invocation
```javascript
// Get framework functions
const { findTheAnswer, makeFacilitators } = initAtp({ configName: moduleName });

// Create facilitators
const facilitators = makeFacilitators({
    thoughtProcessConversationList,
    thinkerParameters,
    thoughtProcessName
});

// Execute the thought process
const wisdom = await findTheAnswer({
    facilitators,
    targetObjectNameList,
    debugLogName: targetObjectNamesString
});
```

## 2. jina.js - Framework Core

### makeFacilitators Function
```javascript
const makeFacilitators = ({ thoughtProcessConversationList, thinkerParameters, thoughtProcessName }) =>
    thoughtProcessConversationList.map((thoughtProcessSpecification) =>
        require(`./lib/facilitators/${thoughtProcessSpecification.facilitatorModuleName}`)({
            jinaCore,
            conversationName: thoughtProcessSpecification.conversationThinkerListName,
            thinkerParameters,
            thoughtProcessName
        })
    );
```

**Purpose:** Creates an array of facilitator instances based on the thought process configuration.

### findTheAnswer Function
```javascript
const findTheAnswer = async ({ facilitators, initialThinkerData, debugLogName }) => {
    // Set up debug logging
    xLog.setProcessFilesDirectory(batchSpecificDebugLogDirPath);
    
    // Initialize task runner
    const { runTask } = require('./lib/task-runner')({ facilitators, initialThinkerData });
    
    // Execute the process
    const wisdom = await runTask({})();
    return wisdom;
};
```

## 3. task-runner.js - Sequential Facilitator Execution

```javascript
const runTask = ({ outputFilePath }) => async (err, xmlCollection) => {
    // Initialize wisdom chain
    let latestWisdom = { initialThinkerData };
    let args = {};
    
    // Execute facilitators sequentially
    for (var i = 0, len = facilitators.length; i < len; i++) {
        const tmp = await facilitators[i].facilitator({
            latestWisdom,
            args,
        });
        latestWisdom = tmp.latestWisdom;
        args = tmp.args;
    }
    
    return latestWisdom;
};
```

**Key Points:**
- Facilitators run sequentially, not in parallel
- Each facilitator receives the `latestWisdom` from the previous one
- `args` accumulates additional data through the pipeline

## 4. Facilitator Pattern (e.g., get-answer.js, answer-until-valid.js)

### Basic Facilitator (get-answer.js)
```javascript
const moduleFunction = function ({ jinaCore, conversationName, thinkerParameters, thoughtProcessName }) {
    // Create conversation instance
    const jinaConversation = jinaCore.conversationGenerator({
        conversationName,
        thinkerParameters,
        thoughtProcessName
    });
    
    // Main facilitator function
    async function facilitator(passThroughObject) {
        const { latestWisdom, args } = await jinaConversation.getResponse(passThroughObject, options);
        return { latestWisdom, args };
    }
    
    return { facilitator };
};
```

### Validation Facilitator (answer-until-valid.js)
```javascript
async function facilitator(passThroughObject) {
    let isValid = false;
    let count = 0;
    const limit = localConfig.validationRepairCycleLimit || 2;
    
    do {
        const { latestWisdom: tmpWisdom, args: tmpArgs } = 
            await jinaConversation.getResponse(passThroughObject, temperatureFactor, options);
        
        isValid = tmpWisdom.isValid;
        passThroughObject.latestWisdom = tmpWisdom;
        count++;
    } while (!isValid && count < limit + 1);
    
    if (!isValid) throw validationMessage;
    return { latestWisdom: resultWisdom, args: resultArgs };
}
```

## 5. jina-core.js - Service Factory

```javascript
const moduleFunction = function() {
    const smartyPantsChooser = require('../smarty-pants-chooser')();
    
    const conversationGenerator = ({ conversationName, thinkerParameters, thoughtProcessName }) =>
        require('../conversation-generator')({
            conversationName,
            smartyPantsChooser,
            thinkerParameters,
            thoughtProcessName
        });
    
    return { conversationGenerator, embedGenerator, fileUploader };
};
```

## 6. conversation-generator.js - Thinker Orchestration

### Initialization
```javascript
const moduleFunction = function ({ conversationName, smartyPantsChooser, thinkerParameters, thoughtProcessName }) {
    // Extract prompt library from thought process config
    const thoughtProcessConfig = getConfig(thoughtProcessName);
    const promptLibraryName = thoughtProcessConfig.promptLibraryName;
    const promptLibraryModulePath = thoughtProcessConfig.promptLibraryModulePath;
    
    // Get conversation configuration
    const { thinkerList } = conversationsList[conversationName];
    
    // Instantiate prompt-generator (dependency injection)
    const promptGenerator = promptLibraryName && promptLibraryModulePath ? 
        require('../prompt-generator')({
            promptLibraryModulePath,
            promptLibraryName
        }) : null;
```

### Thinker Execution Pipeline
```javascript
const askTheSmartyPantsActual = ({ localConfig }) => (passThroughObject, options, callback) => {
    const taskList = new taskListPlus();
    
    // Execute each thinker in sequence
    thinkerList.forEach((thinkerName) =>
        taskList.push((args, next) => {
            const thinkerSpec = thinkersList[thinkerName.configName];
            const smartyPants = smartyPantsName ? smartyPantsChooser({ smartyPantsName }) : undefined;
            
            // Instantiate thinker with dependency injection
            const thinker = require(thinkerSpec.module)({
                thinkerSpec,
                smartyPants,
                thinkerParameters,
                promptGenerator  // Injected from framework
            });
            
            // Execute thinker
            thinker.executeRequest(args, (err, latestResponse) => {
                thinkerResponses[thinkerSpec.selfName] = latestResponse;
                next(err, {
                    ...args,
                    latestWisdom: latestResponse.wisdom,
                    thinkerResponses,
                    lastThinkerName: thinkerSpec.selfName
                });
            });
        })
    );
    
    // Run the pipeline
    pipeRunner(taskList.getList(), initialData, callback);
};
```

## 7. Thinker Pattern (e.g., sd-maker.js)

```javascript
const moduleFunction = function (args = {}) {
    const { xLog, getConfig } = process.global;
    const { thinkerParameters = {}, promptGenerator } = args; // Extract injected dependencies
    const { thinkerSpec, smartyPants } = args;
    
    // Prompt formulation using injected promptGenerator
    const formulatePromptList = (promptGenerator) => ({ latestWisdom }) => {
        return promptGenerator.iterativeGeneratorPrompt({
            ...latestWisdom,
            employerModuleName: moduleName
        });
    };
    
    // Main execution function
    const executeRequest = (args, callback) => {
        const taskList = new taskListPlus();
        
        // Generate prompts
        taskList.push((args, next) => {
            const promptElements = formulatePromptList(promptGenerator)(args);
            next('', { ...args, promptElements });
        });
        
        // Call AI service
        taskList.push((args, next) => {
            smartyPants.accessExternalResource({ promptList }, (err, result) => {
                next(err, { ...args, ...result });
            });
        });
        
        // Extract and format results
        taskList.push((args, next) => {
            const { wisdom: rawWisdom, promptElements } = args;
            const { extractionFunction } = promptElements;
            const { generatedSynthData } = extractionFunction(rawWisdom);
            const wisdom = { ...latestWisdom, generatedSynthData };
            next('', { ...args, wisdom });
        });
        
        // Execute pipeline
        pipeRunner(taskList.getList(), initialData, callback);
    };
    
    return { executeRequest };
};
```

## 8. Supporting Services

### smarty-pants-chooser.js - AI Service Selection
```javascript
const smartyPantsFactory = ({ smartyPantsName }) => {
    const { moduleName, accessParms, modelName } = smartyPantsList[smartyPantsName];
    const smartyPants = require(`./lib/${moduleName}`)({ accessParms, modelName });
    return smartyPants;
};
```

### prompt-generator.js - Prompt Library Integration
```javascript
const iterativeGeneratorPrompt = (args) => {
    const { employerModuleName } = args;
    const promptLibrary = require(promptLibraryModulePath)({ promptLibraryName });
    
    const { promptTemplate, extractionParameters, extractionFunction } = 
        promptLibrary[employerModuleName];
    
    const pleaForHelp = promptTemplate.qtTemplateReplace({ ...args, ...extractionParameters });
    
    return {
        promptList: [{ role: 'user', content: pleaForHelp }],
        extractionParameters,
        extractionFunction
    };
};
```

## Data Flow Summary

1. **Application** initializes framework with thought process name
2. **jina.js** creates facilitators based on thought process configuration
3. **task-runner.js** executes facilitators sequentially, passing `latestWisdom`
4. Each **facilitator** creates a conversation and calls `getResponse()`
5. **conversation-generator** executes configured thinkers in sequence
6. Each **thinker** uses injected `promptGenerator` and `smartyPants` to:
   - Generate prompts from templates
   - Call AI services
   - Extract and format results
7. Results flow back through the chain as `latestWisdom`

## Key Design Patterns

1. **Dependency Injection**: Framework services (promptGenerator, smartyPants) are injected, not instantiated by consumers
2. **Configuration-Driven**: Thought process name determines prompt library and thinker sequence
3. **Sequential Pipeline**: Both facilitators and thinkers execute in order, passing accumulated wisdom
4. **Separation of Concerns**: Framework provides orchestration; applications provide configuration and thinkers
5. **Callback/Promise Hybrid**: Uses callbacks internally but exposes promises at boundaries

## Nested Conversations

Nested conversations are possible through facilitators. A facilitator can:
1. Create its own conversation instance
2. Execute it multiple times (e.g., answer-until-valid)
3. Pass accumulated wisdom to the next facilitator
4. Each conversation maintains its own thinker sequence and state