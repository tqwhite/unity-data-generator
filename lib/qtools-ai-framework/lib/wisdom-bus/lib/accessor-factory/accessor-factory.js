const moduleFunction = function(args = {}) {
    const { stateManager, registryManager, logger, initialWisdom = {} } = args;
    
    // Create a namespaced accessor for a specific process
    const create = (processId) => {
        // Register the process
        registryManager.registerProcess(processId);
        
        // Add operation
        const add = (key, value) => {
            try {
                const namespacedKey = `_proc_${processId}_${key}`;
                stateManager.set(namespacedKey, value);
                
                // Record in registry
                registryManager.recordAddition(processId, key, namespacedKey);
                
                // Log the operation
                logger.logAddition(processId, key, namespacedKey);
                
                return {
                    success: true,
                    namespacedKey,
                    originalKey: key
                };
            } catch (error) {
                logger.error(`Error adding key '${key}' for process ${processId}: ${error.message}`);
                registryManager.recordError(processId, error, 'add');
                
                return {
                    success: false,
                    error: error.message,
                    key
                };
            }
        };
        
        // Get operation
        const get = (key) => {
            const namespacedKey = `_proc_${processId}_${key}`;
            
            // Check own namespace first
            const namespacedValue = stateManager.get(namespacedKey);
            if (namespacedValue !== undefined) {
                registryManager.recordRead(processId, key, namespacedValue, 'namespace');
                logger.logRead(processId, key, 'namespace', true);
                return namespacedValue;
            }
            
            // Fall back to initial wisdom
            const initialValue = initialWisdom[key];
            if (initialValue !== undefined) {
                registryManager.recordRead(processId, key, initialValue, 'initial');
                logger.logRead(processId, key, 'initial', true);
                return initialValue;
            }
            
            // Not found
            registryManager.recordRead(processId, key, undefined, 'not-found');
            logger.logRead(processId, key, 'not-found', false);
            return undefined;
        };
        
        // Has operation
        const has = (key) => {
            const namespacedKey = `_proc_${processId}_${key}`;
            
            // Check namespace first
            if (stateManager.exists(namespacedKey)) {
                return true;
            }
            
            // Check initial wisdom
            return Object.prototype.hasOwnProperty.call(initialWisdom, key);
        };
        
        // Get all - merge initial wisdom with this process's additions
        const getAll = () => {
            const result = { ...initialWisdom };
            const allState = stateManager.getAll();
            
            // Extract this process's contributions
            const prefix = `_proc_${processId}_`;
            Object.entries(allState).forEach(([namespacedKey, value]) => {
                if (namespacedKey.startsWith(prefix)) {
                    const cleanKey = namespacedKey.substring(prefix.length);
                    result[cleanKey] = value;
                }
            });
            
            return result;
        };
        
        // Return the accessor interface
        return {
            add,
            get,
            has,
            getAll,
            processId
        };
    };
    
    return {
        create
    };
};

module.exports = moduleFunction;