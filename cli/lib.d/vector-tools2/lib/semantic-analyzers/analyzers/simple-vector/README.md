# Simple Vector Semantic Analyzer

A basic vector-based semantic analyzer for vector-tools2 that implements non-atomic semantic analysis using embeddings.

## Overview

The simple vector analyzer processes facts directly into database vectors without atomic decomposition. It performs straightforward semantic similarity matching using OpenAI embeddings and vector similarity search.

## Architecture

Following polyArch2 principles with module locality:

```
simple-vector/
├── simple-vector.js          # Main analyzer class implementing SemanticAnalyzer interface
├── lib/
│   ├── process-facts.js      # Processes facts into database vectors
│   └── score-results.js      # Scores distance results from vector search
├── package.json              # Module metadata
└── README.md                 # This file
```

## Interface Implementation

Implements the complete `SemanticAnalyzer` interface:

- `processFactsIntoDatabaseVectors(args)` - Generate embeddings and store vectors
- `scoreDistanceResults(args)` - Search vectors and score results
- `getAnalyzerType()` - Returns 'simple'
- `getVersion()` - Returns '2.0.0'
- `getPrettyPrintFunction()` - Optional results formatter

## Features

### Vector Processing
- Processes embeddable content into OpenAI embeddings (text-embedding-3-small)
- Handles special transformations for CEDS XPath data
- Stores vectors in SQLite using vec0 format for backward compatibility
- Supports progress tracking and batch processing

### Query Processing
- Processes query strings with same transformations as source data
- Supports multiple data profiles (SIF, CEDS) with different key formatting strategies
- Simple distance-based scoring where score equals vector distance

### Data Profile Strategies
- **SIF**: Standard string key formatting
- **CEDS**: Zero-padded 6-digit key formatting

## Usage

The analyzer is automatically registered with the SemanticAnalyzerRegistry and can be used via:

```bash
vectorTools2 --semanticAnalysisMode=simpleVector --dataProfile=ceds
```

## Dependencies

- OpenAI client for embeddings generation
- SQLite database with vec0 extension for vector storage
- qtools-functional-library for utilities
- TQ's global process variables (xLog, getConfig)

## Version History

- **2.0.0** - Initial vector-tools2 implementation following polyArch2 principles