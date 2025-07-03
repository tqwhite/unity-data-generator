const moduleFunction = function() {
    
    const handle = (key, entries) => {
        const result = {};
        
        // Single entry - no collision
        if (entries.length === 1) {
            result[key] = entries[0].value;
            return result;
        }
        
        // Multiple entries - append numbers
        entries.forEach((entry, index) => {
            const resultKey = index === 0 ? key : `${key}_${index + 1}`;
            result[resultKey] = entry.value;
        });
        
        return result;
    };
    
    const getDescription = () => {
        return 'Appends numbers to duplicate keys (key, key_2, key_3, etc.)';
    };
    
    return {
        handle,
        getDescription
    };
};

module.exports = moduleFunction;