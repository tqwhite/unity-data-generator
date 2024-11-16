# qtools-ai-thought-processor

#### AI thought process framework

IMPORTANT: This is still under active development. All new V1.0.X versions should be considered breaking. Normal semver will start on V2. qTools AI works and is used in production but breaking changes are expected for awhile as we learn what is actually needed in our real application.

### DESCRIPTION

qTools AI implements a complex structure based on a metaphor of some sort of seminar comprising one or more panel conversations working on a problem. It calls these Thought Processes. 

According to the metaphor, a thought process is a conversation among a panel of experts guided by a Facilitator. The members of the panel are called Thinkers. Conversations operate in sequence under the control of the chosen Task Runner (only one of these so far) and report the Wisdom of the last Conversation as the result of the Thought Process.

Each Conversation is imagined to comprise a set of Thinkers, each an expert in some aspect of the problem under consideration. The Conversation's Facilitator can ask the Thinkers to work in sequence, passing their Wisdom to each other, or in parallel, with a final Thinker reducing their accumulated Wisdom to contribue to the next Conversation.

Obviously, all of these things are programs in the form of NodeJS modules. qTools AI provides the orchestration of the Conversations among Facilitators and their Thinkers. qTools AI provides a set of Facilitators (and intended to grow over time) but it is also possible to create custom ones.

Normal use of qTools AI requires the coding of thinkers and the creation of a configuration that associates them into groups, conversations, along with parameters to specify the orchestration of the thinkers, the facilitator.

qTools AI does not know or care what the thinkers do. It provides the ability to query a netbrain (in v1.0.0 it is ChatGPT with others planned) and facilitators to orchestrate them but otherwise, it's processing is up to its author. 

In the sponsoring application, thinkers parse data files and access external HTTP resources as well as execute various prompts to successively refine the result from various perspectives.

Here is an example of the configuration for a Thought Process.

    ; ==============================================================
    ; A Thought Process is a sequence of Conversations each
    ; comprising a Facilitator and the name of a group of Thinkers
    [unityDataGenerator]
    outputsPath = <!outputDirectoryPath!>
    
    thoughtProcessSpecificationList.0.facilitatorModuleName=get-answer
    thoughtProcessSpecificationList.0.conversationThinkerListName=unityGenerator
    
    thoughtProcessSpecificationList.1.facilitatorModuleName=answer-until-valid
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
    getSpecificationData.selfName=getSpecificationData
    getSpecificationData.module=<!thinkerFolderPath!>/get-specification-data
    
    ;------------------------------------------
    xmlMaker.selfName=xmlMaker
    xmlMaker.module=<!thinkerFolderPath!>/xml-maker
    xmlMaker.smartyPantsName=gpt
    
    ;------------------------------------------
    xmlReview.selfName=xmlReview
    xmlReview.module=<!thinkerFolderPath!>/xml-review
    xmlReview.smartyPantsName=gpt
    
    ;------------------------------------------
    checkValidity.selfName=checkValidity
    checkValidity.module=<!thinkerFolderPath!>/check-validity
    checkValidity.smartyPantsName=gpt
    
    ;------------------------------------------
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
