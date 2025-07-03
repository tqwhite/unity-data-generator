const moduleFunction = function(args = {}) {
    const { processLabel = 'wisdom-bus' } = args;
    const { xLog } = process.global;
    
    // Create a dedicated logger instance for wisdom-bus
    const logger = {
        detail: (message) => {
            xLog.verbose(`[${processLabel}] ${message}`);
        },
        
        verbose: (message) => {
            xLog.verbose(`[${processLabel}] ${message}`);
        },
        
        progress: (message) => {
            xLog.progress(`[${processLabel}] ${message}`);
        },
        
        warning: (message) => {
            xLog.error(`[${processLabel}] WARNING: ${message}`);
        },
        
        error: (message) => {
            xLog.error(`[${processLabel}] ${message}`);
        },
        
        // Special formatted outputs for wisdom-bus operations
        logAddition: (processId, key, namespacedKey) => {
            xLog.verbose(`[${processLabel}][${processId}] ADD: ${key} → ${namespacedKey}`);
        },
        
        logRead: (processId, key, source, found) => {
            const foundStr = found ? '✓' : '✗';
            xLog.verbose(`[${processLabel}][${processId}] GET: ${key} from ${source} ${foundStr}`);
        },
        
        logCollision: (key, count, strategy) => {
            xLog.verbose(`[${processLabel}] COLLISION: '${key}' (${count} entries) → ${strategy} strategy`);
        },
        
        logConsolidation: (processCount, keyCount, collisionCount) => {
            xLog.progress(`[${processLabel}] CONSOLIDATE: ${processCount} processes, ${keyCount} keys, ${collisionCount} collisions`);
        }
    };
    
    return logger;
};

module.exports = moduleFunction;