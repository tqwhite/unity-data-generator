**Unity Object Generator System**

This document provides an educational, step-by-step walkthrough of the Unity Object Generator system. It begins with fundamental concepts, then builds up through architecture, components, data flows, and extension points, to give a clear understanding of how the system works and how it can be evolved.

---

## 1. Introduction and Motivation

**What is the Unity Object Generator?**
A toolchain designed to:

- Ingest educational data standards (CEDS, SIF)
- Produce semantic mappings between different standards
- Generate sample XML content for testing
- Provide a searchable, web-accessible interface for users

**Why it matters:**

- Schools and educational systems use multiple standards; aligning them manually is time-consuming.
- AI-assisted mapping speeds up integration and ensures higher quality through human feedback.

---

## 2. Core Concepts

### 2.1. Educational Standards

- **CEDS (Common Education Data Standards):** A shared vocabulary of K–12 education terms, definitions, and formats.
- **SIF (Schools Interoperability Framework):** A specification for data exchange between educational applications.

### 2.2. Semantic Search

- **Vector Embeddings:** Numeric representations of text used to find semantically similar items.
- **sqlite-vec:** A lightweight library that stores and queries vector embeddings in SQLite.

### 2.3. AI Framework

- **qtools-ai-framework:** Provides structured AI conversations ("seminars") that guide multi-stage reasoning (e.g., specification → review → fix).
- **Thinkers & Facilitators:** Components that represent AI prompts, validation steps, and feedback loops.

---

## 3. High-Level Architecture

```text
           +----------------------+        +-------------------+
           |  Excel Specifications|        |  CEDS Source Data |
           |     (SIF Data)       |        |   (XML/CSV)       |
           +----------+-----------+        +---------+---------+
                      |                              |
           spreadsheetTool                           | Manual Load
                      |                              |
                      v                              v
           +----------------------+        +-----------------------+
           |    naDataModel       |        |    _CEDSElements      |
           |  (Unity/SIF Table)   |        |    (CEDS Table)       |
           +----------+-----------+        +---------+-------------+
                      |                              |
                      |          cedsIds.sqlite3     |
                      |     (Central Database)       |
                      |                              |
         sifVectorTools                   cedsVectorTools
                      |                              |
                      v                              v
           +----------------------+        +-----------------------+
           | sifElementVectors    |        | cedsElementVectors    |
           +----------+-----------+        +---------+-------------+
                      \            unityCedsMatch        /
                       \          (AI Matching)        /
                        \                            /
                   +----------------------------------------+
                   |      unityCedsMatches (Results)       |
                   +----------------------------------------+
                              |
                              | Server APIs
                              v
                  +------------------------------+
                  |      Web Interface           |
                  |   (Browse, Vote, Manage)     |
                  +------------------------------+
```

**Key points:**

1. **Database-Centric:** All data—raw, vectors, mappings, votes—is stored in a single SQLite file (`cedsIds.sqlite3`).
2. **CLI-First, Web-Enabled:** Heavy processing happens in command-line tools; the server wraps these tools for the frontend.
3. **AI in the Loop:** AI frameworks generate, review, and refine both vector embeddings and sample XML.

---

## 4. Detailed Component Breakdown

### 4.1. Database Layer (`cedsIds.sqlite3`)

- **Tables**:
  - `naDataModel`: Unity/SIF elements (15,620 rows)
  - `_CEDSElements`: CEDS definitions (1,905 rows)
  - `unityCedsMatches`: AI-generated matches (3,797 rows)
  - `cedsElementVectors` & `sifElementVectors`: Embeddings
  - `UnityCedsVote`: Human quality votes
- **Schema Pattern**:
  - ##### `refId` (PK), `createdAt`, `updatedAt`
  - Domain fields for each entity type

### 4.2. CLI Tools

| Tool                 | Path                              | Input Source     | Output Target        | Purpose                                     |
| -------------------- | --------------------------------- | ---------------- | -------------------- | ------------------------------------------- |
| Spreadsheet Tool     | `cli/lib.d/spreadsheetTool/`      | Excel files      | `naDataModel`        | Load Unity/SIF specifications into database |
| CEDS Vector Tools    | `cli/lib.d/ceds-vector-tools/`    | `_CEDSElements`  | `cedsElementVectors` | Embed CEDS definitions for semantic search  |
| SIF Vector Tools     | `cli/lib.d/sif-vector-tools/`     | `naDataModel`    | `sifElementVectors`  | Embed SIF/Unity specs for semantic search   |
| Unity CEDS Match     | `cli/lib.d/unity-ceds-match/`     | vectors & tables | `unityCedsMatches`   | Find and store best CEDS–SIF mappings       |
| Unity Data Generator | `cli/lib.d/unity-data-generator/` | Excel specs      | XML files            | Generate sample XML via AI conversation     |

### 4.3. AI Framework Integration

