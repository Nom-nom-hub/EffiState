import { createStore, withLogger, withPersistence } from '../src/effistate';
import { useStore } from '../src/react';

// Create a store with initial state
const counterStore = createStore({ count: 0 });

// Add middleware if needed
const enhancedStore = withPersistence(withLogger(counterStore), 'counter');

function Counter() {
  // Use the store in a React component
  const state = useStore(enhancedStore);

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={() => enhancedStore.set({ count: state.count + 1 })}>
        Increment
      </button>
      <button onClick={() => enhancedStore.set({ count: state.count - 1 })}>
        Decrement
      </button>
    </div>
  );
} 