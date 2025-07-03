# Wisdom-Bus Implementation Plan

## Executive Summary

The wisdom-bus is a new data management module for the qtools-ai-framework that solves the confusion around data flow between thinkers and enables safe parallel processing. This document contains the complete analysis and implementation plan for creating both the wisdom-bus module and the async-iterate-over-collection facilitator.

## Problem Statement

### Current Issues

1. **Confusing Data Flow**: Thinkers receive `args.latestWisdom` but return `args.wisdom`, causing constant confusion
2. **No Parallel Processing**: Current iterate-over-collection processes sequentially, limiting performance
3. **Collision Handling**: Thinkers manually handle duplicate keys with ad-hoc numbering schemes
4. **Race Conditions**: Parallel processing would create data collision issues with current architecture

### Solution Overview

- Create wisdom-bus module for explicit, collision-free data management
- Enhance iterate-over-collection to support async parallel processing
- Maintain backwards compatibility with existing thinkers during migration

## Wisdom-Bus Design

### Core Architecture

```javascript
// lib/qtools-ai-framework/lib/wisdom-bus/wisdom-bus.js

const moduleFunction = function(args = {}) {
    const { initialWisdom = {}, collisionStrategy = 'sequence' } = args;
    const { xLog } = process.global;

    // Internal state
    const wisdomState = { ...initialWisdom };
    const processRegistry = {};
    const collisionRegistry = {};
    const sequenceCounters = {};

    // Main module methods
    const createAccessor = (processId) => { /* ... */ };
    const consolidate = () => { /* ... */ };
    const getProcessRegistry = () => processRegistry;

    return {
        createAccessor,
        consolidate,
        getProcessRegistry
    };
};
```

### Namespaced Accessor Design

Each thinker instance receives a curried accessor with its processId:

```javascript
const createAccessor = (processId) => {
    // Register this process
    processRegistry[processId] = {
        startTime: Date.now(),
        additions: [],
        reads: []
    };

    // Curried add function
    const add = (key, value) => {
        const namespacedKey = `_proc_${processId}_${key}`;
        wisdomState[namespacedKey] = value;

        processRegistry[processId].additions.push({
            key,
            namespacedKey,
            timestamp: Date.now()
        });

        xLog.detail(`[${processId}] Added ${key} as ${namespacedKey}`);

        return { 
            success: true, 
            namespacedKey,
            originalKey: key
        };
    };

    // Curried get function
    const get = (key) => {
        // Check own namespace first
        const namespacedKey = `_proc_${processId}_${key}`;
        if (wisdomState[namespacedKey] !== undefined) {
            return wisdomState[namespacedKey];
        }

        // Fall back to initial/global wisdom
        return initialWisdom[key];
    };

    // Get merged view of wisdom
    const getAll = () => {
        const merged = { ...initialWisdom };

        // Add this process's contributions
        processRegistry[processId].additions.forEach(({ key, namespacedKey }) => {
            merged[key] = wisdomState[namespacedKey];
        });

        return merged;
    };

    // Check key existence
    const has = (key) => {
        const namespacedKey = `_proc_${processId}_${key}`;
        return wisdomState[namespacedKey] !== undefined || 
               initialWisdom[key] !== undefined;
    };

    return {
        add,
        get,
        getAll,
        has,
        processId
    };
};
```

### Consolidation Logic

After parallel processing, consolidate namespaced data:

```javascript
const consolidate = () => {
    const consolidated = { ...initialWisdom };
    const collisions = {};

    // Group all additions by clean key
    const keyGroups = {};

    Object.entries(wisdomState).forEach(([namespacedKey, value]) => {
        const match = namespacedKey.match(/^_proc_(.+?)_(.+)$/);
        if (!match) return; // Skip non-namespaced keys

        const [, processId, cleanKey] = match;

        if (!keyGroups[cleanKey]) {
            keyGroups[cleanKey] = [];
        }

        keyGroups[cleanKey].push({
            processId,
            value,
            namespacedKey
        });
    });

    // Apply collision strategy
    Object.entries(keyGroups).forEach(([cleanKey, entries]) => {
        if (entries.length === 1) {
            // No collision
            consolidated[cleanKey] = entries[0].value;
        } else {
            // Handle collision based on strategy
            collisions[cleanKey] = entries;

            switch (collisionStrategy) {
                case 'sequence':
                    // Add numbered suffixes
                    entries.forEach((entry, index) => {
                        const key = index === 0 ? cleanKey : `${cleanKey}_${index + 1}`;
                        consolidated[key] = entry.value;
                    });
                    break;

                case 'array':
                    // Combine into array
                    consolidated[cleanKey] = entries.map(e => e.value);
                    break;

                case 'overwrite':
                    // Last write wins
                    consolidated[cleanKey] = entries[entries.length - 1].value;
                    break;

                case 'error':
                    throw new Error(`Key collision detected for '${cleanKey}'`);

                default:
                    throw new Error(`Unknown collision strategy: ${collisionStrategy}`);
            }
        }
    });

    return {
        wisdom: consolidated,
        collisions,
        processCount: Object.keys(processRegistry).length
    };
};
```

