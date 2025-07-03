const moduleFunction = function(args = {}) {
    const { stateManager, collisionHandler, logger } = args;
    
    const consolidate = (initialWisdom = {}) => {
        logger.detail('Starting consolidation process');
        
        // Start with initial wisdom
        const consolidated = { ...initialWisdom };
        const collisions = {};
        const processSet = new Set();
        
        // Get all state
        const allState = stateManager.getAll();
        
        // Group entries by clean key
        const keyGroups = {};
        
        Object.entries(allState).forEach(([namespacedKey, value]) => {
            // Parse namespaced keys: _proc_<processId>_<key>
            // Look for _proc_ prefix and find the last underscore to separate processId from key
            if (!namespacedKey.startsWith('_proc_')) {
                // Skip non-namespaced keys
                return;
            }
            
            // Remove _proc_ prefix
            const withoutPrefix = namespacedKey.substring(6); // '_proc_'.length = 6
            
            // Find the last underscore to separate processId from key
            const lastUnderscoreIndex = withoutPrefix.lastIndexOf('_');
            if (lastUnderscoreIndex === -1) {
                // Invalid format
                return;
            }
            
            const processId = withoutPrefix.substring(0, lastUnderscoreIndex);
            const cleanKey = withoutPrefix.substring(lastUnderscoreIndex + 1);
            
            processSet.add(processId);
            
            if (!keyGroups[cleanKey]) {
                keyGroups[cleanKey] = [];
            }
            
            keyGroups[cleanKey].push({
                processId,
                value,
                namespacedKey
            });
        });
        
        // Process each key group through collision handler
        let collisionCount = 0;
        
        Object.entries(keyGroups).forEach(([cleanKey, entries]) => {
            // Sort entries by processId for consistent ordering
            entries.sort((a, b) => a.processId.localeCompare(b.processId));
            
            // Handle through collision strategy
            const handledResult = collisionHandler.handle(cleanKey, entries);
            
            // Track collisions
            if (entries.length > 1) {
                collisions[cleanKey] = entries;
                collisionCount++;
                logger.logCollision(cleanKey, entries.length, collisionHandler.getInfo?.().strategy);
            }
            
            // Merge handled results into consolidated wisdom
            Object.assign(consolidated, handledResult);
        });
        
        // Calculate final counts
        const processCount = processSet.size;
        const keyCount = Object.keys(consolidated).length;
        
        // Log summary
        logger.logConsolidation(processCount, keyCount, collisionCount);
        
        return {
            wisdom: consolidated,
            collisions,
            processCount,
            keyCount,
            collisionCount
        };
    };
    
    return {
        consolidate
    };
};

module.exports = moduleFunction;