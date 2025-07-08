const moduleFunction = function(args = {}) {
    const { initialWisdom = {}, collisionStrategy = 'sequence' } = args;
    const { xLog } = process.global;
    
    // Execution mode configuration
    let executionMode = 'serial'; // Default to 'serial' for backward compatibility
    
    // Initialize sub-modules
    const wisdomBusLogger = require('./lib/wisdom-bus-logger/wisdom-bus-logger')();
    
    const stateManager = require('./lib/wisdom-state-manager/wisdom-state-manager')({ 
        initialState: {} // Start with empty state, initial wisdom is handled separately
    });
    
    const registryManager = require('./lib/process-registry-manager/process-registry-manager')({ 
        logger: wisdomBusLogger 
    });
    
    const collisionHandler = require('./lib/collision-handler/collision-handler')({ 
        strategy: collisionStrategy 
    });
    
    const consolidationEngine = require('./lib/consolidation-engine/consolidation-engine')({
        stateManager,
        collisionHandler,
        logger: wisdomBusLogger
    });
    
    const accessorFactory = require('./lib/accessor-factory/accessor-factory')({
        stateManager,
        registryManager,
        logger: wisdomBusLogger,
        initialWisdom,
        getExecutionMode: () => executionMode
    });
    
    // Public API
    const createAccessor = (processId) => {
        wisdomBusLogger.detail(`Creating accessor for process: ${processId}`);
        return accessorFactory.create(processId);
    };
    
    const consolidate = () => {
        wisdomBusLogger.progress('Starting consolidation');
        const result = consolidationEngine.consolidate(initialWisdom);
        wisdomBusLogger.progress(`Consolidation complete: ${result.keyCount} keys from ${result.processCount} processes`);
        return result;
    };
    
    const getProcessRegistry = () => {
        wisdomBusLogger.detail('Generating process registry report');
        return registryManager.generateReport();
    };
    
    // Configuration methods for execution mode
    const setExecutionMode = (mode) => {
        if (!['serial', 'parallel', 'iteration'].includes(mode)) {
            throw new Error(`Invalid execution mode: ${mode}. Must be 'serial', 'parallel', or 'iteration'`);
        }
        executionMode = mode;
        wisdomBusLogger.detail(`Execution mode set to: ${mode}`);
    };
    
    const getExecutionMode = () => executionMode;
    
    // Log initialization
    wisdomBusLogger.detail(`Wisdom-bus initialized with ${Object.keys(initialWisdom).length} initial keys and '${collisionStrategy}' collision strategy`);
    
    return {
        createAccessor,
        consolidate,
        getProcessRegistry,
        setExecutionMode,
        getExecutionMode
    };
};

module.exports = moduleFunction;