## Async-Iterate-Over-Collection Design

### Configuration

Using existing configuration pattern:

```ini
thoughtProcessConversationList.0.facilitatorName=iterate-over-collection
thoughtProcessConversationList.0.iterableSourceThinkerName=get-all-elements
thoughtProcessConversationList.0.resultValueWisdomPropertyName=currentElement
thoughtProcessConversationList.0.conversationThinkerListName=unityGenerator
thoughtProcessConversationList.0.continueOnError=true
thoughtProcessConversationList.0.asyncMode=true
thoughtProcessConversationList.0.maxConcurrentRequests=3
thoughtProcessConversationList.0.requestsPerSecond=2
```

### Implementation Strategy

The facilitator will have unified sync/async logic:

```javascript
const moduleFunction = function ({ jinaCore, conversationName, thinkerParameters, thoughtProcessName }) {
    const { xLog, getConfig } = process.global;

    const facilitator = ({ latestWisdom, args }) => {
        return new Promise(async (resolve, reject) => {
            try {
                // Get configuration
                const thoughtProcessConfig = getConfig(thoughtProcessName);
                const iterationConfig = thoughtProcessConfig.thoughtProcessConversationList[0];

                const {
                    iterableSourceThinkerName,
                    resultValueWisdomPropertyName,
                    conversationThinkerListName,
                    continueOnError = true,
                    asyncMode = false,
                    maxConcurrentRequests = 1,
                    requestsPerSecond = null
                } = iterationConfig;

                // Get collection (same for both modes)
                const collection = await getCollection(/* ... */);

                // Initialize wisdom-bus
                const wisdomBus = require('../wisdom-bus/wisdom-bus')({
                    initialWisdom: latestWisdom,
                    collisionStrategy: 'sequence'
                });

                // Process based on mode
                if (!asyncMode || maxConcurrentRequests === 1) {
                    await processSequentially(collection, wisdomBus, /* ... */);
                } else {
                    await processAsynchronously(collection, wisdomBus, {
                        maxConcurrentRequests,
                        requestsPerSecond
                    });
                }

                // Consolidate results
                const { wisdom: finalWisdom, collisions } = wisdomBus.consolidate();

                // Ensure backwards compatibility for coherence-generator
                if (!finalWisdom.processedElements && finalWisdom.processedItems) {
                    finalWisdom.processedElements = finalWisdom.processedItems;
                }

                resolve({
                    latestWisdom: finalWisdom,
                    args
                });

            } catch (error) {
                xLog.error(`${moduleName} fatal error: ${error.message}`);
                reject(error);
            }
        });
    };

    return { facilitator };
};
```

### Throttling Implementation

```javascript
class ThrottledProcessor {
    constructor(maxConcurrent, requestsPerSecond) {
        this.maxConcurrent = maxConcurrent;
        this.requestsPerSecond = requestsPerSecond;
        this.activeCount = 0;
        this.queue = [];
        this.lastRequestTime = 0;
    }

    async acquire() {
        // Rate limiting
        if (this.requestsPerSecond) {
            const now = Date.now();
            const timeSinceLastRequest = now - this.lastRequestTime;
            const minInterval = 1000 / this.requestsPerSecond;

            if (timeSinceLastRequest < minInterval) {
                await sleep(minInterval - timeSinceLastRequest);
            }

            this.lastRequestTime = Date.now();
        }

        // Concurrency limiting
        while (this.activeCount >= this.maxConcurrent) {
            await new Promise(resolve => this.queue.push(resolve));
        }

        this.activeCount++;
    }

    release() {
        this.activeCount--;

        if (this.queue.length > 0) {
            const resolve = this.queue.shift();
            resolve();
        }
    }

    async process(fn) {
        await this.acquire();

        try {
            return await fn();
        } finally {
            this.release();
        }
    }
}
```

### Async Processing Logic

