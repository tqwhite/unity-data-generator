# vectorTools - Semantic Vector Database Management

A modular command-line tool for managing and querying semantic vector databases using sqlite-vec and OpenAI embeddings. Features pluggable semantic analysis approaches including simple vector embeddings and AI-powered atomic fact decomposition.

## Architecture

This tool implements a **Direct Polymorphic Semantic Analyzers** architecture with pluggable analysis strategies:

### Core Modules

- **Vector Config Handler** - Configuration management and validation
- **Vector Database Operations** - Core database operations and utilities  
- **Drop All Vector Tables** - Safe table deletion with enhanced safety checks
- **Vector Rebuild Workflow** - Complete database rebuild process
- **User Interaction Handler** - Command processing and user messaging
- **Application Initializer** - Application setup and dependency management
- **Progress Tracker** - Resume functionality for long-running operations

### Semantic Analyzers (Pluggable)

- **Simple Vector** - Direct embedding approach (original functionality)
- **Atomic Vector** - AI-powered semantic fact decomposition
- **Future Analyzers** - Architecture supports additional analysis strategies

The system uses a polymorphic interface allowing different semantic analysis approaches to be selected via command line parameters, providing flexibility for various matching requirements while maintaining consistent APIs.

## Testing

### Test Suite

The project includes comprehensive tests for all modules. Run individual test files directly:

```bash
# Run all tests individually
node test/test-vector-config-handler.js
node test/test-vector-database-operations.js
node test/test-drop-all-vector-tables.js
node test/test-vector-rebuild-workflow.js
node test/test-user-interaction-handler.js
node test/test-application-initializer.js

# Or run them all at once
for test in test/test-*.js; do echo "Running $test"; node "$test"; done
```

### Test Commands Reference

Each test file can be run independently and provides specific functionality verification:

```bash
# Configuration and validation tests (7 tests)
node test/test-vector-config-handler.js

# Database operations and utilities tests (16 tests)
node test/test-vector-database-operations.js

# Table drop operations with safety checks (12 tests)
node test/test-drop-all-vector-tables.js

# Complete rebuild workflow tests (10 tests)
node test/test-vector-rebuild-workflow.js

# User interaction and command handling tests (10 tests)
node test/test-user-interaction-handler.js

# Application initialization tests (12 tests)
node test/test-application-initializer.js
```

### Test Coverage

- **67 test scenarios** across all modules (7+16+12+10+10+12)
- **Error handling verification** for all failure modes
- **Integration testing** with real database
- **Performance testing** for database operations
- **Command validation** and conflict detection
- **User interaction patterns** and messaging

### Development Workflow

```bash
# During development, run tests frequently
node test/test-vector-config-handler.js
node test/test-vector-database-operations.js

# Before committing changes, run all tests
for test in test/test-*.js; do echo "Running $test"; node "$test"; done

# Test specific functionality
node test/test-vector-database-operations.js && node test/test-user-interaction-handler.js

# Verify specific module integration
node test/test-application-initializer.js
```

## Module Structure

```
lib/
├── vector-config-handler.js       # Configuration management
├── vector-database-operations.js  # Database utilities
├── drop-all-vector-tables.js     # Safe table operations
├── vector-rebuild-workflow.js    # Complete rebuild process
├── user-interaction-handler.js   # Command processing
└── application-initializer.js    # App setup

test/
├── test-vector-config-handler.js
├── test-vector-database-operations.js
├── test-drop-all-vector-tables.js
├── test-vector-rebuild-workflow.js
├── test-user-interaction-handler.js
└── test-application-initializer.js
```

## Command Syntax

**Important**: This tool uses TQ's command line parser conventions:

- **Switches** (no value): Use ONE hyphen: `-showStats`, `-dropTable`, `-verbose`
- **Values** (has value): Use TWO hyphens: `--dataProfile=sif`, `--queryString="text"`

## Semantic Analysis Modes

