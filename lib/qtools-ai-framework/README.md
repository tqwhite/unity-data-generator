# qtools-ai-framework

### AI Thought Process Framework for Educational Data Generation

**IMPORTANT**: All V1.0.X versions should be considered to have breaking changes. This framework is under active development. Normal semver will start on V2. The framework works and is used in production but breaking changes are expected as we learn what is actually needed in real applications.

---

## 📖 Overview

**qtools-ai-framework** is a sophisticated AI orchestration framework implementing a **"conversation-based thought process"** metaphor. It's designed around the concept of academic seminars with panel discussions working collaboratively on complex problems.

### Core Philosophy

The framework models AI interactions as **Thought Processes** consisting of sequential **Conversations**, each guided by **Facilitators** who coordinate groups of specialized **Thinkers**. This metaphor provides a structured, extensible approach to complex AI workflows.

### Conceptual Flow

```
Thought Process → [Conversation 1] → [Conversation 2] → [Conversation N] → Final Result
                      ↓                ↓                ↓
                 [Facilitator]    [Facilitator]    [Facilitator]
                      ↓                ↓                ↓
              [Thinker 1,2,3...]  [Thinker 1,2...]  [Thinker 1...]
```

---

## 🏗️ Architecture

### Directory Structure

```
qtools-ai-framework/
├── jina.js                    # Main entry point & orchestrator
├── package.json              # Dependencies & metadata
├── README.md                 # This documentation
└── lib/
    ├── jina-core/            # Core conversation orchestration
    ├── task-runner.js        # Sequential facilitator execution
    ├── conversation-generator/ # Manages thinker groups
    ├── facilitators/         # Execution patterns
    │   ├── get-answer/       # Single-pass execution
    │   └── answer-until-valid/ # Retry-until-valid pattern
    ├── smarty-pants-chooser/ # AI provider abstraction
    │   └── lib/              # OpenAI integration
    ├── x-log/                # Custom logging system
    ├── assemble-configuration-show-help-maybe-exit/ # Config system
    └── purge-cleanup-directory.js # Utility functions
```

### Key Components

#### 1. **Entry Point** (`jina.js`)

- Framework initialization & main orchestration
- Process global setup & directory management
- Performance monitoring & facilitator coordination
- Factory pattern with initialization parameters

#### 2. **Core Engine** (`lib/jina-core/`)

- Central hub for conversation management
- Dependency injection architecture
- Services: conversation generation, embeddings (future), file operations (future)

#### 3. **Task Runner** (`lib/task-runner.js`)

- Sequential execution of facilitators using Chain of Responsibility pattern
- `latestWisdom` object flows through facilitator chain
- Centralized error handling with detailed stack traces

#### 4. **Facilitators** (Execution Patterns)

- **`get-answer/`**: Simple single-pass execution
- **`answer-until-valid/`**: Retry loop with validation
- Strategy pattern for different execution styles
- Standardized `facilitator(passThroughObject)` interface

#### 5. **Conversation Generator**

- Manages groups of "thinkers" (AI prompt sequences)
- Configuration-driven with Factory + Registry pattern
- Integrates with `smarty-pants-chooser` for AI calls

#### 6. **AI Integration** (`smarty-pants-chooser/`)

- Abstraction layer for AI providers (currently OpenAI)
- Provider pattern (extensible for other AI services)
- Features: model selection, API key management, response formatting

---

## 🚀 Usage

### Basic Integration

```javascript
const initAtp = require('../../lib/qtools-ai-framework/jina')({
    configFileBaseName: moduleName,
    applicationBasePath,
    applicationControls: ['-debug', '--verbose']
});

// Initialize facilitators and execute thought process
const { findTheAnswer, makeFacilitators } = initAtp();
```

### Configuration Example

The framework uses hierarchical `.ini` configuration files:

