const moduleFunction = function(args = {}) {
    const { 
        stateManager, 
        registryManager, 
        logger, 
        initialWisdom = {},
        getExecutionMode = () => 'serial' // Default to serial for backward compatibility
    } = args;
    
    // Create a namespaced accessor for a specific process
    const create = (processId) => {
        // Register the process
        registryManager.registerProcess(processId);
        
        // Accessor-specific initial data (for iteration mode)
        let accessorInitialData = null;
        
        // Save wisdom operation (formerly add)
        const saveWisdom = (key, value) => {
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
        
        // Get latest wisdom operation (formerly get)
        const getLatestWisdom = (key) => {
            // Key is required
            if (key === undefined) {
                throw new Error('getLatestWisdom() requires a key parameter');
            }
            
            // Single key lookup
            const namespacedKey = `_proc_${processId}_${key}`;
            
            // Check own namespace first
            const namespacedValue = stateManager.get(namespacedKey);
            if (namespacedValue !== undefined) {
                registryManager.recordRead(processId, key, namespacedValue, 'namespace');
                logger.logRead(processId, key, 'namespace', true);
                return namespacedValue;
            }
            
            // In iteration mode, check accessor-specific initial data
            const mode = getExecutionMode();
            if (mode === 'iteration' && accessorInitialData !== null && accessorInitialData[key] !== undefined) {
                registryManager.recordRead(processId, key, accessorInitialData[key], 'accessor-initial');
                logger.logRead(processId, key, 'accessor-initial', true);
                return accessorInitialData[key];
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
                const metadataKey = `_metadata_${key}`;
                stateManager.set(metadataKey, value);
                
                // Log the operation
                logger.logAddition(processId, key, metadataKey, 'metadata');
                
                return {
                    success: true,
                    metadataKey,
                    originalKey: key
                };
            } catch (error) {
                logger.error(`Error saving metadata '${key}' for process ${processId}: ${error.message}`);
                
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
            
            logger.logRead(processId, key, 'metadata', value !== undefined);
            return value;
        };
        
        // Save utility scoped data - scoped to processId but separate from main wisdom
        const saveUtilityScopedData = (key, value) => {
            try {
                const utilityKey = `_utility_${processId}_${key}`;
                stateManager.set(utilityKey, value);
                
                // Log the operation
                logger.logAddition(processId, key, utilityKey, 'utility');
                
                return {
                    success: true,
                    utilityKey,
                    originalKey: key
                };
            } catch (error) {
                logger.error(`Error saving utility data '${key}' for process ${processId}: ${error.message}`);
                
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
            
            logger.logRead(processId, key, 'utility', value !== undefined);
            return value;
        };
        
        
        // Set accessor-specific initial data (for iteration mode)
        const setInitialData = (data) => {
            accessorInitialData = data;
            logger.detail(`Process ${processId} set accessor-specific initial data with ${Object.keys(data || {}).length} keys`);
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
            processId
        };
    };
    
    return {
        create
    };
};

module.exports = moduleFunction;