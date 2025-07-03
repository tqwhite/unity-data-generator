const consolidationEngine = require('../lib/consolidation-engine/consolidation-engine');

describe('consolidation-engine', () => {
    let engine;
    let mockStateManager;
    let mockCollisionHandler;
    let mockLogger;

    beforeEach(() => {
        mockStateManager = {
            getAll: jest.fn()
        };

        mockCollisionHandler = {
            handle: jest.fn()
        };

        mockLogger = {
            detail: jest.fn(),
            verbose: jest.fn(),
            logCollision: jest.fn(),
            logConsolidation: jest.fn()
        };

        engine = consolidationEngine({
            stateManager: mockStateManager,
            collisionHandler: mockCollisionHandler,
            logger: mockLogger
        });
    });

    describe('consolidate()', () => {
        test('should return initial wisdom when no namespaced entries', () => {
            const initialWisdom = { initial: 'value', another: 'data' };
            mockStateManager.getAll.mockReturnValue({});
            
            const result = engine.consolidate(initialWisdom);
            
            expect(result).toEqual({
                wisdom: { initial: 'value', another: 'data' },
                collisions: {},
                processCount: 0,
                keyCount: 2,
                collisionCount: 0
            });
        });

        test('should merge single process additions', () => {
            const initialWisdom = { initial: 'value' };
            mockStateManager.getAll.mockReturnValue({
                '_proc_proc1_key1': 'value1',
                '_proc_proc1_key2': 'value2'
            });
            
            // No collisions for single entries
            mockCollisionHandler.handle.mockImplementation((key, entries) => {
                const result = {};
                result[key] = entries[0].value;
                return result;
            });
            
            const result = engine.consolidate(initialWisdom);
            
            expect(result.wisdom).toEqual({
                initial: 'value',
                key1: 'value1',
                key2: 'value2'
            });
            expect(result.processCount).toBe(1);
            expect(result.keyCount).toBe(3);
            expect(result.collisionCount).toBe(0);
        });

        test('should handle collisions from multiple processes', () => {
            const initialWisdom = {};
            mockStateManager.getAll.mockReturnValue({
                '_proc_proc1_sharedKey': 'value1',
                '_proc_proc2_sharedKey': 'value2',
                '_proc_proc1_uniqueKey': 'unique1'
            });
            
            // Mock collision handler to append numbers
            mockCollisionHandler.handle.mockImplementation((key, entries) => {
                if (entries.length === 1) {
                    return { [key]: entries[0].value };
                }
                // Simulate sequence strategy
                const result = {};
                entries.forEach((entry, i) => {
                    const resultKey = i === 0 ? key : `${key}_${i + 1}`;
                    result[resultKey] = entry.value;
                });
                return result;
            });
            
            const result = engine.consolidate(initialWisdom);
            
            expect(result.wisdom).toEqual({
                sharedKey: 'value1',
                sharedKey_2: 'value2',
                uniqueKey: 'unique1'
            });
            expect(result.collisions).toHaveProperty('sharedKey');
            expect(result.collisions.sharedKey).toHaveLength(2);
            expect(result.collisionCount).toBe(1);
        });

        test('should group entries by clean key correctly', () => {
            mockStateManager.getAll.mockReturnValue({
                '_proc_proc1_data': 'first',
                '_proc_proc2_data': 'second',
                '_proc_proc3_data': 'third',
                '_proc_proc1_other': 'single'
            });
            
            mockCollisionHandler.handle.mockImplementation((key, entries) => {
                // Return whatever for testing
                return { [key]: entries.map(e => e.value) };
            });
            
            const result = engine.consolidate({});
            
            // Verify collision handler was called with correct groupings
            expect(mockCollisionHandler.handle).toHaveBeenCalledTimes(2);
            
            // Check 'data' collision
            const dataCall = mockCollisionHandler.handle.mock.calls.find(
                call => call[0] === 'data'
            );
            expect(dataCall[1]).toHaveLength(3);
            expect(dataCall[1].map(e => e.value)).toEqual(['first', 'second', 'third']);
            
            // Check 'other' (no collision)
            const otherCall = mockCollisionHandler.handle.mock.calls.find(
                call => call[0] === 'other'
            );
            expect(otherCall[1]).toHaveLength(1);
        });

        test('should log collisions', () => {
            mockStateManager.getAll.mockReturnValue({
                '_proc_proc1_key': 'value1',
                '_proc_proc2_key': 'value2'
            });
            
            mockCollisionHandler.handle.mockReturnValue({
                key: 'value1',
                key_2: 'value2'
            });
            
            engine.consolidate({});
            
            expect(mockLogger.logCollision).toHaveBeenCalledWith('key', 2, undefined);
        });

        test('should handle non-namespaced keys in state', () => {
            mockStateManager.getAll.mockReturnValue({
                '_proc_proc1_key': 'value1',
                'regularKey': 'shouldBeIgnored',
                'anotherRegularKey': 'alsoIgnored'
            });
            
            mockCollisionHandler.handle.mockImplementation((key, entries) => {
                return { [key]: entries[0].value };
            });
            
            const result = engine.consolidate({});
            
            expect(result.wisdom).toEqual({
                key: 'value1'
            });
            expect(result.keyCount).toBe(1);
        });

        test('should extract process IDs correctly', () => {
            mockStateManager.getAll.mockReturnValue({
                '_proc_process-123_key': 'value1',
                '_proc_process-456_key': 'value2',
                '_proc_process_2024-01-15T10:30:00.000Z_#1_key': 'value3'
            });
            
            mockCollisionHandler.handle.mockReturnValue({ key: ['value1', 'value2', 'value3'] });
            
            const result = engine.consolidate({});
            
            expect(result.processCount).toBe(3);
            expect(result.collisions.key).toHaveLength(3);
            
            // Check that all expected process IDs are present (order may vary due to sorting)
            const processIds = result.collisions.key.map(e => e.processId);
            expect(processIds).toContain('process-123');
            expect(processIds).toContain('process-456');
            expect(processIds).toContain('process_2024-01-15T10:30:00.000Z_#1');
        });

        test('should log consolidation summary', () => {
            mockStateManager.getAll.mockReturnValue({
                '_proc_proc1_key1': 'value1',
                '_proc_proc2_key1': 'value2',
                '_proc_proc1_key2': 'value3'
            });
            
            mockCollisionHandler.handle.mockImplementation((key, entries) => {
                if (entries.length === 1) return { [key]: entries[0].value };
                return { [key]: entries[0].value, [`${key}_2`]: entries[1].value };
            });
            
            engine.consolidate({});
            
            expect(mockLogger.logConsolidation).toHaveBeenCalledWith(2, 3, 1);
        });

        test('should handle empty collision handler response', () => {
            mockStateManager.getAll.mockReturnValue({
                '_proc_proc1_key': 'value'
            });
            
            mockCollisionHandler.handle.mockReturnValue({});
            
            const result = engine.consolidate({});
            
            expect(result.wisdom).toEqual({});
            expect(result.keyCount).toBe(0);
        });
    });
});