```ini
; ==============================================================
; A Thought Process is a sequence of Conversations each
; comprising a Facilitator and the name of a group of Thinkers

[App_Specific_Thought_Process]
thoughtProcessConversationList.0.facilitatorModuleName=get-answer
thoughtProcessConversationList.0.conversationThinkerListName=unityGenerator

thoughtProcessConversationList.1.facilitatorModuleName=answer-until-valid
thoughtProcessConversationList.1.conversationThinkerListName=refiner

; ==============================================================
; A Conversation is one of a group of Thinkers instantiated with a Facilitator

[conversation-generator]
unityGenerator.thinkerList.0.configName=getSpecificationData
unityGenerator.thinkerList.1.configName=xmlMaker
unityGenerator.thinkerList.2.configName=xmlReview

refiner.thinkerList.0.configName=fixProblems
refiner.thinkerList.1.configName=checkValidity

; ==============================================================
; Each Thinker is a custom module that receives Wisdom from other Thinkers

[thinkers]
getSpecificationData.selfName=getSpecificationData
getSpecificationData.module=<!thinkerFolderPath!>/get-specification-data

xmlMaker.selfName=xmlMaker
xmlMaker.module=<!thinkerFolderPath!>/xml-maker
xmlMaker.smartyPantsName=gpt

; Additional thinker configurations...
```

---

## 🔧 Technical Details

### Code Patterns & Standards

- **Module Function Pattern**: Consistent `moduleFunction()` structure
- **Dependency Injection**: Core services injected into components
- **qtools-asynchronous-pipe**: Preferred async pattern using taskListPlus and pipeRunner
- **Global State**: `process.global` for shared services (xLog, getConfig)
- **Error Resilience**: Comprehensive error handling with retries

### Key Features

1. **Modular Design**: Clear separation of concerns
2. **Configuration-Driven**: Behavior controlled via `.ini` files
3. **Extensible**: Plugin architecture for thinkers and facilitators
4. **Debugging Support**: Extensive logging and file output for AI interactions
5. **Standard Patterns**: Uses TQ's preferred qtools ecosystem

### Dependencies

- `qtools-asynchronous-pipe-plus`: Pipeline processing
- `qtools-config-file-processor`: Configuration management
- `qtools-functional-library`: Utility functions
- `qtools-parse-command-line`: Command line parsing

---

## 📊 Framework Statistics

- **Total Core Files**: ~20 JavaScript modules
- **Configuration Complexity**: Medium (hierarchical .ini structure)
- **Error Handling**: Comprehensive with retry mechanisms
- **AI Provider Support**: OpenAI (extensible architecture)
- **Documentation**: Comprehensive inline comments + this README

---

## 🎯 Development & Refactoring Notes

### Current Strengths

- ✅ Well-architected conversation metaphor
- ✅ Comprehensive error handling
- ✅ Extensive debugging capabilities
- ✅ Configuration-driven flexibility
- ✅ Modular, extensible design

### Potential Improvements

- 🔄 **Dependency Consolidation**: Multiple node_modules folders could be consolidated
- 🔄 **Type Safety**: Add JSDoc types or TypeScript definitions
- 🔄 **Testing**: Add unit tests for core components
- 🔄 **AI Provider Expansion**: Support for Claude, Gemini, etc.
- 🔄 **Performance Monitoring**: Enhanced metrics per thinker

### Architecture Assessment

The framework is well-designed and functional. Most potential "refactoring opportunities" are optimizations rather than fixes for broken patterns. The core metaphor is sound and the implementation follows good software engineering practices.

---

## 📝 Real-World Usage

This framework is actively used in production for:

- **Educational Data Generation**: Creating XML test data for SIF Unity standards
- **Multi-step AI Workflows**: Complex prompt chains with validation
- **Configuration-Driven AI**: Flexible AI behavior through .ini configuration
- **Error-Resilient Processing**: Robust handling of AI API failures and retries

---

## 📚 Version History

**1.0.9**: Added applicationControls property to initialization for command line parameter extension

---

## 📄 License & Attribution

Development of this open source software was supported by **Access for Learning, LLC** in support of their mission of educational data interoperability.

```
Copyright 2023 Access for Learning

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Authors: TQ White II (Justkidding, Inc.) and John Lovell (Access for Learning, LLC)
```