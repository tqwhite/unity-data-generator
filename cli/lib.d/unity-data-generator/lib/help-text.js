#!/usr/bin/env node
'use strict';


const qt = require('qtools-functional-library');

//START OF moduleFunction() ============================================================

const moduleFunction = function(args={}) {


const mainHelp=args=>{


const {defaultRequestFilePath, errorMessage=''}=args;

return `
============================================================

NAME

	Uniuty Data Generator - Generate XML test data for A4L Unity Data model

DESCRIPTION

	unityDataGenerator --elements=ELEMENTNAME [OPTIONS]
	
	AI-powered XML test data generator for Unity/SIF educational data models.
	Uses advanced AI thought processes to create realistic, semantically coherent
	XML data that complies with Unity/SIF standards and educational data requirements.
	
	AI THOUGHT PROCESS WORKFLOW:
	The tool employs sophisticated AI reasoning through configurable thought processes:
	1. ELEMENT ANALYSIS: AI analyzes Unity element structure and relationships
	2. SEMANTIC GENERATION: Creates contextually appropriate data values
	3. COHERENCE VALIDATION: Ensures data relationships make logical sense
	4. STANDARDS COMPLIANCE: Validates against Unity/SIF specifications
	
	THOUGHT PROCESS SELECTION:
	- UDG_Thought_Process: Standard Unity Data Generation with semantic validation
	- JEDX_Thought_Process: JEDX-specific processing with enhanced coherence checking
	
	OUTPUT FORMATS:
	Generates well-formed XML files that can be used for:
	- System testing and validation
	- Sample data for development
	- Educational data standards demonstration
	- Integration testing with SIS systems

CONTROLS

	--elements:         REQUIRED: Unity/SIF element name to generate data for
	                    Examples: LEAAccountabilitys, StudentPersonal, SchoolInfo
	                    Use -listElements to see all available element types
	                    
	--thoughtProcess:   AI_PROCESS: Specify AI reasoning sequence for XML generation
	                    - UDG_Thought_Process: Standard Unity data generation (default)
	                    - JEDX_Thought_Process: JEDX-optimized processing
	                    
	--refinerName:      AI_REFINER: AI process sequence for data refinement and validation
	                    Post-processing step to improve data quality and coherence
	                    
	--overrideConfigPath: CONFIG: Custom configuration file path
	                     Overrides default configs/systemParameters.ini settings
	                     
	--promptLibrary:    PROMPTS: AI prompt library selection
	                    - udg-v1: Standard Unity Data Generator prompts
	                    - jedx-v1: JEDX-specific prompts
	                    
	--promptVersion:    VERSION: Prompt version within selected library
	                    Default: defaultStrings (use for standard operations)

SWITCHES

	-outFile:           OUTPUT: Custom output file path for generated XML
	                    Overrides default file naming convention
	                    
	-echoAlso:          DISPLAY: Show generated XML in console as well as saving to file
	                    Useful for debugging and immediate review
	                    
	-listElements:      INFO: Display all available Unity element types for generation
	                    Shows complete list of supported data models
	                    
	-validateOutput:    QUALITY: Validate generated XML against Unity/SIF schemas
	                    Recommended for production use to ensure compliance
<!frameworkHelpInfo!>
AI THOUGHT PROCESSES

	UDG_Thought_Process:    Standard Unity Data Generation workflow
	                       - Analyzes element structure and requirements
	                       - Generates semantically appropriate values
	                       - Validates data relationships and constraints
	                       
	JEDX_Thought_Process:   JEDX-optimized processing with enhanced coherence
	                       - Specialized for JSON Educational Data Exchange
	                       - Enhanced coherence checking for complex relationships
	                       - Group validity verification for related data elements

DATA QUALITY FEATURES

	Semantic Coherence:     AI ensures generated data makes logical sense
	                       Example: Student grade levels match their ages and courses
	                       
	Relationship Validation: Cross-references ensure data consistency
	                        Example: School IDs match LEA associations
	                        
	Standards Compliance:   Generated data follows Unity/SIF specifications
	                       Proper data types, ranges, and formatting

COMMON OPERATIONS

	Basic Generation:
	unityDataGenerator --elements=LEAAccountabilitys                    # Simplest model
	unityDataGenerator --elements=StudentPersonal -echoAlso            # Show output
	
	Advanced AI Processing:
	unityDataGenerator --elements=SchoolInfo --thoughtProcess=UDG_Thought_Process -verbose
	unityDataGenerator --elements=StudentPersonal --thoughtProcess=JEDX_Thought_Process
	
	Custom Configuration:
	unityDataGenerator --elements=LEAAccountabilitys --promptLibrary=udg-v1 -outFile=custom.xml
	unityDataGenerator --overrideConfigPath="/path/to/custom.ini" --elements=StudentPersonal

EXAMPLES

	unityDataGenerator --elements=LEAAccountabilitys                              # Basic generation
	unityDataGenerator --elements=StudentPersonal -echoAlso -validateOutput      # Full validation
	unityDataGenerator --elements=SchoolInfo --thoughtProcess=JEDX_Thought_Process -verbose
	unityDataGenerator --elements=StudentPersonal --promptLibrary=udg-v1 -outFile=student_data.xml
	unityDataGenerator -listElements                                             # Show available elements

INTEGRATION WORKFLOW

	Typically used with other Unity Object Generator tools:
	1. unityDataGenerator: Generate test XML data
	2. vectorTools: Create semantic embeddings for similarity search  
	3. unityCedsMatch: Map generated data to CEDS standards
	4. dbSqlUtil: Store and query generated data in project database

============================================================
${errorMessage}
`
	;

}

	return ({mainHelp});
};

//END OF moduleFunction() ============================================================

module.exports = moduleFunction();
//moduleFunction().workingFunction().qtDump();

