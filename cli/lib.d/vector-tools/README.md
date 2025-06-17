# vectorTools - Semantic Vector Database Management

A command-line tool for managing and querying semantic vector databases using sqlite-vec and OpenAI embeddings.

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