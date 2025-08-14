# sqlite-instance Module

## Origin
This module is copied from `/system/code/server/data-model/lib/sqlite-instance/sqlite-instance.js`

## Purpose
Provides a safe, sophisticated SQLite database abstraction layer with:
- **Crash Prevention**: Uses better-sqlite3 library, no CLI calls
- **Vector Support**: Auto-loads sqlite-vec extension for vector operations
- **Auto-Schema Evolution**: Automatically adds columns when saving objects with new fields
- **Smart Save**: INSERT or UPDATE based on refId existence
- **Template SQL**: Uses `<!tableName!>` substitution pattern
- **Built-in Timestamps**: Automatic createdAt/updatedAt management

## Changes from Server Version

### 1. Dependencies
- **Removed**: None - all dependencies maintained
- **Added**: None - uses same dependencies as server

### 2. Configuration
- Uses `process.global` for xLog, getConfig (same as server)
- No changes to configuration approach

### 3. Functionality
- **No functional changes** - exact copy to ensure compatibility
- All methods work identically to server version

## Key Interfaces

### initDatabaseInstance(dbFilePath, callback)
Initializes database with vector support.

### getTable(tableName, options, callback)
Returns table object with methods:
- `getData(statement, options, callback)` - Execute SELECT queries
- `saveObject(object, options, callback)` - Smart INSERT/UPDATE
- `runStatement(statement, options, callback)` - Execute any SQL

## Usage in vector-tools2

```javascript
const { initDatabaseInstance } = require('./lib/database/sqlite-instance/sqlite-instance')({});

initDatabaseInstance(dbPath, (err, { getTable }) => {
    getTable('myTable', (err, table) => {
        // Use table.getData(), table.saveObject(), etc.
    });
});
```

## Critical Features for Vector Operations

1. **sqlite-vec Extension Loading** (lines 473-485)
   - Automatically loads vector extension
   - Gracefully handles if not available
   - Tests vector support on init

2. **Auto-Schema Evolution** (lines 268-306)
   - Reads existing table schema
   - Detects new fields in objects
   - ALTERs table to add missing columns

3. **Template SQL Safety** (lines 65-75, 114-125)
   - Enforces `<!tableName!>` substitution
   - Prevents SQL injection
   - Consistent error handling

## Why We Use This

1. **Proven in Production** - Battle-tested in server environment
2. **Prevents Crashes** - No sqlite3 CLI usage
3. **Rich Abstractions** - Handles complex DB operations elegantly
4. **Vector Ready** - sqlite-vec support built in

## Maintenance Notes

- Keep in sync with server version for major bug fixes
- Document any future modifications here
- Test thoroughly when updating from server

## Version History

- 2.0.0 - Initial copy for vector-tools2 (no modifications)