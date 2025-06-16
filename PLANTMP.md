# VectorTools Refactoring Plan

## Current Issues:
- **420+ lines** in a single file
- **Multiple responsibilities**: CLI parsing, database operations, rebuild workflow, drop operations, stats
- **Mixed concerns**: UI (readline), business logic, data access
- **Repeated code**: Helper functions scattered throughout
- **Hard to test**: Monolithic structure

## Proposed Module Structure:

### 1. **Main Entry Point** 
**File**: `vectorTools.js` (keep as thin coordinator)
- Command line parameter handling using process.global
- Route to appropriate operation modules
- ~50 lines max

### 2. **Database Operations Module**
**File**: `lib/vector-database-operations.js`
- `initVectorDatabase()` - move from init-vector-database.js
- `getTableCount()`, `tableExists()` helper functions
- Database connection and basic queries
- Following TQ's database abstraction patterns

### 3. **Drop Operations Module** 
**File**: `lib/vector-drop-operations.js` (enhance existing drop-all-vector-tables.js)
- All table dropping logic
- Pattern matching for vector table families
- Safety checks and verification

### 4. **Rebuild Workflow Module**
**File**: `lib/vector-rebuild-workflow.js`
- Complete rebuild pipeline using qtools-asynchronous-pipe-plus
- Task definitions for backup, generate, verify, deploy
- User interaction handling
- ~150 lines focused on workflow orchestration

### 5. **Configuration Handler Module**
**File**: `lib/vector-config-handler.js`
- Profile validation and extraction
- Data profile settings processing
- Configuration error handling

### 6. **User Interaction Module**
**File**: `lib/vector-user-interface.js`
- `askUser()` function and readline management
- Status logging and progress reporting
- Error message formatting

## Benefits:
- **Single Responsibility**: Each module has one clear purpose
- **Testable**: Individual modules can be unit tested
- **Reusable**: Database operations can be used by other tools
- **Maintainable**: Changes to rebuild logic don't affect drop operations
- **TQ Pattern Compliance**: Follows existing lib/ structure in vector-tools

## Migration Strategy:
1. Create new modules with existing code extracted
2. Update vectorTools.js to use new modules
3. Test each operation (drop, rebuild, stats) 
4. Remove old code once verified working

## Implementation Notes:
- All modules should use qtools-asynchronous-pipe-plus for async operations
- Follow TQ's pattern of using process.global for xLog, getConfig, commandLineParameters
- Maintain callback-style APIs throughout
- Each module should export a moduleFunction following TQ's standard pattern
- Database operations should use the existing sqlite abstraction patterns