The system supports multiple semantic analysis approaches via the `--semanticAnalysisMode` parameter. Each approach represents a different strategy for understanding and matching semantic content, designed to handle various requirements for precision, performance, and semantic depth.

### Simple Vector Analysis (`--semanticAnalysisMode=simpleVector`)

The simple vector approach represents the foundational semantic analysis method, extracted from the original vectorTools implementation. This mode provides fast, direct semantic matching suitable for general-purpose applications.

#### How Simple Vector Works:

1. **Direct Text Processing**: Input text undergoes basic transformations:
   
   - Removes camelCase boundaries (`StudentGrouping` → `Student Grouping`)
   - Strips leading 'x' characters from XPath fields (`xStudentName` → `StudentName`)
   - Preserves semantic meaning while normalizing format

2. **Single Embedding Generation**: Each record produces exactly one 1536-dimension embedding using OpenAI's text-embedding-3-small model

3. **SQLite vec0 Storage**: Embeddings stored in virtual tables optimized for vector operations:
   
   ```sql
   CREATE VIRTUAL TABLE cedsElementVectors USING vec0(embedding float[1536])
   ```

4. **Direct Similarity Matching**: Uses sqlite-vec's built-in cosine similarity for fast retrieval

**Use Cases**: General semantic search, performance-critical applications, straightforward concept matching

**Example Usage**:

```bash
vectorTools --dataProfile=ceds --semanticAnalysisMode=simpleVector --queryString="student assessment"
```

### Atomic Vector Analysis (`--semanticAnalysisMode=atomicVector`)

The atomic vector approach implements AI-powered semantic factorization, breaking complex educational definitions into atomic facts for nuanced, multi-dimensional matching. This represents one possible advanced analysis strategy, with the architecture designed to accommodate additional innovative approaches.

#### How Atomic Vector Works:

1. **AI-Powered Fact Extraction**: Uses a structured prompt to decompose complex definitions:
   
   **Extraction Prompt Structure**:
   
   ```
   You are an expert in educational data standards. Analyze this definition and extract:
   
   1. FACTS: Discrete, specific pieces of information
   2. FUNCTIONAL_ROLE: What this concept does or represents
   3. SEMANTIC_CATEGORIES: Domain classifications (Education, Assessment, etc.)
   4. CONCEPTUAL_DIMENSIONS: Characteristic spectrums with positions
   
   Definition: "An indication of whether the school has students 
   who are ability grouped for classroom instruction in mathematics 
   or English/reading/language arts."
   ```

2. **Structured Fact Decomposition**: AI extracts semantic components:
   
   ```json
   {
     "facts": [
       {"text": "The school has students who are ability grouped for classroom instruction"}
     ],
     "functional_role": "Identifying presence of ability grouping in education",
     "semantic_categories": ["Education", "School Evaluation"],
     "conceptual_dimensions": [
       {"dimension": "educational method", "position": "grouped ↔ non-grouped"}
     ]
   }
   ```

3. **Multiple Embedding Pattern Generation**: Each fact set generates 5+ embedding variants:
   
   - **Primary Context**: `"[definition] serves as [functional_role] in [categories] domain"`
   - **Individual Facts**: Each discrete fact separately embedded
   - **Functional Role**: `"[functional_role]: [definition]"`
   - **Conceptual Dimensions**: `"[dimension] spectrum [position] characteristic"`
   - **Semantic Categories**: `"[category]: [combined facts]"`

4. **Atomic Database Storage**: Multiple embeddings per source record with rich metadata:
   
   ```sql
   CREATE TABLE cedsElementVectors_atomic (
       refId TEXT PRIMARY KEY,           -- Unique atomic fact ID
       sourceRefId TEXT,                 -- Original record reference
       factType TEXT,                    -- Type of embedding pattern
       factText TEXT,                    -- The text that was embedded
       embedding BLOB,                   -- 1536-dimension vector
       semanticCategory TEXT,            -- Domain classification
       conceptualDimension TEXT,         -- Dimensional characteristic
       factIndex INTEGER,                -- Index within fact set
       createdAt TEXT DEFAULT CURRENT_TIMESTAMP
   )
   ```

