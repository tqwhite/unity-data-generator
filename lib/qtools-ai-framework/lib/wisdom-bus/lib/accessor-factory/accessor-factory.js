const moduleFunction = function(args = {}) {
    const { 
        stateManager, 
        registryManager, 
        initialWisdom = {},
        getExecutionMode = () => 'serial' // Default to serial for backward compatibility
    } = args;
    
    const { xLog } = process.global;
    
    // Basic key validation - only check for fundamental issues
    const validateUserKey = (key, operationType) => {
        if (typeof key !== 'string') {
            throw new Error(`${operationType}: Key must be a string, received ${typeof key}`);
        }
        
        if (key.trim() === '') {
            throw new Error(`${operationType}: Key cannot be empty or only whitespace`);
        }
        
        // Let the framework use whatever keys it needs - the consolidation-engine
        // parsing should handle this robustly
    };

    // Create a namespaced accessor for a specific process
    const create = (processId) => {
        // Register the process
        registryManager.registerProcess(processId);
        
        // Accessor-specific initial data (for iteration mode)
        let accessorInitialData = null;
        
        // Save wisdom operation (formerly add)
        const saveWisdom = (key, value) => {
            try {
                // Validate user key before processing
                validateUserKey(key, 'saveWisdom');
                
                const namespacedKey = `_proc_${processId}_${key}`;
                stateManager.set(namespacedKey, value);
                
                // Record in registry
                registryManager.recordAddition(processId, key, namespacedKey);
                
                // Log the operation
                xLog.verbose(`[wisdom-bus][${processId}] ADD: ${key} → ${namespacedKey}`);
                
                return {
                    success: true,
                    namespacedKey,
                    originalKey: key
                };
            } catch (error) {
                xLog.error(`[wisdom-bus][${processId}] Error adding key '${key}' for process ${processId}: ${error.message}`);
                registryManager.recordError(processId, error, 'add');
                
                return {
                    success: false,
                    error: error.message,
                    key
                };
            }
        };
        
        // Get latest wisdom operation (formerly get)
        const getLatestWisdom = (key) => {
            // Key is required
            if (key === undefined) {
                throw new Error('getLatestWisdom() requires a key parameter');
            }
            
            const mode = getExecutionMode();
            
            // In iteration mode, check accessor-specific initial data FIRST
            // This is the itemWisdom passed by iterate-over-collection
            if (mode === 'iteration' && accessorInitialData !== null && accessorInitialData[key] !== undefined) {
                registryManager.recordRead(processId, key, accessorInitialData[key], 'accessor-initial');
                xLog.verbose(`[wisdom-bus][${processId}] GET: ${key} from accessor-initial ✓`);
                return accessorInitialData[key];
            }
            
            // Single key lookup
            const namespacedKey = `_proc_${processId}_${key}`;
            
            // Check own namespace
            const namespacedValue = stateManager.get(namespacedKey);
            if (namespacedValue !== undefined) {
                registryManager.recordRead(processId, key, namespacedValue, 'namespace');
                xLog.verbose(`[wisdom-bus][${processId}] GET: ${key} from namespace ✓`);
                return namespacedValue;
            }
            
            // In serial mode, check other processes' namespaces
            // This allows thinkers to see data from previous thinkers in the conversation
            if (mode === 'serial') {
                const allState = stateManager.getAll();
                for (const [stateKey, value] of Object.entries(allState)) {
                    // Check if this is a namespaced key for our target key
                    if (stateKey.startsWith('_proc_') && stateKey.endsWith(`_${key}`)) {
                        // Found a value from another process
                        registryManager.recordRead(processId, key, value, 'cross-process');
                        xLog.verbose(`[wisdom-bus][${processId}] GET: ${key} from cross-process ✓`);
                        return value;
                    }
                }
            }
            
            // Fall back to initial wisdom
            const initialValue = initialWisdom[key];
            if (initialValue !== undefined) {
                registryManager.recordRead(processId, key, initialValue, 'initial');
                xLog.verbose(`[wisdom-bus][${processId}] GET: ${key} from initial ✓`);
                return initialValue;
            }
            
            // Not found
            registryManager.recordRead(processId, key, undefined, 'not-found');
            xLog.verbose(`[wisdom-bus][${processId}] GET: ${key} from not-found ✗`);
            return undefined;
        };
        
        // Has operation
        const has = (key) => {
            const namespacedKey = `_proc_${processId}_${key}`;
            
            // Check namespace first
            if (stateManager.exists(namespacedKey)) {
                return true;
            }
            
            // In iteration mode, check accessor-specific initial data
            const mode = getExecutionMode();
            if (mode === 'iteration' && accessorInitialData !== null) {
                if (Object.prototype.hasOwnProperty.call(accessorInitialData, key)) {
                    return true;
                }
            }
            
            // Check initial wisdom
            return Object.prototype.hasOwnProperty.call(initialWisdom, key);
        };
        
        // Save metadata - unscoped, shared across all processes
        const saveMetadata = (key, value) => {
            try {
                // Validate user key before processing
                validateUserKey(key, 'saveMetadata');
                
                const metadataKey = `_metadata_${key}`;
                stateManager.set(metadataKey, value);
                
                // Log the operation
                xLog.verbose(`[wisdom-bus][${processId}] ADD: ${key} → ${metadataKey}`);
                
                return {
                    success: true,
                    metadataKey,
                    originalKey: key
                };
            } catch (error) {
                xLog.error(`[wisdom-bus][${processId}] Error saving metadata '${key}' for process ${processId}: ${error.message}`);
                
                return {
                    success: false,
                    error: error.message,
                    key
                };
            }
        };
        
        // Get metadata - unscoped, shared across all processes
        const getMetadata = (key) => {
            const metadataKey = `_metadata_${key}`;
            const value = stateManager.get(metadataKey);
            
            const foundStr = value !== undefined ? '✓' : '✗';
            xLog.verbose(`[wisdom-bus][${processId}] GET: ${key} from metadata ${foundStr}`);
            return value;
        };
        
        // Save utility scoped data - scoped to processId but separate from main wisdom
        const saveUtilityScopedData = (key, value) => {
            try {
                // Validate user key before processing
                validateUserKey(key, 'saveUtilityScopedData');
                
                const utilityKey = `_utility_${processId}_${key}`;
                stateManager.set(utilityKey, value);
                
                // Log the operation
                xLog.verbose(`[wisdom-bus][${processId}] ADD: ${key} → ${utilityKey}`);
                
                return {
                    success: true,
                    utilityKey,
                    originalKey: key
                };
            } catch (error) {
                xLog.error(`[wisdom-bus][${processId}] Error saving utility data '${key}' for process ${processId}: ${error.message}`);
                
                return {
                    success: false,
                    error: error.message,
                    key
                };
            }
        };
        
        // Get utility scoped data - scoped to processId but separate from main wisdom
        const getUtilityScopedData = (key) => {
            const utilityKey = `_utility_${processId}_${key}`;
            const value = stateManager.get(utilityKey);
            
            const foundStr = value !== undefined ? '✓' : '✗';
            xLog.verbose(`[wisdom-bus][${processId}] GET: ${key} from utility ${foundStr}`);
            return value;
        };
        
        
        // Set accessor-specific initial data (for iteration mode)
        const setInitialData = (data) => {
            accessorInitialData = data;
            xLog.verbose(`[wisdom-bus][${processId}] Set accessor-specific initial data with ${Object.keys(data || {}).length} keys`);
        };
        
        // Get all data for this accessor (initial wisdom + this process's additions)
        const getAll = () => {
            const result = { ...initialWisdom };
            
            // Add accessor-specific initial data if in iteration mode
            if (accessorInitialData !== null) {
                Object.assign(result, accessorInitialData);
            }
            
            // Add this process's namespaced data
            const allState = stateManager.getAll();
            const processPrefix = `_proc_${processId}_`;
            
            Object.entries(allState).forEach(([namespacedKey, value]) => {
                if (namespacedKey.startsWith(processPrefix)) {
                    const cleanKey = namespacedKey.substring(processPrefix.length);
                    result[cleanKey] = value;
                }
            });
            
            return result;
        };
        
        // Return the accessor interface
        return {
            saveWisdom,
            getLatestWisdom,
            has,
            saveMetadata,
            getMetadata,
            saveUtilityScopedData,
            getUtilityScopedData,
            setInitialData,
            processId,
            // Backward compatibility aliases
            add: saveWisdom,
            get: getLatestWisdom,
            getAll
        };
    };
    
    return {
        create
    };
};

module.exports = moduleFunction;