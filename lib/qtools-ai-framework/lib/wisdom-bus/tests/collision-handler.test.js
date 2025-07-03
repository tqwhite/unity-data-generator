const collisionHandler = require('../lib/collision-handler/collision-handler');

describe('collision-handler', () => {
    describe('sequence strategy', () => {
        let handler;

        beforeEach(() => {
            handler = collisionHandler({ strategy: 'sequence' });
        });

        test('should handle single entry (no collision)', () => {
            const entries = [
                { processId: 'proc1', value: 'value1', namespacedKey: '_proc_proc1_key' }
            ];
            
            const result = handler.handle('key', entries);
            
            expect(result).toEqual({
                'key': 'value1'
            });
        });

        test('should append numbers for collisions', () => {
            const entries = [
                { processId: 'proc1', value: 'value1', namespacedKey: '_proc_proc1_key' },
                { processId: 'proc2', value: 'value2', namespacedKey: '_proc_proc2_key' },
                { processId: 'proc3', value: 'value3', namespacedKey: '_proc_proc3_key' }
            ];
            
            const result = handler.handle('key', entries);
            
            expect(result).toEqual({
                'key': 'value1',
                'key_2': 'value2',
                'key_3': 'value3'
            });
        });

        test('should preserve order based on processId timestamp', () => {
            const entries = [
                { processId: 'proc_1000_1', value: 'first', namespacedKey: 'ns1' },
                { processId: 'proc_2000_2', value: 'second', namespacedKey: 'ns2' },
                { processId: 'proc_1500_3', value: 'third', namespacedKey: 'ns3' }
            ];
            
            const result = handler.handle('data', entries);
            
            expect(result).toEqual({
                'data': 'first',
                'data_2': 'second',
                'data_3': 'third'
            });
        });
    });

    describe('array strategy', () => {
        let handler;

        beforeEach(() => {
            handler = collisionHandler({ strategy: 'array' });
        });

        test('should return single value array for no collision', () => {
            const entries = [
                { processId: 'proc1', value: 'value1', namespacedKey: 'ns1' }
            ];
            
            const result = handler.handle('key', entries);
            
            expect(result).toEqual({
                'key': ['value1']
            });
        });

        test('should combine all values into array', () => {
            const entries = [
                { processId: 'proc1', value: 'value1', namespacedKey: 'ns1' },
                { processId: 'proc2', value: 'value2', namespacedKey: 'ns2' },
                { processId: 'proc3', value: 'value3', namespacedKey: 'ns3' }
            ];
            
            const result = handler.handle('key', entries);
            
            expect(result).toEqual({
                'key': ['value1', 'value2', 'value3']
            });
        });

        test('should handle complex values in array', () => {
            const entries = [
                { processId: 'proc1', value: { nested: 'object1' }, namespacedKey: 'ns1' },
                { processId: 'proc2', value: [1, 2, 3], namespacedKey: 'ns2' },
                { processId: 'proc3', value: null, namespacedKey: 'ns3' }
            ];
            
            const result = handler.handle('data', entries);
            
            expect(result).toEqual({
                'data': [{ nested: 'object1' }, [1, 2, 3], null]
            });
        });
    });

    describe('overwrite strategy', () => {
        let handler;

        beforeEach(() => {
            handler = collisionHandler({ strategy: 'overwrite' });
        });

        test('should return single value for no collision', () => {
            const entries = [
                { processId: 'proc1', value: 'value1', namespacedKey: 'ns1' }
            ];
            
            const result = handler.handle('key', entries);
            
            expect(result).toEqual({
                'key': 'value1'
            });
        });

        test('should keep last value only', () => {
            const entries = [
                { processId: 'proc1', value: 'first', namespacedKey: 'ns1' },
                { processId: 'proc2', value: 'second', namespacedKey: 'ns2' },
                { processId: 'proc3', value: 'last', namespacedKey: 'ns3' }
            ];
            
            const result = handler.handle('key', entries);
            
            expect(result).toEqual({
                'key': 'last'
            });
        });
    });

    describe('error strategy', () => {
        let handler;

        beforeEach(() => {
            handler = collisionHandler({ strategy: 'error' });
        });

        test('should return single value for no collision', () => {
            const entries = [
                { processId: 'proc1', value: 'value1', namespacedKey: 'ns1' }
            ];
            
            const result = handler.handle('key', entries);
            
            expect(result).toEqual({
                'key': 'value1'
            });
        });

        test('should throw error on collision', () => {
            const entries = [
                { processId: 'proc1', value: 'value1', namespacedKey: 'ns1' },
                { processId: 'proc2', value: 'value2', namespacedKey: 'ns2' }
            ];
            
            expect(() => {
                handler.handle('key', entries);
            }).toThrow('Key collision detected for \'key\': 2 processes tried to set this key');
        });

        test('should include process IDs in error message', () => {
            const entries = [
                { processId: 'proc1', value: 'value1', namespacedKey: 'ns1' },
                { processId: 'proc2', value: 'value2', namespacedKey: 'ns2' },
                { processId: 'proc3', value: 'value3', namespacedKey: 'ns3' }
            ];
            
            expect(() => {
                handler.handle('key', entries);
            }).toThrow('proc1, proc2, proc3');
        });
    });

    describe('invalid strategy', () => {
        test('should throw error for unknown strategy', () => {
            expect(() => {
                collisionHandler({ strategy: 'invalid-strategy' });
            }).toThrow('Unknown collision strategy: invalid-strategy');
        });
    });

    describe('getInfo()', () => {
        test('should return strategy information', () => {
            const handler = collisionHandler({ strategy: 'sequence' });
            const info = handler.getInfo();
            
            expect(info).toEqual({
                strategy: 'sequence',
                description: expect.stringContaining('Appends numbers')
            });
        });
    });
});