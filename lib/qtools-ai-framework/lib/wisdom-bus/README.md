# Wisdom Bus

A thread-safe data management module for the qtools-ai-framework that provides clear, collision-free data flow between thinkers in both synchronous and asynchronous execution contexts.

## Overview

The wisdom-bus eliminates confusion about data flow in AI conversations by providing explicit read/write operations with automatic collision handling. Each thinker receives a namespaced accessor that prevents data collisions in parallel processing scenarios.

## Core Concepts

### 1. **Namespaced Accessors**

Each thinker instance receives its own accessor with a unique processId. This ensures thread-safe operations even when multiple thinkers run in parallel.

### 2. **Explicit Data Operations**

No more confusion about `args.latestWisdom` vs `args.wisdom`. The wisdom-bus provides clear `get()` and `add()` methods.

### 3. **Automatic Collision Handling**

When multiple thinkers add data with the same key, the wisdom-bus automatically handles collisions based on configurable strategies.

## Module Signature

```javascript
const wisdomBus = require('wisdom-bus')({
    initialWisdom: {},      // Optional: Starting wisdom state
    collisionStrategy: 'sequence' // Optional: How to handle key collisions
});
```

## API Reference

### Main Module Methods

#### `createAccessor(processId)`

Creates a namespaced accessor for a specific thinker instance.

```javascript
const accessor = wisdomBus.createAccessor('my-thinker-2024-01-15-001');
```

#### `consolidate()`

Merges all namespaced data into a clean wisdom object, handling collisions according to the configured strategy.

```javascript
const { wisdom: finalWisdom, collisions } = wisdomBus.consolidate();
```

#### `getProcessRegistry()`

Returns debugging information about all process accessors and their operations.

```javascript
const registry = wisdomBus.getProcessRegistry();
// Returns: { processId: { startTime, additions: [...] }, ... }
```

### Accessor Methods

Each accessor provides these methods:

#### `add(key, value)`

Adds data to wisdom with automatic namespacing.

```javascript
const result = accessor.add('generatedSynthData', myGeneratedContent);
// Returns: { success: true, namespacedKey: '_proc_xyz_generatedSynthData' }
```

#### `get(key)`

Retrieves data, checking the thinker's namespace first, then global wisdom.

```javascript
const currentElement = accessor.get('currentElement');
const previousResult = accessor.get('validationResult');
```

#### `getAll()`

Returns a merged view of initial wisdom plus the thinker's additions.

```javascript
const currentWisdomState = accessor.getAll();
```

#### `has(key)`

Checks if a key exists in either namespace or global wisdom.

```javascript
if (accessor.has('requiredData')) {
    // Process with required data
}
```

## Writing a Thinker with Wisdom-Bus

### Basic Thinker Template

```javascript
const moduleFunction = function (args = {}) {
    const { xLog } = process.global;
    const { thinkerParameters = {} } = args;
    const moduleName = 'my-thinker';

    const executeRequest = (args, callback) => {
        const { wisdomBus } = args;  // Receive accessor instead of latestWisdom

        try {
            // READ: Get data from previous thinkers
            const currentElement = wisdomBus.get('currentElement');
            const configData = wisdomBus.get('configurationData');

            // PROCESS: Do your thinker's work
            const generatedContent = processElement(currentElement, configData);

            // WRITE: Add results to wisdom
            wisdomBus.add('generatedSynthData', generatedContent);
            wisdomBus.add('processMetadata', {
                processedAt: new Date().toISOString(),
                elementName: currentElement
            });

            // SUCCESS: Return without wisdom manipulation
            callback(null, { 
                success: true,
                message: `Processed ${currentElement}`
            });

        } catch (error) {
            callback(error);
        }
    };

    return { executeRequest };
};

module.exports = moduleFunction;
```

### Rules of Operation

1. **Never Access Wisdom Directly**
   
   ```javascript
   // ❌ WRONG
   const data = args.latestWisdom.someData;
   args.wisdom = { ...args.latestWisdom, newData: value };
   
   // ✅ CORRECT
   const data = wisdomBus.get('someData');
   wisdomBus.add('newData', value);
   ```

2. **Always Use Provided Accessor**
   
   ```javascript
   // ❌ WRONG - Creating your own wisdom object
   const myWisdom = {};
   myWisdom.result = processedData;
   
   // ✅ CORRECT - Using the accessor
   wisdomBus.add('result', processedData);
   ```

3. **Check for Required Data**
   
   ```javascript
   // ✅ GOOD PRACTICE
   if (!wisdomBus.has('requiredInput')) {
       return callback(new Error('Missing required input data'));
   }
   ```

