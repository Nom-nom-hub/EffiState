import { createStore, withDevTools } from '../src/effistate';

const store = withDevTools(createStore({ count: 0 }), {
  name: 'Counter Example'
});

// Perform some state changes
store.set({ count: 1 });
store.set({ count: 2 });

// Check that Redux DevTools shows the actions and state changes 