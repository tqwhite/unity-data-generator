const moduleFunction = function(args = {}) {
    const { logger } = args;
    
    // Private registry storage
    const processRegistry = {};
    
    // Register a new process
    const registerProcess = (processId) => {
        if (processRegistry[processId]) {
            logger.warning(`Re-registering process: ${processId}`);
        }
        
        processRegistry[processId] = {
            processId,
            startTime: Date.now(),
            endTime: null,
            duration: null,
            additions: [],
            reads: [],
            errors: [],
            status: 'active'
        };
        
        logger.detail(`Registered process: ${processId}`);
    };
    
    // Record an addition operation
    const recordAddition = (processId, key, namespacedKey) => {
        if (!processRegistry[processId]) {
            logger.warning(`Recording addition for unregistered process: ${processId}`);
            return;
        }
        
        processRegistry[processId].additions.push({
            key,
            namespacedKey,
            timestamp: Date.now()
        });
    };
    
    // Record a read operation
    const recordRead = (processId, key, foundValue, source) => {
        if (!processRegistry[processId]) {
            logger.warning(`Recording read for unregistered process: ${processId}`);
            return;
        }
        
        processRegistry[processId].reads.push({
            key,
            foundValue,
            source,
            timestamp: Date.now()
        });
    };
    
    // Record an error
    const recordError = (processId, error, operation) => {
        if (!processRegistry[processId]) {
            logger.warning(`Recording error for unregistered process: ${processId}`);
            return;
        }
        
        processRegistry[processId].errors.push({
            message: error.message,
            operation,
            timestamp: Date.now(),
            stack: error.stack
        });
    };
    
    // Mark process as complete
    const completeProcess = (processId) => {
        if (!processRegistry[processId]) {
            logger.warning(`Completing unregistered process: ${processId}`);
            return;
        }
        
        const process = processRegistry[processId];
        process.endTime = Date.now();
        process.duration = process.endTime - process.startTime;
        process.status = 'completed';
    };
    
    // Get information about a specific process
    const getProcessInfo = (processId) => {
        return processRegistry[processId];
    };
    
    // Get all processes
    const getAllProcesses = () => {
        return { ...processRegistry };
    };
    
    // Generate a summary report
    const generateReport = () => {
        const allProcesses = Object.values(processRegistry);
        
        const report = {
            totalProcesses: allProcesses.length,
            completedProcesses: allProcesses.filter(p => p.status === 'completed').length,
            activeProcesses: allProcesses.filter(p => p.status === 'active').length,
            totalAdditions: allProcesses.reduce((sum, p) => sum + p.additions.length, 0),
            totalReads: allProcesses.reduce((sum, p) => sum + p.reads.length, 0),
            totalErrors: allProcesses.reduce((sum, p) => sum + p.errors.length, 0),
            processes: {}
        };
        
        // Add per-process summary
        allProcesses.forEach(process => {
            report.processes[process.processId] = {
                processId: process.processId,
                startTime: process.startTime,
                endTime: process.endTime,
                duration: process.duration,
                status: process.status,
                additionCount: process.additions.length,
                readCount: process.reads.length,
                errorCount: process.errors.length
            };
        });
        
        return report;
    };
    
    // Clear all registry data
    const clear = () => {
        Object.keys(processRegistry).forEach(key => delete processRegistry[key]);
    };
    
    return {
        registerProcess,
        recordAddition,
        recordRead,
        recordError,
        completeProcess,
        getProcessInfo,
        getAllProcesses,
        generateReport,
        clear
    };
};

module.exports = moduleFunction;