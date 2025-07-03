const moduleFunction = function() {
    
    const handle = (key, entries) => {
        const result = {};
        
        // Single entry - no collision
        if (entries.length === 1) {
            result[key] = entries[0].value;
            return result;
        }
        
        // Multiple entries - throw error
        const processIds = entries.map(e => e.processId).join(', ');
        throw new Error(
            `Key collision detected for '${key}': ${entries.length} processes tried to set this key (${processIds})`
        );
    };
    
    const getDescription = () => {
        return 'Throws an error on key collision';
    };
    
    return {
        handle,
        getDescription
    };
};

module.exports = moduleFunction;