const wisdomStateManager = require('../lib/wisdom-state-manager/wisdom-state-manager');

describe('wisdom-state-manager', () => {
    let stateManager;

    beforeEach(() => {
        stateManager = wisdomStateManager({ 
            initialState: { 
                existingKey: 'existingValue',
                anotherKey: 'anotherValue' 
            } 
        });
    });

    describe('initialization', () => {
        test('should create state manager with initial state', () => {
            const manager = wisdomStateManager({ 
                initialState: { foo: 'bar' } 
            });
            expect(manager.get('foo')).toBe('bar');
        });

        test('should create state manager with empty state when no initial state provided', () => {
            const manager = wisdomStateManager();
            expect(manager.getAll()).toEqual({});
        });
    });

    describe('set()', () => {
        test('should set a new key-value pair', () => {
            stateManager.set('newKey', 'newValue');
            expect(stateManager.get('newKey')).toBe('newValue');
        });

        test('should overwrite existing key', () => {
            stateManager.set('existingKey', 'updatedValue');
            expect(stateManager.get('existingKey')).toBe('updatedValue');
        });

        test('should handle complex objects', () => {
            const complexObject = {
                nested: { deep: { value: 42 } },
                array: [1, 2, 3]
            };
            stateManager.set('complex', complexObject);
            expect(stateManager.get('complex')).toEqual(complexObject);
        });

        test('should handle null and undefined values', () => {
            stateManager.set('nullKey', null);
            stateManager.set('undefinedKey', undefined);
            expect(stateManager.get('nullKey')).toBeNull();
            expect(stateManager.get('undefinedKey')).toBeUndefined();
        });
    });

    describe('get()', () => {
        test('should retrieve existing value', () => {
            expect(stateManager.get('existingKey')).toBe('existingValue');
        });

        test('should return undefined for non-existent key', () => {
            expect(stateManager.get('nonExistentKey')).toBeUndefined();
        });
    });

    describe('getAll()', () => {
        test('should return complete state object', () => {
            stateManager.set('newKey', 'newValue');
            const allState = stateManager.getAll();
            expect(allState).toEqual({
                existingKey: 'existingValue',
                anotherKey: 'anotherValue',
                newKey: 'newValue'
            });
        });

        test('should return a copy, not reference', () => {
            const state1 = stateManager.getAll();
            state1.existingKey = 'modified';
            const state2 = stateManager.getAll();
            expect(state2.existingKey).toBe('existingValue');
        });
    });

    describe('exists()', () => {
        test('should return true for existing keys', () => {
            expect(stateManager.exists('existingKey')).toBe(true);
        });

        test('should return false for non-existent keys', () => {
            expect(stateManager.exists('nonExistentKey')).toBe(false);
        });

        test('should return true for keys with undefined values', () => {
            stateManager.set('undefinedKey', undefined);
            expect(stateManager.exists('undefinedKey')).toBe(true);
        });
    });

    describe('clear()', () => {
        test('should remove all state', () => {
            stateManager.set('key1', 'value1');
            stateManager.set('key2', 'value2');
            stateManager.clear();
            expect(stateManager.getAll()).toEqual({});
        });
    });

    describe('getKeys()', () => {
        test('should return all keys', () => {
            stateManager.set('newKey', 'value');
            const keys = stateManager.getKeys();
            expect(keys).toEqual(['existingKey', 'anotherKey', 'newKey']);
        });

        test('should return empty array when no keys', () => {
            stateManager.clear();
            expect(stateManager.getKeys()).toEqual([]);
        });
    });

    describe('size()', () => {
        test('should return number of keys', () => {
            expect(stateManager.size()).toBe(2);
            stateManager.set('newKey', 'value');
            expect(stateManager.size()).toBe(3);
            stateManager.clear();
            expect(stateManager.size()).toBe(0);
        });
    });
});