- **Seminar Workflow**: Prompt → Review → Validate → Fix
- **Configuration**: `.ini` files drive AI model selection and prompt chaining.
- **Providers**: Abstracts OpenAI, Claude, Gemini.

---

## 5. Data Flow Walkthrough

### 5.1. Initial Data Loading

1. **Loading CEDS**: 
   - Manual import of CEDS XML/CSV files → `_CEDSElements` table (1,905 records)
   - Run `cedsVectorTools -writeVectorDatabase` → generates embeddings → `cedsElementVectors` table
2. **Loading SIF**: 
   - Run `spreadsheetTool -loadDatabase ImplementationSpecification.xlsx` → `naDataModel` table (15,620 records)
   - Run `sifVectorTools -writeVectorDatabase` → generates embeddings → `sifElementVectors` table

### 5.1.1. CEDS Ontology Data Loading Process

The CEDS Browse capability is powered by a comprehensive ontology database that gets loaded through the following pipeline:

#### **Source Data Files:**

- **Primary Source**: `assets/databaseDefinitionss/CEDS/CEDS-Ontology/src/CEDS-Ontology.rdf` 
  - Official CEDS ontology in W3C-compliant RDF/XML format
  - Contains 1,344 classes and 2,622 properties with full semantic relationships
- **Secondary Sources**: 
  - `assets/databaseDefinitionss/CEDS/CEDS_Elements/CEDS-Elements-V12.0.0.0_SQLITE.sql`
  - `assets/databaseDefinitionss/CEDS/CEDS_IDS/Populate-CEDS-Element-Tables_SQLITE.sql`

#### **Data Processing Pipeline:**

**Step 1: RDF Processing**

- **Tool**: `cli/lib.d/rdf-tester/rdfTester.js`
- **Configuration**: `configs/instanceSpecific/qbook/rdfTester.ini`
- **Process**: Parses CEDS-Ontology.rdf and extracts:
  - 1,344 ontology classes (both `rdfs:Class` and `owl:Class` types)
  - 2,622 properties (both `rdf:Property` and `rdfs:Property` types)
  - Class-property relationships and domain/range information
- **Output**: Creates structured JSON files:
  - `classObjects.json` - Contains rdfs:Class objects
  - `owlClassObjects.json` - Contains owl:Class objects  
  - `propertyObjects.json` - Contains all property objects

**Step 2: Database Population**

- **Tool**: `cli/lib.d/db-sql-util/dbSqlUtil.js`
- **Configuration**: `configs/instanceSpecific/qbook/dbSqlUtil.ini`
- **Commands**:
  
  ```bash
  dbSqlUtil -CEDS_Elements  # Process 240k CEDS Elements file
  dbSqlUtil -CEDS_IDS       # Process CEDS IDS file
  ```

#### **Database Schema for Ontology:**

**CEDS_Classes Table** (1,344 records):

```sql
CREATE TABLE CEDS_Classes (
    refId TEXT PRIMARY KEY,
    uri TEXT,
    name TEXT,
    label TEXT,
    comment TEXT,
    prefLabel TEXT,
    notation TEXT,
    definition TEXT,
    description TEXT,
    classType TEXT,
    jsonString TEXT,  -- Complete JSON object from RDF processing
    createdAt TEXT,
    updatedAt TEXT
);
```

**CEDS_Properties Table** (2,622 records):

```sql
CREATE TABLE CEDS_Properties (
    refId TEXT PRIMARY KEY,
    CEDS_ClassesRefId TEXT,  -- Foreign key to CEDS_Classes
    uri TEXT,
    name TEXT,
    label TEXT, 
    comment TEXT,
    prefLabel TEXT,
    notation TEXT,
    definition TEXT,
    description TEXT,
    propertyType TEXT,
    jsonString TEXT,  -- Complete JSON object
    createdAt TEXT,
    updatedAt TEXT,
    FOREIGN KEY (CEDS_ClassesRefId) REFERENCES CEDS_Classes(refId)
);
```

#### **Key Features of Ontology Processing:**

- **Semantic Preservation**: All RDF relationships maintained (domain/range, subclass hierarchy)
- **Data Integrity**: Complete JSON objects stored in `jsonString` columns for full data preservation
- **Relational Structure**: Properties linked to classes via foreign keys for efficient querying
- **Web Interface**: Browse capability served through `/api/ceds/fetchOntologyClasses` endpoint
- **Statistics**: 367 classes have associated properties, creating rich hierarchical data structure

### 5.2. Semantic Matching Process

3. **Batch Mapping**:
   - Run `unityCedsMatch <ElementName> -loadDatabase` for each Unity element
   - AI queries similar CEDS elements using vector search
   - Stores top N matches → `unityCedsMatches` table (3,797 records)
4. **Web-Based Review**:
   - Users browse matches via web interface (`naDescriptionEditor.vue`)
   - Semantic Distance Grid displays ranked CEDS suggestions
   - Users vote 'approve' or 'reject' → updates `UnityCedsVote` table

### 5.3. Content Generation

