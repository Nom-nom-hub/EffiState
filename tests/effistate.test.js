import { createStore, withLogger, withPersistence } from '../src/effistate';

// Mock localStorage for testing
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    }
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('EffiState', () => {
  test('createStore should create a store with initial state', () => {
    const store = createStore({ count: 0 });
    expect(store.get()).toEqual({ count: 0 });
  });

  test('set should update the state', () => {
    const store = createStore({ count: 0 });
    store.set({ count: 1 });
    expect(store.get()).toEqual({ count: 1 });
  });

  test('subscribe should be called when state changes', () => {
    const store = createStore({ count: 0 });
    const listener = jest.fn();
    
    store.subscribe(listener);
    store.set({ count: 1 });
    
    expect(listener).toHaveBeenCalledWith({ count: 1 }, { count: 0 });
  });

  test('unsubscribe should stop listener from being called', () => {
    const store = createStore({ count: 0 });
    const listener = jest.fn();
    
    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.set({ count: 1 });
    
    expect(listener).not.toHaveBeenCalled();
  });

  test('withLogger middleware should not interfere with state updates', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const store = withLogger(createStore({ count: 0 }));
    
    store.set({ count: 1 });
    expect(store.get()).toEqual({ count: 1 });
    expect(consoleSpy).toHaveBeenCalledTimes(2);
    
    consoleSpy.mockRestore();
  });

  test('withPersistence middleware should save state to localStorage', () => {
    const store = withPersistence(createStore({ count: 0 }), 'testKey');
    
    store.set({ count: 1 });
    expect(localStorage.getItem('testKey')).toBe(JSON.stringify({ count: 1 }));
  });
}); 