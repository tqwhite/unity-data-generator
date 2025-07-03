const moduleFunction = function(args = {}) {
    const { strategy = 'sequence' } = args;
    
    // Load all strategies
    const strategies = {
        sequence: require('./strategies/sequence-strategy')(),
        array: require('./strategies/array-strategy')(),
        overwrite: require('./strategies/overwrite-strategy')(),
        error: require('./strategies/error-strategy')()
    };
    
    // Validate strategy
    if (!strategies[strategy]) {
        throw new Error(`Unknown collision strategy: ${strategy}`);
    }
    
    const selectedStrategy = strategies[strategy];
    
    // Handle collisions for a key
    const handle = (key, entries) => {
        return selectedStrategy.handle(key, entries);
    };
    
    // Get information about the current strategy
    const getInfo = () => {
        return {
            strategy: strategy,
            description: selectedStrategy.getDescription()
        };
    };
    
    return {
        handle,
        getInfo
    };
};

module.exports = moduleFunction;