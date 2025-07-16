const moduleFunction = function(args = {}) {
    const { initialWisdom = {}, collisionStrategy = 'sequence' } = args;
    const { xLog } = process.global;
    
    // Execution mode configuration
    let executionMode = 'serial'; // Default to 'serial' for backward compatibility
    
    const stateManager = require('./lib/wisdom-state-manager/wisdom-state-manager')({ 
        initialState: {} // Start with empty state, initial wisdom is handled separately
    });
    
    const registryManager = require('./lib/process-registry-manager/process-registry-manager')();
    
    const collisionHandler = require('./lib/collision-handler/collision-handler')({ 
        strategy: collisionStrategy 
    });
    
    const consolidationEngine = require('./lib/consolidation-engine/consolidation-engine')({
        stateManager,
        collisionHandler
    });
    
    const accessorFactory = require('./lib/accessor-factory/accessor-factory')({
        stateManager,
        registryManager,
        initialWisdom,
        getExecutionMode: () => executionMode
    });
    
    // Public API
    const createAccessor = (processId) => {
        xLog.verbose(`[wisdom-bus] Creating accessor for process: ${processId}`);
        return accessorFactory.create(processId);
    };
    
    const consolidate = () => {
        xLog.verbose('[wisdom-bus] Starting consolidation');
        const result = consolidationEngine.consolidate(initialWisdom);
        xLog.verbose(`[wisdom-bus] Consolidation complete: ${result.keyCount} keys from ${result.processCount} processes`);
        return result;
    };
    
    const getProcessRegistry = () => {
        xLog.verbose('[wisdom-bus] Generating process registry report');
        return registryManager.generateReport();
    };
    
    // Configuration methods for execution mode
    const setExecutionMode = (mode) => {
        if (!['serial', 'parallel', 'iteration'].includes(mode)) {
            throw new Error(`Invalid execution mode: ${mode}. Must be 'serial', 'parallel', or 'iteration'`);
        }
        executionMode = mode;
        xLog.verbose(`[wisdom-bus] Execution mode set to: ${mode}`);
    };
    
    const getExecutionMode = () => executionMode;
    
    // Log initialization
    xLog.verbose(`[wisdom-bus] Wisdom-bus initialized with ${Object.keys(initialWisdom).length} initial keys and '${collisionStrategy}' collision strategy`);
    
    return {
        createAccessor,
        consolidate,
        getProcessRegistry,
        setExecutionMode,
        getExecutionMode
    };
};

module.exports = moduleFunction;