5. **Query Factorization**: User queries undergo the same decomposition process, generating multiple query embeddings that match against the atomic fact database

6. **Composite Scoring**: Results aggregated by source record with sophisticated scoring:
   
   - **Primary Score**: Number of unique fact types matched
   - **Secondary Score**: Average semantic distance
   - **Composite Formula**: `uniqueFactTypes - (avgDistance * 0.1)`

**Use Cases**: Complex educational standards analysis, multi-faceted concept matching, detailed semantic understanding

**Example Usage**:

```bash
vectorTools --dataProfile=ceds --semanticAnalysisMode=atomicVector --queryString="student assessment" -verbose
```

### Future Analysis Modes

The polymorphic architecture anticipates additional semantic analysis strategies. Potential future approaches might include:

- **Hybrid Vector**: Combining simple and atomic approaches for balanced performance/precision
- **Domain-Specific**: Specialized analyzers for particular educational domains
- **Multi-Modal**: Incorporating non-textual semantic elements
- **Cross-Lingual**: Semantic analysis across multiple languages
- **Ontology-Network:** Vector select starting nodes for tree structure analysis

New analyzers can be added by implementing the standard interface (`processFactsIntoDatabaseVectors`, `scoreDistanceResults`) and registering in the semantic analyzer loader.

## Database Management Commands

### Show Database Statistics

Display vector table status, record counts, and database overview:

```bash
vectorTools --dataProfile=sif -showStats
vectorTools --dataProfile=ceds -showStats
```

### Drop Vector Tables

Remove all vector tables for a specific data profile:

```bash
vectorTools --dataProfile=sif -dropTable
vectorTools --dataProfile=ceds -dropTable
```

### Rebuild Vector Database

Complete rebuild of vector embeddings from source data (drops tables if needed):

```bash
# Rebuild with simple vector analysis (default)
vectorTools --dataProfile=sif -rebuildDatabase
vectorTools --dataProfile=ceds -rebuildDatabase

# Rebuild with atomic vector analysis
vectorTools --dataProfile=ceds -rebuildDatabase --semanticAnalysisMode=atomicVector
```

### Automated Rebuild (No Prompts)

Use `-yesAll` to automatically answer "yes" to all confirmation prompts:

```bash
# Automated simple vector rebuild
vectorTools --dataProfile=sif -rebuildDatabase -yesAll
vectorTools --dataProfile=ceds -rebuildDatabase -yesAll

# Automated atomic vector rebuild
vectorTools --dataProfile=ceds -rebuildDatabase --semanticAnalysisMode=atomicVector -yesAll
```

### Write Vector Database (Incremental)

Generate vectors without dropping existing tables (adds/updates records):

```bash
# Simple vector generation
vectorTools --dataProfile=ceds -writeVectorDatabase

# Atomic vector generation
vectorTools --dataProfile=ceds -writeVectorDatabase --semanticAnalysisMode=atomicVector

# Limited generation (useful for testing)
vectorTools --dataProfile=ceds -writeVectorDatabase --limit=100
```

### Progress Tracking and Resume

For long-running vector generation operations, the system provides progress tracking and resume capabilities:

```bash
# Resume interrupted operation (latest batch)
vectorTools --dataProfile=ceds -resume

# Resume specific batch by ID
vectorTools --dataProfile=ceds -resume --batchId=ceds_atomicVector_20250729T1234567_123

# Show progress status
vectorTools -showProgress

# Clear progress tracking before fresh start
vectorTools --dataProfile=ceds -writeVectorDatabase -purgeProgressTable
```

## Query Commands

### Basic Semantic Search

Find semantically similar records using simple vector analysis (default):

```bash
vectorTools --dataProfile=sif --queryString="Gun Free Schools Act"
vectorTools --dataProfile=ceds --queryString="Gun Free Schools Act"
```

### Atomic Vector Search

