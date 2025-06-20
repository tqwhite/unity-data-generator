# vectorTools - Semantic Vector Database Management

A modular command-line tool for managing and querying semantic vector databases using sqlite-vec and OpenAI embeddings.

## Architecture

This tool has been refactored into a modular architecture with six specialized modules:

- **Vector Config Handler** - Configuration management and validation
- **Vector Database Operations** - Core database operations and utilities  
- **Drop All Vector Tables** - Safe table deletion with enhanced safety checks
- **Vector Rebuild Workflow** - Complete database rebuild process
- **User Interaction Handler** - Command processing and user messaging
- **Application Initializer** - Application setup and dependency management

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
vectorTools --dataProfile=sif -rebuildDatabase
vectorTools --dataProfile=ceds -rebuildDatabase
```

### Automated Rebuild (No Prompts)

Use `-yesAll` to automatically answer "yes" to all confirmation prompts:

```bash
vectorTools --dataProfile=sif -rebuildDatabase -yesAll
vectorTools --dataProfile=ceds -rebuildDatabase -yesAll
```

## Query Commands

### Basic Semantic Search

Find semantically similar records:

```bash
vectorTools --dataProfile=sif --queryString="Gun Free Schools Act"
vectorTools --dataProfile=ceds --queryString="Gun Free Schools Act"
```

### Verbose Output

Show detailed processing information:

```bash
vectorTools --dataProfile=sif -verbose --queryString="Gun Free Schools Act"
vectorTools --dataProfile=ceds -verbose --queryString="Gun Free Schools Act"
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

- `--targetTableName=customName` - Override default vector table name
- `--resultCount=N` - Number of results to return (default: 5)
- `--offset=N` - Starting offset for results
- `--limit=N` - Limit number of results
- `-yesAll` - Automatically answer "yes" to all confirmation prompts (useful for automation)

## Examples

```bash
# Quick database status check
vectorTools --dataProfile=sif -showStats

# Clean rebuild of SIF vectors
vectorTools --dataProfile=sif -rebuildDatabase

# Search for education-related content
vectorTools --dataProfile=ceds --queryString="student assessment data"

# Detailed search with more results
vectorTools --dataProfile=sif -verbose --queryString="special education" --resultCount=15

# Drop and rebuild CEDS vectors
vectorTools --dataProfile=ceds -dropTable
vectorTools --dataProfile=ceds -rebuildDatabase
```

## Database Configuration

- **Database Path**: `/Users/tqwhite/Documents/webdev/A4L/unityObjectGenerator/system/datastore/cedsIds.sqlite3`
- **Vector Extension**: sqlite-vec v0.1.7-alpha.2
- **Embedding Model**: OpenAI text-embedding-3-small (1536 dimensions)

## Output Format

Query results show:

- **Score**: Semantic distance (lower = better match)
- **ID**: Record identifier (refId or GlobalID)
- **Description**: Relevant content from embeddable fields

Example output:

```
Found 5 valid matches

1. [score: 0.234567] 12345 Gun-Free Schools Act implementation guidelines
2. [score: 0.298432] 67890 School safety policy requirements
3. [score: 0.312458] 54321 Zero tolerance discipline procedures
...
```

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

- **v2.0.0** - Major refactoring into modular architecture with comprehensive test suite
- **v1.0.0** - Initial monolithic implementation