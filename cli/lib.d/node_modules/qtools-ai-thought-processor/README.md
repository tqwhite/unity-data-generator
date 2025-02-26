# qtools-ai-thought-processor

#### AI Thought Processor (ATP)

IMPORTANT: **All V1.0.X versions should be considered to have breaking changes.** This framework is still under active development. Normal semver will start on V2. qTools ATP works and is used in production but breaking changes are expected for awhile as we learn what is actually needed in our real application.

### DESCRIPTION

**qTools ATP is a framework** is based on a metaphor of seminar hosting one or more panel conversations working together on a problem. It calls these Thought Processes. 

According to the metaphor, **a Thought Process is a series of Conversations**, each of which is a group of Thinkers guided by a Facilitator. Conversations operate in sequence under the control of the chosen Task Runner (only one of these so far). Each reports its Wisdom with the Wisdom of the last Conversation sent to output as the finished result of the Thought Process. The format and meaning of the Wisdom at each Conversation step is up to the specifics of the Thinkers.

**A Conversation has a Facilitator and a group of Thinkers**, each expert in some aspect of the problem under consideration. **The Conversation's Facilitator executes the list of Thinkers in some useful pattern.** This is usually in sequence, passing each Thinker's Wisdom to the next. (*Soon, in parallel with a final Thinker reducing the accumulated Wisdom to contribue to the next Conversation*). A special Facilitator repeats its Conversation until one of the Thinkers says the Wisdom is good.

Fundamentally, **a Thinker receives Wisdom, does something and forwards new Wisdom to the next step**. In a Conversation, the Wisdom of the last Thinker is the final result of the Thought Process. qTools ATP does not know or care what the Thinkers do as long as they produce Wisdom. Although qTools ATP has a couple of built-in Thinkers,  **coding Thinkers is the main work of creating an application based on qTools ATP**.

**qTools ATP mainly provides the orchestration** so Thinkers can work with Facilitators in Conversations. This happens when an application hands the configuration structure to a makeFacilitators() function and passes those to findTheAnswer().

To support the entire process, **qTools ATP provides several utilities** to make coding Thinkers easier and make them easier to debug. Fundamental is a library of Smarty Pants modules that format parameters and requests for NetBrains (*presently only ChatGPT with others planned*). 

There is also a logging (xLog) facility that supports basic logging function but will also allow a Thinker (or any module) to write to a separate log file unique to that module for a specific program execution.  This usually contains raw prompts and responses.

qTools ATP uses the [qTools-parse-command-line](https://www.npmjs.com/package/qtools-parse-command-line) to control the Thought Process. This can be used by the application as well. Application specific flags and help text can be added to the system.
### Usage Example

	const initAtp = require('qtools-ai-thought-processor/jina')({configFileBaseName:moduleName}); // SIDE EFFECTS: Initializes xLog and getConfig in process.global
	
### Configuration Example

In this sample application, Thinkers parse data files and access external HTTP resources as well as execute various prompts to successively refine the result from various perspectives.

    ; ==============================================================
    ; A Thought Process is a sequence of Conversations each
    ; comprising a Facilitator and the name of a group of Thinkers
    
    [App_Specific_Thought_Process]
    thoughtProcessConversationList.0.facilitatorModuleName=get-answer
    thoughtProcessConversationList.0.conversationThinkerListName=unityGenerator
    
    thoughtProcessConversationList.1.facilitatorModuleName=answer-until-valid
    thoughtProcessSpecificationList.1.conversationThinkerListName=refiner
    
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
    ; according to the Facilitator's control.
    
    [thinkers]
    ;------------------------------------------
    ; Opens a local data file
    getSpecificationData.selfName=getSpecificationData
    getSpecificationData.module=<!thinkerFolderPath!>/get-specification-data
    
    ;------------------------------------------
    ; Accesses Net Brain
    xmlMaker.selfName=xmlMaker
    xmlMaker.module=<!thinkerFolderPath!>/xml-maker
    xmlMaker.smartyPantsName=gpt
    
    ;------------------------------------------
    ; Accesses Net Brain
    xmlReview.selfName=xmlReview
    xmlReview.module=<!thinkerFolderPath!>/xml-review
    xmlReview.smartyPantsName=gpt
    
    ;------------------------------------------
    ; Accesses HTTP service endpoint
    checkValidity.selfName=checkValidity
    checkValidity.module=<!thinkerFolderPath!>/check-validity
    checkValidity.smartyPantsName=gpt
    
    ;------------------------------------------
    ; Accesses Net Brain
    fixProblems.selfName=fixProblems
    fixProblems.module=<!thinkerFolderPath!>/fix-problems
    fixProblems.smartyPantsName=gpt
    
    ; ==============================================================
    ; Supply data to thinker module if needed
    
    [xml-maker]
    promptLibraryModulePath=<!promptLibraryModulePath!>
    
    [xml-review]
    promptLibraryModulePath=<!promptLibraryModulePath!>
    
    [fix-problems]
    promptLibraryModulePath=<!promptLibraryModulePath!>
    
    [get-specification-data]
    spreadsheetPath = <!sourceFilesPath!>/ImplementationSpecification.xlsx

### Acknowledgment and Copyright

Development of this open source software was supported by the fine people of Access for Learning, LLC supporting their mission of educational data interoperability.

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
