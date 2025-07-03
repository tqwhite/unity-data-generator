const moduleFunction = function(args = {}) {
    const { initialState = {} } = args;
    
    // Private state storage
    let state = { ...initialState };
    
    // Set a key-value pair
    const set = (key, value) => {
        state[key] = value;
    };
    
    // Get a value by key
    const get = (key) => {
        return state[key];
    };
    
    // Get all state as a copy
    const getAll = () => {
        return { ...state };
    };
    
    // Check if key exists
    const exists = (key) => {
        return Object.prototype.hasOwnProperty.call(state, key);
    };
    
    // Clear all state
    const clear = () => {
        state = {};
    };
    
    // Get all keys
    const getKeys = () => {
        return Object.keys(state);
    };
    
    // Get number of keys
    const size = () => {
        return Object.keys(state).length;
    };
    
    return {
        set,
        get,
        getAll,
        exists,
        clear,
        getKeys,
        size
    };
};

module.exports = moduleFunction;