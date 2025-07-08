// Helper to make thinkers work with both old and new patterns during migration

const migrateThinker = (thinkerModule) => {
    const originalExecuteRequest = thinkerModule.executeRequest;
    
    thinkerModule.executeRequest = function(args, callback) {
        const { wisdomBus, latestWisdom } = args;
        
        // Intercept the callback to handle both patterns
        const wrappedCallback = (err, result) => {
            if (err) return callback(err);
            
            // If thinker returned wisdom (old pattern)
            if (result && result.wisdom && wisdomBus) {
                const { wisdom } = result;
                
                // Add all new/changed properties to wisdom-bus
                Object.entries(wisdom).forEach(([key, value]) => {
                    // Skip unchanged values to avoid unnecessary writes
                    if (latestWisdom && latestWisdom[key] === value) return;
                    
                    wisdomBus.saveWisdom(key, value);
                });
                
                // Return success without wisdom
                callback(null, {
                    success: true,
                    message: result.message || 'Thinker completed successfully'
                });
            } else {
                // Already using new pattern or no wisdomBus
                callback(err, result);
            }
        };
        
        // Call original with wrapped callback
        originalExecuteRequest.call(this, args, wrappedCallback);
    };
    
    return thinkerModule;
};

module.exports = { migrateThinker };