4. **Return Success/Failure Only**
   
   ```javascript
   // ❌ WRONG - Returning wisdom
   callback(null, { wisdom: modifiedWisdom });
   
   // ✅ CORRECT - Return status only
   callback(null, { success: true });
   ```

5. **Use Meaningful Keys**
   
   ```javascript
   // ❌ POOR - Generic keys lead to collisions
   wisdomBus.add('data', result);
   wisdomBus.add('output', processed);
   
   // ✅ GOOD - Specific keys
   wisdomBus.add('validationResult', result);
   wisdomBus.add('generatedJobPaths', processed);
   ```

## Collision Strategies

When multiple thinkers add data with the same key:

### `sequence` (default)

Appends a number to subsequent additions:

```javascript
// First thinker adds:
wisdomBus.add('worker_paths', data1);  // → worker_paths

// Second thinker adds:
wisdomBus.add('worker_paths', data2);  // → worker_paths_2
```

### `array`

Collects all values into an array:

```javascript
// After consolidation:
{ worker_paths: [data1, data2, data3] }
```

### `overwrite`

Last write wins (use with caution):

```javascript
// Only the final value is kept
{ worker_paths: dataFinal }
```

### `error`

Throws an error on collision (strict mode):

```javascript
// Second add throws:
Error: Key collision detected for 'worker_paths'
```

## Integration Examples

### Synchronous Conversation

```javascript
// In conversation-generator
const wisdomBus = require('./wisdom-bus')({ 
    initialWisdom: startingWisdom 
});

for (const thinkerName of thinkerList) {
    const accessor = wisdomBus.createAccessor(`${thinkerName}_${Date.now()}`);
    const thinker = loadThinker(thinkerName);

    await thinker.executeRequest({ wisdomBus: accessor });
}

const { wisdom: finalWisdom } = wisdomBus.consolidate();
```

### Asynchronous Iterator

```javascript
// In async-iterate-over-collection
const wisdomBus = require('./wisdom-bus')({ 
    initialWisdom: latestWisdom,
    collisionStrategy: 'sequence'
});

// Parallel processing
const results = await Promise.allSettled(
    collection.map((item, index) => {
        const processId = `${thoughtProcess}_${Date.now()}_${index}`;
        const accessor = wisdomBus.createAccessor(processId);

        return processThinker({ 
            wisdomBus: accessor,
            currentElement: item 
        });
    })
);

// Consolidate all results
const { wisdom: consolidatedWisdom, collisions } = wisdomBus.consolidate();

// Handle any collisions
if (Object.keys(collisions).length > 0) {
    xLog.verbose(`Handled ${Object.keys(collisions).length} key collisions`);
}
```

## Debugging

### Process Registry

```javascript
const registry = wisdomBus.getProcessRegistry();
console.log('Active processes:', Object.keys(registry));
console.log('Total additions:', 
    Object.values(registry)
        .reduce((sum, proc) => sum + proc.additions.length, 0)
);
```

### Collision Report

```javascript
const { collisions } = wisdomBus.consolidate();
Object.entries(collisions).forEach(([key, instances]) => {
    if (instances.length > 1) {
        console.log(`Key "${key}" had ${instances.length} collisions`);
    }
});
```

## Best Practices

1. **Use Descriptive Process IDs**
   
   ```javascript
   const processId = `${thinkerName}_${timestamp}_${elementIndex}`;
   ```

2. **Log Important Operations**
   
   ```javascript
   const result = wisdomBus.add('criticalData', value);
   xLog.detail(`Added criticalData as ${result.namespacedKey}`);
   ```

3. **Handle Missing Data Gracefully**
   
   ```javascript
   const data = wisdomBus.get('optionalData') || defaultValue;
   ```

4. **Document Expected Inputs/Outputs**
   
   ```javascript
   /**
    * Expects: currentElement, validationRules
    * Produces: validationResult, errorMessages
    */
   ```

## Migration Guide

Converting existing thinkers to use wisdom-bus:

### Before

```javascript
const executeRequest = (args, callback) => {
    const { latestWisdom } = args;

    const input = latestWisdom.someInput;
    const processed = doWork(input);

    const wisdom = {
        ...latestWisdom,
        processedData: processed
    };

    callback(null, { wisdom });
};
```

### After

```javascript
const executeRequest = (args, callback) => {
    const { wisdomBus } = args;

    const input = wisdomBus.get('someInput');
    const processed = doWork(input);

    wisdomBus.add('processedData', processed);

    callback(null, { success: true });
};
```

## Summary

The wisdom-bus provides a clean, collision-free data management layer for AI conversations. By using explicit read/write operations and automatic namespacing, it eliminates data race conditions and makes thinker development more straightforward and reliable.