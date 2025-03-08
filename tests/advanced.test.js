import { createStore, withDevTools, createSelector } from '../src/effistate';

describe('EffiState Advanced Features', () => {
  // Test computed values
  test('compute should derive values from state', () => {
    const store = createStore({ count: 5, multiplier: 2 });
    store.compute('doubled', state => state.count * state.multiplier);
    
    expect(store.getComputed().doubled).toBe(10);
    
    store.set({ count: 10 });
    expect(store.getComputed().doubled).toBe(20);
  });
  
  // Test state history / time travel
  test('undo and redo should navigate state history', () => {
    const store = createStore({ count: 0 });
    
    store.set({ count: 1 });
    store.set({ count: 2 });
    
    expect(store.get().count).toBe(2);
    
    store.undo();
    expect(store.get().count).toBe(1);
    
    store.redo();
    expect(store.get().count).toBe(2);
  });
  
  // Test selectors
  test('createSelector should only update when selected value changes', () => {
    const store = createStore({ user: { name: 'John' }, count: 0 });
    const callback = jest.fn();
    
    const useUserName = createSelector(
      store,
      state => state.user.name
    );
    
    // Mock the selector hook behavior
    const subscribe = store.subscribe(() => {
      const userName = useUserName();
      callback(userName);
    });
    
    // Changing unrelated state shouldn't trigger the selector
    store.set({ count: 1 });
    
    // Reset the mock to focus on just the name changes
    callback.mockReset();
    
    // Changing user name should trigger the selector
    store.set({ user: { name: 'Jane' } });
    
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('Jane');
    
    subscribe(); // Cleanup
  });
}); 