# Vector Operations Modules

This directory contains the core vector operation modules for vector-tools2:

## Modules

### vector-generator.js
Handles incremental vector generation with progress tracking and resume capabilities.

**Key Methods:**
- `generateVectors(config)` - Start new vector generation process
- `resume(config)` - Resume interrupted generation from last checkpoint

**Features:**
- Progress tracking with batch IDs
- Resumable operations 
- Integration with semantic analyzers
- Configurable limits and offsets

### vector-query.js  
Performs semantic similarity searches on vector databases.

**Key Methods:**
- `search(config, queryString, resultCount)` - Semantic similarity search
- `explainQuery(config, queryString)` - Detailed query analysis
- `batchSearch(config, queries, resultCount)` - Multiple queries at once

**Features:**
- Support for multiple semantic analysis modes
- Verbose query expansion
- JSON and formatted output options
- Query explanation capabilities

### vector-rebuild.js
Complete rebuild of vector databases with backup and verification.

**Key Methods:**
- `rebuild(config)` - Complete database rebuild
- `rebuildWithBackup(config)` - Rebuild with automatic backup/restore

**Features:**
- Complete table recreation
- Progress tracking for rebuilds
- Database optimization (VACUUM, ANALYZE)
- Rebuild verification
- Backup and restore capabilities

## Usage Pattern

All modules follow the same dependency injection pattern:

```javascript
const { vectorGenerator, vectorQuery, vectorRebuild } = require('./vector-operations');

// Initialize with dependencies
const generator = vectorGenerator({ dbUtility, analyzerRegistry, progressTracker });
const query = vectorQuery({ dbUtility, analyzerRegistry });
const rebuild = vectorRebuild({ dbUtility, analyzerRegistry, progressTracker });

// Use the modules
await generator.generateVectors(config);
const results = await query.search(config, 'search query', 5);
await rebuild.rebuild(config);
```

## Integration Points

- **dbUtility**: Direct database operations using direct-query-utility
- **analyzerRegistry**: Semantic analyzer selection and validation
- **progressTracker**: Resumable operation tracking
- **Global OpenAI**: AI service access via process.global.openai

## Configuration Object

All methods expect a configuration object with:

```javascript
const config = {
    dataProfile: 'ceds',              // Data profile identifier
    semanticAnalysisMode: 'simpleVector',  // Analyzer type
    sourceTableName: '_CEDSElements',      // Source data table
    vectorTableName: 'ceds_vectors',       // Target vector table
    sourcePrivateKeyName: 'refId',         // Primary key field
    sourceEmbeddableContentName: ['ElementName', 'Definition']  // Fields to embed
};
```