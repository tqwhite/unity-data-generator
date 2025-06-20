# Prompt Library Selection Implementation Plan

## Problem Statement

Currently, prompt libraries auto-merge using `Object.assign()`, causing conflicts when multiple libraries have the same prompt keys (e.g., 'xml-maker'). Need explicit selection mechanism to choose which prompt library to use.

## Solution: Explicit Library Selection

### 1. Command Line Interface

Add `--promptLibrary` parameter to specify which library to use:

```bash
# Use TQ's prompts (default)
unityDataGenerator --elements=Student --promptLibrary=tq-prompts

# Use John's prompts  
unityDataGenerator --elements=Student --promptLibrary=john-prompts

# Use JEDX-specific prompts
unityDataGenerator --elements=Student --promptLibrary=jedx-prompts
```

### 2. Implementation Changes

#### A. Modify `prompt-library.js`

**Current (auto-merge):**

```javascript
Object.keys(promptObjects)
    .filter((name) => name.match(/prompts/))
    .forEach((name) => {
        promptLibrary = Object.assign(promptLibrary, promptObjects[name]());
    });
```

**New (explicit selection):**

```javascript
const moduleFunction = ({ promptLibraryName } = {}) => (args = {}) => {
    const { commandLineParameters } = process.global;

    // Get library selection from command line or config
    const selectedLibrary = commandLineParameters.qtGetSurePath('values.promptLibrary[0]') 
        || promptLibraryName 
        || 'tq-prompts'; // default fallback

    // Load only the selected library
    if (!promptObjects[selectedLibrary]) {
        throw new Error(`Prompt library '${selectedLibrary}' not found. Available: ${Object.keys(promptObjects).join(', ')}`);
    }

    return promptObjects[selectedLibrary]();
};
```

#### B. Update Configuration Integration

Modify config to support default library selection:

```ini
[unityDataGenerator]
defaultPromptLibrary=tq-prompts
```

#### C. Add Library Discovery/Validation

```javascript
// Helper function to list available libraries
const getAvailableLibraries = () => {
    return Object.keys(promptObjects)
        .filter((name) => name.match(/prompts/));
};

// Add validation and helpful error messages
if (!promptObjects[selectedLibrary]) {
    const available = getAvailableLibraries();
    xLog.error(`Prompt library '${selectedLibrary}' not found.`);
    xLog.error(`Available libraries: ${available.join(', ')}`);
    throw new Error(`Invalid prompt library: ${selectedLibrary}`);
}
```

### 3. Benefits

#### Multiple Data Sources

```bash
# Generate SIF data with standard prompts
unityDataGenerator --elements=StudentPersonal --promptLibrary=tq-prompts

# Generate JEDX data with specialized prompts
unityDataGenerator --elements=StudentRecord --promptLibrary=jedx-prompts

# Test experimental approaches
unityDataGenerator --elements=StudentPersonal --promptLibrary=experimental-prompts
```

#### A/B Testing Prompts

```bash
# Compare different prompt strategies on same data
unityDataGenerator --elements=Student --promptLibrary=tq-prompts --outFile=tq-results.xml
unityDataGenerator --elements=Student --promptLibrary=john-prompts --outFile=john-results.xml
```

#### Clean Separation

- No prompt conflicts between libraries
- Clear which prompts are being used
- Easy to add new libraries without affecting existing ones

### 4. Implementation Notes

#### File Changes Required:

1. `prompt-library.js` - Replace auto-merge with explicit selection
2. Test with existing `tq-prompts` and `john-prompts` 
3. Add error handling for invalid library names
4. Update help text to document `--promptLibrary` parameter

#### Backward Compatibility:

- Default to `tq-prompts` if no library specified
- Existing commands continue to work unchanged
- Only new functionality requires explicit library selection

#### Testing Strategy:

1. Verify `tq-prompts` works as default
2. Test switching between `tq-prompts` and `john-prompts`
3. Verify error handling for non-existent libraries
4. Test command line parameter precedence

### 5. Future Extensions

#### Library-Specific Configuration:

```ini
[prompt-libraries]
jedx-prompts.defaultStringVariation=rev3
john-prompts.defaultStringVariation=experimental
```

#### Runtime Library Switching:

Could eventually support switching libraries within a single conversation for different thinkers.

## Files to Modify

- `prompt-library.js` - Core selection logic
- Help text/documentation - Document new parameter
- Config files - Add default library settings
- Test with existing john-prompts setup

## Expected Outcome

Clean, explicit prompt library selection that eliminates conflicts while maintaining the flexibility of multiple prompt strategies for different use cases.