Use atomic vector analysis for more nuanced matching:

```bash
vectorTools --dataProfile=ceds --queryString="student ability grouping" --semanticAnalysisMode=atomicVector
```

### Verbose Query Analysis

Show detailed query expansion and matching process (especially useful with atomic vectors):

```bash
# Simple vector verbose output
vectorTools --dataProfile=ceds -verbose --queryString="Gun Free Schools Act"

# Atomic vector verbose output (shows query factorization)
vectorTools --dataProfile=ceds -verbose --queryString="student assessment data" --semanticAnalysisMode=atomicVector
```

**Verbose Output Example** (atomic mode):

```
╔═══════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                                      QUERY EXPANSION ANALYSIS                                         ║
╚═══════════════════════════════════════════════════════════════════════════════════════════════════════╝
├─ Original Query: "student ability grouping"
│
├─ Enriched String 1 [primary_context]: "student ability grouping serves as Identifying educational organization..."
│  ├─ [0.2345] RefID: 123456 (individual_fact: "Students are organized by academic performance")
│  └─ [0.2789] RefID: 234567 (functional_role: "classroom organization methods")
│
└─ Enriched String 2 [individual_fact]: "Educational grouping by student capability"
   ├─ [0.1987] RefID: 345678 (primary_context: "ability-based student organization")
   └─ [0.2456] RefID: 456789 (semantic_category: "educational practice classification")

Found 5 valid matches for "student ability grouping"
```

### Custom Result Count

Control number of results returned (default: 5):

```bash
vectorTools --dataProfile=sif --queryString="Gun Free Schools Act" --resultCount=10
```

## Data Profiles

### SIF Profile (`--dataProfile=sif`)

- **Source Table**: `naDataModel`
- **Key Field**: `refId`
- **Embeddable Content**: `Description`, `XPath`
- **Default Vector Table**: `sifElementVectors`
- **Key Format**: Standard string conversion

### CEDS Profile (`--dataProfile=ceds`)

- **Source Table**: `_CEDSElements`
- **Key Field**: `GlobalID`
- **Embeddable Content**: `Definition`
- **Default Vector Table**: `cedsElementVectors`
- **Key Format**: Zero-padded to 6 digits (e.g., "134" → "000134")

## Additional Options

### Core Parameters

- `--semanticAnalysisMode=simpleVector|atomicVector` - Choose analysis approach (default: simpleVector)
- `--targetTableName=customName` - Override default vector table name
- `--resultCount=N` - Number of results to return (default: 5)
- `--offset=N` - Starting offset for results
- `--limit=N` - Limit number of records processed

### Operation Control

- `-yesAll` - Automatically answer "yes" to all confirmation prompts (useful for automation)
- `-verbose` - Show detailed processing information and query expansion analysis
- `-json` - Output results in JSON format

### Progress Tracking

- `-resume` - Resume interrupted vector generation operation
- `-showProgress` - Display progress tracking information
- `-purgeProgressTable` - Clear progress tracking for current data profile
- `--batchId=ID` - Resume specific batch by identifier

## Examples

### Basic Operations

```bash
# Quick database status check
vectorTools --dataProfile=sif -showStats

# Clean rebuild of SIF vectors (simple mode)
vectorTools --dataProfile=sif -rebuildDatabase

# Rebuild CEDS vectors with atomic analysis
vectorTools --dataProfile=ceds -rebuildDatabase --semanticAnalysisMode=atomicVector
```

### Semantic Search Examples

```bash
# Basic search (simple vector mode)
vectorTools --dataProfile=ceds --queryString="student assessment data"

# Advanced search with atomic vector analysis
vectorTools --dataProfile=ceds --queryString="student ability grouping" --semanticAnalysisMode=atomicVector

# Detailed search with verbose query expansion analysis
vectorTools --dataProfile=ceds -verbose --queryString="special education" --semanticAnalysisMode=atomicVector --resultCount=10
```

### Vector Generation with Progress Tracking

