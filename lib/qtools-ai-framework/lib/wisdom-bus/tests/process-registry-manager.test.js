const processRegistryManager = require('../lib/process-registry-manager/process-registry-manager');

describe('process-registry-manager', () => {
    let registryManager;
    let mockXLog;

    beforeAll(() => {
        // Mock process.global.xLog
        mockXLog = {
            verbose: jest.fn(),
            error: jest.fn(),
            status: jest.fn(),
            debug: jest.fn()
        };
        process.global = process.global || {};
        process.global.xLog = mockXLog;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        registryManager = processRegistryManager();
    });

    describe('registerProcess()', () => {
        test('should register a new process', () => {
            const processId = 'test-process-123';
            registryManager.registerProcess(processId);
            
            const info = registryManager.getProcessInfo(processId);
            expect(info).toBeDefined();
            expect(info.processId).toBe(processId);
            expect(info.startTime).toBeDefined();
            expect(info.additions).toEqual([]);
            expect(info.reads).toEqual([]);
        });

        test('should log process registration', () => {
            registryManager.registerProcess('test-process');
            expect(mockXLog.verbose).toHaveBeenCalledWith(
                '[wisdom-bus] Registered process: test-process'
            );
        });

        test('should handle duplicate registration gracefully', async () => {
            const processId = 'duplicate-process';
            registryManager.registerProcess(processId);
            const firstStartTime = registryManager.getProcessInfo(processId).startTime;
            
            // Small delay to ensure different timestamp
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Register again
            registryManager.registerProcess(processId);
            const secondStartTime = registryManager.getProcessInfo(processId).startTime;
            
            expect(secondStartTime).toBeGreaterThan(firstStartTime);
            expect(mockXLog.error).toHaveBeenCalledWith(
                '[wisdom-bus] WARNING: Re-registering process: duplicate-process'
            );
        });
    });

    describe('recordAddition()', () => {
        const processId = 'test-process';
        
        beforeEach(() => {
            registryManager.registerProcess(processId);
        });

        test('should record an addition', () => {
            registryManager.recordAddition(processId, 'testKey', '_proc_test_testKey');
            
            const info = registryManager.getProcessInfo(processId);
            expect(info.additions).toHaveLength(1);
            expect(info.additions[0]).toMatchObject({
                key: 'testKey',
                namespacedKey: '_proc_test_testKey',
                timestamp: expect.any(Number)
            });
        });

        test('should record multiple additions', () => {
            registryManager.recordAddition(processId, 'key1', 'ns_key1');
            registryManager.recordAddition(processId, 'key2', 'ns_key2');
            registryManager.recordAddition(processId, 'key3', 'ns_key3');
            
            const info = registryManager.getProcessInfo(processId);
            expect(info.additions).toHaveLength(3);
        });

        test('should handle additions to unregistered process', () => {
            registryManager.recordAddition('unregistered', 'key', 'ns_key');
            expect(mockXLog.error).toHaveBeenCalledWith(
                '[wisdom-bus] WARNING: Recording addition for unregistered process: unregistered'
            );
        });
    });

    describe('recordRead()', () => {
        const processId = 'test-process';
        
        beforeEach(() => {
            registryManager.registerProcess(processId);
        });

        test('should record a read operation', () => {
            registryManager.recordRead(processId, 'testKey', 'value', 'namespace');
            
            const info = registryManager.getProcessInfo(processId);
            expect(info.reads).toHaveLength(1);
            expect(info.reads[0]).toMatchObject({
                key: 'testKey',
                foundValue: 'value',
                source: 'namespace',
                timestamp: expect.any(Number)
            });
        });

        test('should track read sources correctly', () => {
            registryManager.recordRead(processId, 'key1', 'value1', 'namespace');
            registryManager.recordRead(processId, 'key2', null, 'initial');
            registryManager.recordRead(processId, 'key3', undefined, 'not-found');
            
            const info = registryManager.getProcessInfo(processId);
            expect(info.reads[0].source).toBe('namespace');
            expect(info.reads[1].source).toBe('initial');
            expect(info.reads[2].source).toBe('not-found');
        });
    });

    describe('recordError()', () => {
        const processId = 'test-process';
        
        beforeEach(() => {
            registryManager.registerProcess(processId);
        });

        test('should record an error', () => {
            const error = new Error('Test error');
            registryManager.recordError(processId, error, 'add');
            
            const info = registryManager.getProcessInfo(processId);
            expect(info.errors).toHaveLength(1);
            expect(info.errors[0]).toMatchObject({
                message: 'Test error',
                operation: 'add',
                timestamp: expect.any(Number)
            });
        });
    });

    describe('completeProcess()', () => {
        test('should mark process as complete', () => {
            const processId = 'test-process';
            registryManager.registerProcess(processId);
            
            registryManager.completeProcess(processId);
            
            const info = registryManager.getProcessInfo(processId);
            expect(info.endTime).toBeDefined();
            expect(info.duration).toBeDefined();
            expect(info.duration).toBeGreaterThanOrEqual(0);
        });
    });

    describe('getAllProcesses()', () => {
        test('should return all registered processes', () => {
            registryManager.registerProcess('process1');
            registryManager.registerProcess('process2');
            registryManager.registerProcess('process3');
            
            const allProcesses = registryManager.getAllProcesses();
            expect(Object.keys(allProcesses)).toHaveLength(3);
            expect(allProcesses).toHaveProperty('process1');
            expect(allProcesses).toHaveProperty('process2');
            expect(allProcesses).toHaveProperty('process3');
        });
    });

    describe('generateReport()', () => {
        test('should generate summary report', () => {
            // Set up test data
            registryManager.registerProcess('process1');
            registryManager.recordAddition('process1', 'key1', 'ns_key1');
            registryManager.recordRead('process1', 'key2', 'value', 'initial');
            registryManager.completeProcess('process1');
            
            registryManager.registerProcess('process2');
            registryManager.recordAddition('process2', 'key3', 'ns_key3');
            registryManager.recordError('process2', new Error('test'), 'add');
            
            const report = registryManager.generateReport();
            
            expect(report.totalProcesses).toBe(2);
            expect(report.completedProcesses).toBe(1);
            expect(report.activeProcesses).toBe(1);
            expect(report.totalAdditions).toBe(2);
            expect(report.totalReads).toBe(1);
            expect(report.totalErrors).toBe(1);
            expect(report.processes).toBeDefined();
        });

        test('should include detailed process information in report', () => {
            registryManager.registerProcess('detailed-process');
            registryManager.recordAddition('detailed-process', 'key', 'ns_key');
            
            const report = registryManager.generateReport();
            const processReport = report.processes['detailed-process'];
            
            expect(processReport).toMatchObject({
                processId: 'detailed-process',
                startTime: expect.any(Number),
                additionCount: 1,
                readCount: 0,
                errorCount: 0,
                status: 'active'
            });
        });
    });

    describe('clear()', () => {
        test('should clear all process data', () => {
            registryManager.registerProcess('process1');
            registryManager.registerProcess('process2');
            
            registryManager.clear();
            
            const allProcesses = registryManager.getAllProcesses();
            expect(Object.keys(allProcesses)).toHaveLength(0);
        });
    });
});