# SpreadsheetTool Test Suite

Comprehensive test suite for the spreadsheetTool CLI application, providing bidirectional Excel ↔ SQLite database conversion functionality.

## Test Results Summary

```
Test Suites: 6 passed, 6 total
Tests:       63 passed, 63 total
Snapshots:   0 total
```

## Test Coverage

### 1. Database Operations (`database/dbManager.test.js`)

- **15 tests** covering data persistence, backup operations, and database management
- Data saving and reading with timestamp generation
- Backup table creation with versioning
- Purge operations with configurable retention
- RefId generation from XPath/Path values
- Database initialization and directory creation

### 2. Excel Reading (`spreadsheet/excelReader.test.js`)

- **7 tests** covering Excel file processing and data extraction
- Multi-sheet workbook handling
- Column collection across sheets
- Sheet listing functionality
- Error handling for missing/corrupt files
- Empty sheet detection and skipping

### 3. Excel Writing (`spreadsheet/excelWriter.test.js`)

- **11 tests** covering file generation and output formatting
- JSON and Excel file creation
- Multi-sheet output based on SheetName property
- Directory creation for nested paths
- Excel sheet name sanitization (31 char limit, special chars)
- Echo functionality for console output

### 4. Configuration Management (`utils/configHelper.test.js`)

- **8 tests** covering configuration loading and framework integration
- Configuration file processing with fallbacks
- Database path resolution priority (config → embedVectorTools → default)
- qtools-ai-framework/jina integration
- Default value handling and validation

### 5. Backup System (`database/tableBackup.test.js`)

- **8 tests** covering table backup and maintenance operations
- Table backup with date-based versioning (YYMMDD_v#)
- Backup purging with configurable retention counts
- Table existence checking and safety limits
- Backup ordering (most recent first)

### 6. Integration Testing (`integration/spreadsheetTool.integration.test.js`)

- **14 tests** covering end-to-end workflows and edge cases
- Complete Excel → Database → Excel round-trip processing
- Multi-sheet workflow preservation
- Backup and purge integration during data operations
- Unicode and special character handling
- Data integrity validation across transformations
- Error handling for missing files and corrupted data

## Running Tests

### Prerequisites

Install test dependencies:

```bash
npm install
```

### Test Execution Commands

**Run all tests:**

```bash
npm test
```

**Run tests with coverage report:**

```bash
npm run test:coverage
```

**Run tests in watch mode (auto-rerun on file changes):**

```bash
npm run test:watch
```

**Run specific test file:**

```bash
npm test -- --testPathPattern=dbManager.test.js
```

**Run tests with verbose output:**

```bash
npm test -- --verbose
```

**Run tests matching a pattern:**

```bash
npm test -- --testNamePattern="should save"
```

## Test Environment

- **Framework**: Jest 29.x
- **Environment**: Node.js test environment
- **Mocking**: Comprehensive mocking of process.global, file system operations, and external dependencies
- **Cleanup**: Automatic cleanup of temporary databases and files after each test

## Test Data

Tests use realistic sample data including:

- CEDS (Common Education Data Standards) elements
- LEA (Local Education Agency) data structures
- Multi-sheet Excel workbooks
- Unicode characters and special symbols
- Various data types (String, Number, Boolean, RefCode)

## Key Testing Patterns

### Process Global Mocking

```javascript
const mockXLog = {
  status: jest.fn(),
  result: jest.fn(),
  error: jest.fn()
};

beforeAll(() => {
  process.global = {
    xLog: mockXLog,
    commandLineParameters: { switches: {} }
  };
});
```

### Temporary File Management

```javascript
beforeEach(() => {
  testDbPath = path.join(os.tmpdir(), `test-${Date.now()}.sqlite3`);
});

afterEach(() => {
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
});
```

### Integration Test Workflow

```javascript
// 1. Create Excel file
// 2. Read with excelReader
// 3. Save to database with dbManager
// 4. Read from database
// 5. Export with excelWriter
// 6. Verify round-trip integrity
```

## Configuration Testing

Tests verify the configuration resolution priority:

1. **Direct configuration** - spreadsheetTool.ini values
2. **Fallback configuration** - embedVectorTools/init-ceds-vectors config
3. **Default values** - `${applicationBasePath}/data/data.sqlite3`

## Error Handling Coverage

- Missing Excel files
- Corrupted/invalid Excel files
- Non-existent database tables
- Directory creation failures
- Unicode and special character preservation
- Null/undefined value handling

## Performance Considerations

- Tests use temporary files in OS temp directory
- Database operations use transactions for speed
- File cleanup prevents test pollution
- Mocking reduces external dependencies

## Troubleshooting

**Tests fail with "Cannot destructure property":**

- Check mock configuration order in configHelper tests

**File permission errors:**

- Ensure proper cleanup in afterEach hooks
- Check OS temp directory permissions

**Database locked errors:**

- Verify all database connections are properly closed
- Check for missing db.close() calls in test cleanup