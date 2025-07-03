const moduleFunction = function() {
    
    const handle = (key, entries) => {
        const result = {};
        
        // Last entry wins
        result[key] = entries[entries.length - 1].value;
        
        return result;
    };
    
    const getDescription = () => {
        return 'Last write wins - keeps only the final value';
    };
    
    return {
        handle,
        getDescription
    };
};

module.exports = moduleFunction;