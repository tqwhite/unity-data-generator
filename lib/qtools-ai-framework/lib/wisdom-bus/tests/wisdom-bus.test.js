const wisdomBus = require('../wisdom-bus');

describe('wisdom-bus', () => {
    let bus;

    beforeEach(() => {
        // Mock process.global.xLog
        process.global = {
            xLog: {
                detail: jest.fn(),
                verbose: jest.fn(),
                progress: jest.fn(),
                status: jest.fn(),
                warning: jest.fn(),
                error: jest.fn()
            }
        };
    });

    describe('initialization', () => {
        test('should create wisdom-bus with default settings', () => {
            bus = wisdomBus();
            
            expect(bus.createAccessor).toBeInstanceOf(Function);
            expect(bus.consolidate).toBeInstanceOf(Function);
            expect(bus.getProcessRegistry).toBeInstanceOf(Function);
        });

        test('should accept initial wisdom', () => {
            const initialWisdom = { foo: 'bar', baz: 42 };
            bus = wisdomBus({ initialWisdom });
            
            const accessor = bus.createAccessor('test-process');
            expect(accessor.get('foo')).toBe('bar');
            expect(accessor.get('baz')).toBe(42);
        });

        test('should accept collision strategy', () => {
            bus = wisdomBus({ collisionStrategy: 'array' });
            
            const accessor1 = bus.createAccessor('proc1');
            const accessor2 = bus.createAccessor('proc2');
            
            accessor1.add('shared', 'value1');
            accessor2.add('shared', 'value2');
            
            const { wisdom } = bus.consolidate();
            expect(wisdom.shared).toEqual(['value1', 'value2']);
        });
    });

    describe('integration flow', () => {
        beforeEach(() => {
            bus = wisdomBus({ 
                initialWisdom: { initial: 'data' },
                collisionStrategy: 'sequence'
            });
        });

        test('should handle single process flow', () => {
            const accessor = bus.createAccessor('single-process');
            
            // Add some data
            accessor.add('result', 'processed');
            accessor.add('status', 'complete');
            
            // Consolidate
            const { wisdom, collisions, processCount } = bus.consolidate();
            
            expect(wisdom).toEqual({
                initial: 'data',
                result: 'processed',
                status: 'complete'
            });
            expect(collisions).toEqual({});
            expect(processCount).toBe(1);
        });

        test('should handle multiple processes with collisions', () => {
            const accessor1 = bus.createAccessor('process-1');
            const accessor2 = bus.createAccessor('process-2');
            const accessor3 = bus.createAccessor('process-3');
            
            // Each process adds unique and shared data
            accessor1.add('unique1', 'data1');
            accessor1.add('shared', 'fromProcess1');
            
            accessor2.add('unique2', 'data2');
            accessor2.add('shared', 'fromProcess2');
            
            accessor3.add('unique3', 'data3');
            accessor3.add('shared', 'fromProcess3');
            
            // Consolidate
            const { wisdom, collisions, processCount, collisionCount } = bus.consolidate();
            
            expect(processCount).toBe(3);
            expect(collisionCount).toBe(1);
            expect(collisions.shared).toHaveLength(3);
            
            // Sequence strategy should create numbered keys
            expect(wisdom).toMatchObject({
                initial: 'data',
                unique1: 'data1',
                unique2: 'data2',
                unique3: 'data3',
                shared: 'fromProcess1',
                shared_2: 'fromProcess2',
                shared_3: 'fromProcess3'
            });
        });

        test('should provide process registry information', () => {
            const accessor1 = bus.createAccessor('proc1');
            const accessor2 = bus.createAccessor('proc2');
            
            accessor1.add('key1', 'value1');
            accessor1.get('key1');
            accessor1.get('nonExistent');
            
            accessor2.add('key2', 'value2');
            
            const registry = bus.getProcessRegistry();
            
            expect(registry.totalProcesses).toBe(2);
            expect(registry.totalAdditions).toBe(2);
            expect(registry.totalReads).toBe(2);
            expect(registry.processes.proc1.additionCount).toBe(1);
            expect(registry.processes.proc1.readCount).toBe(2);
            expect(registry.processes.proc2.additionCount).toBe(1);
        });
    });

    describe('error handling', () => {
        beforeEach(() => {
            bus = wisdomBus({ collisionStrategy: 'error' });
        });

        test('should handle collision strategy errors', () => {
            const accessor1 = bus.createAccessor('proc1');
            const accessor2 = bus.createAccessor('proc2');
            
            accessor1.add('key', 'value1');
            accessor2.add('key', 'value2');
            
            expect(() => {
                bus.consolidate();
            }).toThrow('Key collision detected');
        });
    });

    describe('different collision strategies', () => {
        test('array strategy', () => {
            bus = wisdomBus({ collisionStrategy: 'array' });
            
            const accessor1 = bus.createAccessor('proc1');
            const accessor2 = bus.createAccessor('proc2');
            
            accessor1.add('data', { id: 1 });
            accessor2.add('data', { id: 2 });
            
            const { wisdom } = bus.consolidate();
            expect(wisdom.data).toEqual([{ id: 1 }, { id: 2 }]);
        });

        test('overwrite strategy', () => {
            bus = wisdomBus({ collisionStrategy: 'overwrite' });
            
            const accessor1 = bus.createAccessor('proc1');
            const accessor2 = bus.createAccessor('proc2');
            const accessor3 = bus.createAccessor('proc3');
            
            accessor1.add('data', 'first');
            accessor2.add('data', 'second');
            accessor3.add('data', 'last');
            
            const { wisdom } = bus.consolidate();
            expect(wisdom.data).toBe('last');
        });
    });

    describe('accessor isolation', () => {
        beforeEach(() => {
            bus = wisdomBus({ initialWisdom: { shared: 'initial' } });
        });

        test('accessors should not see each other\'s data', () => {
            // Set to parallel mode for isolation
            bus.setExecutionMode('parallel');
            
            const accessor1 = bus.createAccessor('proc1');
            const accessor2 = bus.createAccessor('proc2');
            
            accessor1.add('private1', 'secret1');
            accessor2.add('private2', 'secret2');
            
            // Each can only see their own data and initial wisdom
            expect(accessor1.get('private1')).toBe('secret1');
            expect(accessor1.get('private2')).toBeUndefined();
            expect(accessor1.get('shared')).toBe('initial');
            
            expect(accessor2.get('private2')).toBe('secret2');
            expect(accessor2.get('private1')).toBeUndefined();
            expect(accessor2.get('shared')).toBe('initial');
        });

        test('getAll should show merged view per accessor', () => {
            const accessor1 = bus.createAccessor('proc1');
            const accessor2 = bus.createAccessor('proc2');
            
            accessor1.add('myData', 'value1');
            accessor2.add('myData', 'value2');
            
            const all1 = accessor1.getAll();
            const all2 = accessor2.getAll();
            
            expect(all1).toEqual({
                shared: 'initial',
                myData: 'value1'
            });
            
            expect(all2).toEqual({
                shared: 'initial',
                myData: 'value2'
            });
        });
    });
});