```javascript
const processAsynchronously = async (collection, wisdomBus, throttleConfig) => {
    const throttler = new ThrottledProcessor(
        throttleConfig.maxConcurrentRequests,
        throttleConfig.requestsPerSecond
    );

    xLog.progress(`Processing ${collection.length} items asynchronously with max ${throttleConfig.maxConcurrentRequests} concurrent`);

    // Pre-assign process IDs to maintain order
    const itemsWithIds = collection.map((item, index) => ({
        item,
        index,
        processId: `${thoughtProcessName}_${Date.now()}_${index}`
    }));

    // Process all items with throttling
    const results = await Promise.allSettled(
        itemsWithIds.map(({ item, index, processId }) => 
            throttler.process(async () => {
                const accessor = wisdomBus.createAccessor(processId);

                xLog.detail(`[${processId}] Starting processing of ${item}`);

                try {
                    // Create conversation for this item
                    const itemConversation = jinaCore.conversationGenerator({
                        conversationName: conversationThinkerListName,
                        thinkerParameters,
                        thoughtProcessName,
                    });

                    // Create item wisdom with accessor
                    const itemWisdom = {
                        ...latestWisdom,
                        [resultValueWisdomPropertyName]: item,
                        _iterationContext: {
                            index,
                            total: collection.length,
                            processId
                        }
                    };

                    // Remove previous iteration results
                    delete itemWisdom.generatedSynthData;
                    delete itemWisdom.isValid;
                    delete itemWisdom.processedElements;

                    // Run conversation with wisdom-bus accessor
                    const itemResponse = await itemConversation.getResponse({
                        args: { ...args },
                        latestWisdom: itemWisdom,
                        wisdomBus: accessor
                    });

                    // Extract result
                    const generatedContent = itemResponse.latestWisdom.generatedSynthData ||
                                           itemResponse.latestWisdom.generatedContent ||
                                           itemResponse.latestWisdom.result;

                    if (generatedContent) {
                        // Add to wisdom-bus (handles collisions automatically)
                        accessor.add(item, generatedContent);
                    }

                    xLog.detail(`[${processId}] Completed processing of ${item}`);

                    return { 
                        success: true, 
                        item, 
                        processId 
                    };

                } catch (error) {
                    xLog.error(`[${processId}] Error processing ${item}: ${error.message}`);

                    if (!continueOnError) {
                        throw error;
                    }

                    return { 
                        success: false, 
                        item, 
                        processId, 
                        error: error.message 
                    };
                }
            })
        )
    );

    // Log results summary
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const errorCount = results.length - successCount;

    xLog.progress(`Async processing complete: ${successCount} successful, ${errorCount} errors`);

    return results;
};
```

## Migration Plan

### Phase 1: Implement Wisdom-Bus

1. Create wisdom-bus module in framework
2. Add comprehensive tests
3. Document API and usage patterns

### Phase 2: Update Facilitators

1. Modify conversation-generator to support wisdom-bus
2. Update iterate-over-collection with async capability
3. Ensure backwards compatibility

### Phase 3: Gradual Thinker Migration

1. Update framework to inject wisdom-bus into thinkers
2. Support both old (latestWisdom) and new (wisdomBus) patterns
3. Migrate thinkers incrementally

### Phase 4: Application Integration

1. Update JEDX configuration for testing
2. Performance testing with various throttle settings
3. Monitor AI service rate limits

## Key Implementation Details

### Backwards Compatibility

1. **Thinkers**: Support both patterns during migration
   
   ```javascript
   const executeRequest = (args, callback) => {
       const { wisdomBus, latestWisdom } = args;
   
       if (wisdomBus) {
           // New pattern
           const data = wisdomBus.get('someData');
           wisdomBus.add('result', processedData);
       } else {
           // Old pattern
           const data = latestWisdom.someData;
           const wisdom = { ...latestWisdom, result: processedData };
           return callback(null, { wisdom });
       }
   
       callback(null, { success: true });
   };
   ```

2. **Output Format**: Ensure processedElements structure remains consistent
   
   ```javascript
   // In consolidate()
   const { wisdom: consolidated } = wisdomBus.consolidate();
   
   // Ensure expected format for coherence-generator
   if (consolidated.processedItems) {
       consolidated.processedElements = consolidated.processedItems;
   }
   ```

### Testing Strategy

1. **Unit Tests**: Test wisdom-bus collision handling
2. **Integration Tests**: Test with existing JEDX workflow
3. **Performance Tests**: Compare sync vs async processing times
4. **Stress Tests**: Verify throttling respects rate limits

### Configuration Examples

```ini
# Synchronous (current behavior)
thoughtProcessConversationList.0.asyncMode=false

# Async with moderate throttling
thoughtProcessConversationList.0.asyncMode=true
thoughtProcessConversationList.0.maxConcurrentRequests=3
thoughtProcessConversationList.0.requestsPerSecond=2

# Async with aggressive parallelism
thoughtProcessConversationList.0.asyncMode=true
thoughtProcessConversationList.0.maxConcurrentRequests=10
thoughtProcessConversationList.0.requestsPerSecond=5
```

## Summary

The wisdom-bus provides a clean solution to data flow confusion while enabling safe parallel processing. By using namespaced accessors and explicit consolidation, we can support both synchronous and asynchronous execution without modifying existing thinkers. The implementation maintains backwards compatibility while providing a clear migration path to the improved architecture.