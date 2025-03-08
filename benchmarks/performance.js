const { createStore } = require('../dist/effistate.min.js');
const { create } = require('zustand');
const { createStore: createReduxStore } = require('redux');

// Setup test data
const ITERATIONS = 100000;

// Add memory usage tracking
console.log('Initial memory usage:', Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100, 'MB');

// Add subscription performance test
console.log('\n=== Basic State Updates ===');
console.log(`Running ${ITERATIONS} iterations for each library`);

// EffiState benchmark
console.time('EffiState');
const effiStore = createStore({ count: 0 });
for (let i = 0; i < ITERATIONS; i++) {
  effiStore.set({ count: i });
}
console.timeEnd('EffiState');

// Zustand benchmark
console.time('Zustand');
const zustandStore = create(set => ({
  count: 0,
  setCount: (count) => set({ count })
}));
for (let i = 0; i < ITERATIONS; i++) {
  zustandStore.getState().setCount(i);
}
console.timeEnd('Zustand');

// Redux benchmark
console.time('Redux');
const reduxStore = createReduxStore(
  (state = { count: 0 }, action) => {
    if (action.type === 'SET_COUNT') {
      return { ...state, count: action.payload };
    }
    return state;
  }
);
for (let i = 0; i < ITERATIONS; i++) {
  reduxStore.dispatch({ type: 'SET_COUNT', payload: i });
}
console.timeEnd('Redux');

// Add subscriber count test
console.log('\n=== Subscription Performance ===');
// EffiState with subscribers
console.time('EffiState with 100 subscribers');
const storeWithSubs = createStore({ value: 0 });
for (let i = 0; i < 100; i++) {
  storeWithSubs.subscribe(() => {});
}
for (let i = 0; i < 1000; i++) {
  storeWithSubs.set({ value: i });
}
console.timeEnd('EffiState with 100 subscribers');

// Zustand with subscribers
console.time('Zustand with 100 subscribers');
const zustandWithSubs = create(set => ({
  value: 0,
  setValue: (value) => set({ value })
}));
for (let i = 0; i < 100; i++) {
  zustandWithSubs.subscribe(() => {});
}
for (let i = 0; i < 1000; i++) {
  zustandWithSubs.getState().setValue(i);
}
console.timeEnd('Zustand with 100 subscribers');

// Redux with subscribers
console.time('Redux with 100 subscribers');
const reduxWithSubs = createReduxStore(
  (state = { value: 0 }, action) => {
    if (action.type === 'SET_VALUE') {
      return { ...state, value: action.payload };
    }
    return state;
  }
);
for (let i = 0; i < 100; i++) {
  reduxWithSubs.subscribe(() => {});
}
for (let i = 0; i < 1000; i++) {
  reduxWithSubs.dispatch({ type: 'SET_VALUE', payload: i });
}
console.timeEnd('Redux with 100 subscribers');

// Add bulk update benchmark
console.log('\n=== Bulk Update Performance ===');

// EffiState bulk update
console.time('EffiState bulk update');
const effiBulkStore = createStore({ items: Array(1000).fill(0) });
effiBulkStore.bulkUpdate(state => {
  for (let i = 0; i < 1000; i++) {
    state.items[i] = i;
  }
});
console.timeEnd('EffiState bulk update');

// Zustand update - has to use multiple individual updates or spreads
console.time('Zustand bulk update');
const zustandBulkStore = create(set => ({
  items: Array(1000).fill(0),
  setItems: (items) => set({ items })
}));
// Have to clone the array for Zustand
const newItems = [...zustandBulkStore.getState().items];
for (let i = 0; i < 1000; i++) {
  newItems[i] = i;
}
zustandBulkStore.getState().setItems(newItems);
console.timeEnd('Zustand bulk update');

// Redux update - has to use immutable updates
console.time('Redux bulk update');
const reduxBulkStore = createReduxStore(
  (state = { items: Array(1000).fill(0) }, action) => {
    if (action.type === 'UPDATE_ITEMS') {
      return { ...state, items: action.payload };
    }
    return state;
  }
);
reduxBulkStore.dispatch({ 
  type: 'UPDATE_ITEMS', 
  payload: Array(1000).fill(0).map((_, i) => i) 
});
console.timeEnd('Redux bulk update');

console.log('\n=== Array Update Performance ===');
// EffiState specialized array update
console.time('EffiState array update');
const effiArrayStore = createStore({ items: Array(10000).fill(0) });
effiArrayStore.updateArray('items', (items) => {
  for (let i = 0; i < items.length; i++) {
    items[i] = i * 2;
  }
});
console.timeEnd('EffiState array update');

// Zustand array update
console.time('Zustand array update');
const zustandArrayStore = create(set => ({
  items: Array(10000).fill(0),
  updateItems: (updater) => {
    const items = [...zustandArrayStore.getState().items];
    updater(items);
    set({ items });
  }
}));
zustandArrayStore.getState().updateItems(items => {
  for (let i = 0; i < items.length; i++) {
    items[i] = i * 2;
  }
});
console.timeEnd('Zustand array update');

// Redux array update
console.time('Redux array update');
const reduxArrayStore = createReduxStore(
  (state = { items: Array(10000).fill(0) }, action) => {
    if (action.type === 'UPDATE_ITEMS') {
      const newItems = [...state.items];
      action.updater(newItems);
      return { ...state, items: newItems };
    }
    return state;
  }
);
reduxArrayStore.dispatch({ 
  type: 'UPDATE_ITEMS', 
  updater: (items) => {
    for (let i = 0; i < items.length; i++) {
      items[i] = i * 2;
    }
  }
});
console.timeEnd('Redux array update');

console.log('Final memory usage:', Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100, 'MB'); 