const moduleFunction = function() {
    
    const handle = (key, entries) => {
        const result = {};
        
        // Always return an array, even for single entries
        result[key] = entries.map(entry => entry.value);
        
        return result;
    };
    
    const getDescription = () => {
        return 'Combines all values into an array';
    };
    
    return {
        handle,
        getDescription
    };
};

module.exports = moduleFunction;