```bash
# Generate atomic vectors with progress tracking
vectorTools --dataProfile=ceds -writeVectorDatabase --semanticAnalysisMode=atomicVector --limit=500

# Resume interrupted generation
vectorTools --dataProfile=ceds -resume

# Check progress status
vectorTools -showProgress

# Clear progress and start fresh
vectorTools --dataProfile=ceds -writeVectorDatabase --semanticAnalysisMode=atomicVector -purgeProgressTable
```

### Comparative Analysis

```bash
# Compare same query with different analysis modes
vectorTools --dataProfile=ceds --queryString="classroom instruction methods" --semanticAnalysisMode=simpleVector
vectorTools --dataProfile=ceds --queryString="classroom instruction methods" --semanticAnalysisMode=atomicVector

# Verbose comparison to see different expansion strategies
vectorTools --dataProfile=ceds --queryString="educational assessment" -verbose --semanticAnalysisMode=simpleVector
vectorTools --dataProfile=ceds --queryString="educational assessment" -verbose --semanticAnalysisMode=atomicVector
```

## Database Configuration

- **Database Path**: `/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/datastore/cedsIds.sqlite3`
- **Vector Extension**: sqlite-vec v0.1.7-alpha.2
- **Embedding Model**: OpenAI text-embedding-3-small (1536 dimensions)

## Output Format

Query results show:

- **Score**: Semantic similarity score or distance (varies by analysis mode)
- **ID**: Record identifier (refId or GlobalID)  
- **Description**: Relevant content from embeddable fields

### Simple Vector Output

```
Found 5 valid matches for "Gun Free Schools Act"

1. [score: 0.234567] 12345 Gun-Free Schools Act implementation guidelines
2. [score: 0.298432] 67890 School safety policy requirements
3. [score: 0.312458] 54321 Zero tolerance discipline procedures
...
```

### Atomic Vector Output

Atomic vector mode provides composite scoring based on multiple fact matches:

```
Found 5 valid matches for "student ability grouping"

1. [score: 2.876543] 123456 An indication of whether the school has students who are ability grouped for classroom instruction
2. [score: 2.654321] 234567 Educational practice of organizing students by academic performance level
3. [score: 1.987654] 345678 Method of classroom organization based on student capabilities
...
```

**Score Interpretation**:

- **Simple Vector**: Lower distance values indicate better matches (closer semantic similarity)
- **Atomic Vector**: Higher composite scores indicate better matches (more matched fact types and closer semantic distance)

## Troubleshooting

### Configuration Issues

If you encounter configuration errors, check:

1. **Data profile parameter**: Ensure `--dataProfile=sif` or `--dataProfile=ceds` is specified
2. **Database path**: Verify the database file exists and is accessible
3. **OpenAI API key**: Check that your API key is configured correctly

### Database Issues

For database connection or operation issues:

```bash
# Test database operations
node test/test-vector-database-operations.js

# Verify database statistics
vectorTools --dataProfile=ceds -showStats
```

### Module Issues

If you suspect issues with specific modules:

```bash
# Test individual modules
node test/test-vector-config-handler.js
node test/test-user-interaction-handler.js
node test/test-application-initializer.js

# Run full test suite
for test in test/test-*.js; do echo "Running $test"; node "$test"; done
```

### Performance Issues

The database operations are performance-tested:

```bash
# Run performance tests
node test/test-vector-database-operations.js
# Look for: "Completed 200 operations in XXXms"
```

## Version History

- **v3.0.0** - **Direct Polymorphic Semantic Analyzers Architecture**
  
  - Added pluggable semantic analysis modes (simple-vector, atomic-vector)
  - Implemented AI-powered atomic fact decomposition with structured prompts
  - Added progress tracking and resume functionality for long operations
  - Enhanced verbose query analysis with expansion visualization
  - Future-ready architecture for additional analysis strategies

- **v2.0.0** - Major refactoring into modular architecture with comprehensive test suite

- **v1.0.0** - Initial monolithic implementation