5. **XML Generation**: 
   - Run `unityDataGenerator <ElementName>`
   - AI reads specifications → structured conversation → drafts XML → validates → outputs sample files

---

## 6. External Dependencies and Configuration

- **Input Files**:
  - `ImplementationSpecification.xlsx` (SIF definitions)
  - CEDS source files (CSV/XML)
- **Libraries & Frameworks**:
  - SQLite + `sqlite-vec` for vector storage
  - `better-sqlite3` for database operations
  - `xlsx` library for Excel spreadsheet processing
  - Node.js CLI scripts with `qtools-functional-library`
  - `qtools-ai-framework` for AI conversation pipelines
  - Vue.js + Nuxt + Vuetify frontend stack
  - Key components: `naDescriptionEditor.vue`, `SemanticDistanceGrid.vue`
- **AI Models**:
  - OpenAI `text-embedding-3-small` for vector creation
  - GPT-style models for text generation and review

Configuration `.ini` files allow changing AI providers, chunk sizes, and pipeline stages without code changes.

---

## 6.1. Practical Example: Complete Workflow

**Scenario**: Setting up the system and processing Unity StudentPersonal elements

```bash
# 1. Load Unity/SIF data
spreadsheetTool -loadDatabase assets/ImplementationSpecification.xlsx

# 2. Generate vector embeddings (takes ~15 minutes for 15,620 records)
sifVectorTools -writeVectorDatabase
cedsVectorTools -writeVectorDatabase

# 3. Process all StudentPersonal elements for CEDS matching
unityCedsMatch StudentPersonals -loadDatabase

# 4. Generate sample XML for testing
unityDataGenerator StudentPersonals

# 5. Check database statistics
sifVectorTools -showStats
```

**Result**: 242 StudentPersonal elements mapped to CEDS, with AI-suggested matches stored for web review.

---

## 7. Extension Points and Best Practices

### Adding a New Standard

1. **Data Ingestion**: 
   
   - Extend `spreadsheetTool` with `--table=newStandardElements` parameter
   - Configure field mappings in `.ini` files for new standard structure

2. **Database Schema**: 
   
   - Create `<standard>Elements` & `<standard>Vectors` tables following existing pattern
   - Use consistent `refId`, `createdAt`, `updatedAt` columns

3. **Vector Tools**: 
   
   - Clone and modify existing vector tools for new standard
   - Configure embedding fields and processing rules

4. **Integration**: 
   
   - Extend `unityCedsMatch` for cross-standard mappings
   - Update web components to display multi-standard matches

### Improving Semantic Matching

- Implement chunk-level embeddings for long definitions.
- Fuse results from multiple vector searches for higher recall.
- Incorporate AI-driven confidence scoring before user review.

---

## 8. Architectural Strengths

- **Unified Data Store**: Simplifies backups and consistency.
- **Modular CLI Tools**: Easy to test, scale, and reuse.
- **AI-Driven Workflows**: Balances automation with human oversight.
- **Configuration-Driven**: Lowers barrier to adding new standards or models.
- **Vector Search**: Enables powerful, semantic discovery beyond keyword matching.

---

## 9. Next Steps and Recommendations

1. **Pilot Multi-Standard Mapping**: Integrate a third standard (e.g., IMS) to validate extensibility.
2. **Optimize Embeddings**: Benchmark single-vs. chunked embeddings for mapping accuracy.
3. **Enhance UI Feedback**: Surface AI confidence scores and feedback prompts to guide reviewers.
4. **Automate Deployments**: Containerize CLI tools and schedule periodic data refresh tasks.

---

## 10. Common Tasks and Troubleshooting

### Typical Maintenance Commands

```bash
# Check database health and table counts
sifVectorTools -showStats
cedsVectorTools --help

# Clean up old backups
spreadsheetTool -purgeBackupDbTables

# Regenerate vectors after data changes
sifVectorTools -dropTable -writeVectorDatabase
cedsVectorTools -writeVectorDatabase

# Process new Unity object types
spreadsheetTool -list assets/ImplementationSpecification.xlsx
unityCedsMatch NewObjectType -loadDatabase
```

### Performance Considerations

- **Vector Generation**: ~15-20 minutes for full SIF dataset (15,620 records)
- **Database Size**: ~50MB for complete dataset with vectors
- **Memory Usage**: 2-4GB during vector generation, 500MB for web operations
- **Concurrent Users**: Web interface supports 10+ simultaneous users

### Common Issues

1. **"No such module: vec0" error**: Install `sqlite-vec` extension or check SQLite version
2. **OpenAI API rate limits**: Configure delays in AI framework `.ini` files
3. **Large spreadsheet timeouts**: Process in batches using `--limit` and `--offset` parameters
4. **Vector search returning no results**: Verify embeddings exist with `-showStats`

---

*This documentation aims to guide developers and stakeholders through the Unity Object Generator’s design and to provide a roadmap for maintaining and extending the system.*
