# db-sql-util

A utility for executing SQL statements from files against SQLite databases, designed for processing CEDS (Common Education Data Standards) elements and related data.

## Features

- Processes a file full of SQL statements, removes comments, and splits them on semicolons (properly handling semicolons in quotes)
- Executes statements against a SQLite database in manageable batches
- Provides progress reporting and error handling
- Supports transaction management (auto-rollback on errors)
- Allows resuming execution from a specific point with the --skip parameter
- Configurable via INI files

## Installation

This utility is part of the CLI tools and should be available in your PATH after running the initCli.js setup.

## Configuration

Create a configuration file named `dbSqlUtil.ini` in the appropriate configuration directory. See `sample-config.ini` for an example. The configuration should include:

- `databaseFilePath`: Path to the SQLite database file
- `sqlPaths`: Paths to SQL script files for different operations

Example:

```ini
[dbSqlUtil]
; Path to the SQLite database file
databaseFilePath=/path/to/your/sqlite/database.db

; Paths to SQL script files
sqlPaths.CEDS_Elements=/path/to/CEDS_Elements/CEDS-Elements-V12.0.0.0_SQLITE.sql
sqlPaths.CEDS_IDS=/path/to/CEDS_IDS/Populate-CEDS-Element-Tables_SQLITE.sql
```

## Usage

Basic usage:

```bash
dbSqlUtil -CEDS_Elements|-CEDS_IDS [options]
```

### Options

- `-CEDS_Elements`: Process CEDS Elements SQL file
- `-CEDS_IDS`: Process CEDS IDs SQL file
- `--databasePath=<path>`: Override the database path from config
- `--skip=<N>`: Skip the first N statements (for resuming after a previous run)
- `-help`, `--help`: Show help message
- `-silent`: Suppress all messages
- `-quiet`: Only show errors
- `-verbose`: Show detailed operation messages
- `-debug`: Show all debug information

## Examples

Process CEDS Elements file:
```bash
dbSqlUtil -CEDS_Elements
```

Process CEDS IDs file with a custom database path:
```bash
dbSqlUtil -CEDS_IDS --databasePath=/custom/path/to/database.db
```

Show help:
```bash
dbSqlUtil -help
```

Run with detailed logging:
```bash
dbSqlUtil -CEDS_Elements -verbose
```

Resume execution after a previous run:
```bash
dbSqlUtil -CEDS_IDS --skip=15000
```

The utility will automatically display restart information at the end of each batch, showing the exact skip value to use when resuming execution:
```
=============================================
RESTART INFO: To continue from the next batch, use:
--skip=10000
=============================================
```

## Dependencies

- better-sqlite3: SQLite database interface
- qtools-parse-command-line: Command line parser
- qtools-config-file-processor: Configuration file processor
- x-log: Logging utility