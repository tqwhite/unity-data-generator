const accessorFactory = require('../lib/accessor-factory/accessor-factory');

describe('accessor-factory', () => {
    let factory;
    let mockStateManager;
    let mockRegistryManager;
    let mockLogger;

    beforeEach(() => {
        // Mock dependencies
        mockStateManager = {
            set: jest.fn(),
            get: jest.fn(),
            exists: jest.fn(),
            getAll: jest.fn(() => ({ initial: 'wisdom' }))
        };

        mockRegistryManager = {
            registerProcess: jest.fn(),
            recordAddition: jest.fn(),
            recordRead: jest.fn(),
            recordError: jest.fn()
        };

        mockLogger = {
            detail: jest.fn(),
            verbose: jest.fn(),
            warning: jest.fn(),
            error: jest.fn(),
            logAddition: jest.fn(),
            logRead: jest.fn(),
            logCollision: jest.fn(),
            logConsolidation: jest.fn()
        };

        factory = accessorFactory({
            stateManager: mockStateManager,
            registryManager: mockRegistryManager,
            logger: mockLogger,
            initialWisdom: { initial: 'wisdom', existingKey: 'existingValue' }
        });
    });

    describe('create()', () => {
        test('should create accessor with unique processId', () => {
            const processId = 'test-process-123';
            const accessor = factory.create(processId);
            
            expect(accessor).toBeDefined();
            expect(accessor.processId).toBe(processId);
            expect(accessor.add).toBeInstanceOf(Function);
            expect(accessor.get).toBeInstanceOf(Function);
            expect(accessor.getAll).toBeInstanceOf(Function);
            expect(accessor.has).toBeInstanceOf(Function);
        });

        test('should register process on creation', () => {
            const processId = 'test-process';
            factory.create(processId);
            
            expect(mockRegistryManager.registerProcess).toHaveBeenCalledWith(processId);
        });
    });

    describe('accessor.add()', () => {
        let accessor;
        const processId = 'test-proc-123';

        beforeEach(() => {
            accessor = factory.create(processId);
        });

        test('should add value with namespaced key', () => {
            const result = accessor.add('myKey', 'myValue');
            
            expect(mockStateManager.set).toHaveBeenCalledWith(
                '_proc_test-proc-123_myKey',
                'myValue'
            );
            expect(result).toEqual({
                success: true,
                namespacedKey: '_proc_test-proc-123_myKey',
                originalKey: 'myKey'
            });
        });

        test('should record addition in registry', () => {
            accessor.add('key', 'value');
            
            expect(mockRegistryManager.recordAddition).toHaveBeenCalledWith(
                processId,
                'key',
                '_proc_test-proc-123_key'
            );
        });

        test('should handle complex values', () => {
            const complexValue = {
                nested: { deep: [1, 2, 3] },
                fn: () => 'function',
                date: new Date()
            };
            
            const result = accessor.add('complex', complexValue);
            
            expect(mockStateManager.set).toHaveBeenCalledWith(
                '_proc_test-proc-123_complex',
                complexValue
            );
            expect(result.success).toBe(true);
        });

        test('should handle errors gracefully', () => {
            mockStateManager.set.mockImplementation(() => {
                throw new Error('Storage error');
            });
            
            const result = accessor.add('errorKey', 'value');
            
            expect(result).toEqual({
                success: false,
                error: 'Storage error',
                key: 'errorKey'
            });
            expect(mockRegistryManager.recordError).toHaveBeenCalled();
        });
    });

    describe('accessor.get()', () => {
        let accessor;
        const processId = 'test-proc-123';

        beforeEach(() => {
            accessor = factory.create(processId);
        });

        test('should check namespaced key first', () => {
            mockStateManager.get.mockImplementation((key) => {
                if (key === '_proc_test-proc-123_myKey') return 'namespacedValue';
                return undefined;
            });
            
            const result = accessor.get('myKey');
            
            expect(result).toBe('namespacedValue');
            expect(mockStateManager.get).toHaveBeenCalledWith('_proc_test-proc-123_myKey');
        });

        test('should fall back to initial wisdom', () => {
            mockStateManager.get.mockReturnValue(undefined);
            
            const result = accessor.get('existingKey');
            
            expect(result).toBe('existingValue');
        });

        test('should record read operations', () => {
            mockStateManager.get.mockReturnValue('foundValue');
            
            accessor.get('testKey');
            
            expect(mockRegistryManager.recordRead).toHaveBeenCalledWith(
                processId,
                'testKey',
                'foundValue',
                'namespace'
            );
        });

        test('should return undefined for non-existent keys', () => {
            mockStateManager.get.mockReturnValue(undefined);
            
            const result = accessor.get('nonExistent');
            
            expect(result).toBeUndefined();
            expect(mockRegistryManager.recordRead).toHaveBeenCalledWith(
                processId,
                'nonExistent',
                undefined,
                'not-found'
            );
        });
    });

    describe('accessor.has()', () => {
        let accessor;

        beforeEach(() => {
            accessor = factory.create('test-proc');
        });

        test('should check namespaced key first', () => {
            mockStateManager.exists.mockReturnValue(true);
            
            const result = accessor.has('key');
            
            expect(result).toBe(true);
            expect(mockStateManager.exists).toHaveBeenCalledWith('_proc_test-proc_key');
        });

        test('should check initial wisdom if not in namespace', () => {
            mockStateManager.exists.mockReturnValue(false);
            
            const result = accessor.has('existingKey');
            
            expect(result).toBe(true);
        });

        test('should return false for non-existent keys', () => {
            mockStateManager.exists.mockReturnValue(false);
            
            const result = accessor.has('nonExistent');
            
            expect(result).toBe(false);
        });
    });

    describe('accessor.getAll()', () => {
        let accessor;
        const processId = 'test-proc';

        beforeEach(() => {
            accessor = factory.create(processId);
        });

        test('should merge initial wisdom with namespaced additions', () => {
            // Simulate some additions
            mockStateManager.getAll.mockReturnValue({
                '_proc_test-proc_newKey': 'newValue',
                '_proc_test-proc_override': 'overridden',
                '_proc_other-proc_ignore': 'shouldIgnore',
                regularKey: 'regularValue'
            });
            
            const result = accessor.getAll();
            
            expect(result).toEqual({
                initial: 'wisdom',
                existingKey: 'existingValue',
                newKey: 'newValue',
                override: 'overridden'
                // Should not include other process's keys or non-namespaced keys
            });
        });

        test('should handle empty state', () => {
            mockStateManager.getAll.mockReturnValue({});
            
            const result = accessor.getAll();
            
            expect(result).toEqual({
                initial: 'wisdom',
                existingKey: 'existingValue'
            });
        });
    });

    describe('process isolation', () => {
        test('should isolate data between different processes', () => {
            const accessor1 = factory.create('proc1');
            const accessor2 = factory.create('proc2');
            
            // Simulate different namespaced values
            mockStateManager.get.mockImplementation((key) => {
                if (key === '_proc_proc1_shared') return 'value1';
                if (key === '_proc_proc2_shared') return 'value2';
                return undefined;
            });
            
            expect(accessor1.get('shared')).toBe('value1');
            expect(accessor2.get('shared')).toBe('value2');
        });
    });

    describe('edge cases', () => {
        test('should handle process IDs with special characters', () => {
            const specialId = 'proc_2024-01-15T10:30:00.000Z_#1';
            const accessor = factory.create(specialId);
            
            accessor.add('key', 'value');
            
            expect(mockStateManager.set).toHaveBeenCalledWith(
                '_proc_proc_2024-01-15T10:30:00.000Z_#1_key',
                'value'
            );
        });

        test('should handle empty string keys', () => {
            const accessor = factory.create('proc');
            const result = accessor.add('', 'emptyKeyValue');
            
            expect(result.success).toBe(true);
            expect(result.namespacedKey).toBe('_proc_proc_');
        });

        test('should handle very large values', () => {
            const accessor = factory.create('proc');
            const largeArray = new Array(10000).fill('data');
            
            const result = accessor.add('large', largeArray);
            
            expect(result.success).toBe(true);
            expect(mockStateManager.set).toHaveBeenCalledWith(
                '_proc_proc_large',
                largeArray
            );
        });
    });
});