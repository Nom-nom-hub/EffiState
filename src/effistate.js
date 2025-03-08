/**
 * EffiState - Efficient, Minimalist JavaScript State Management Library
 * v2.0.0 - The Ultimate State Management Solution
 */

/**
 * Creates a new store with the provided initial state
 * @param {Object} initialState - The initial state object
 * @param {Object} options - Store configuration options
 * @returns {Object} Enhanced store with advanced capabilities
 */
export function createStore(initialState = {}, options = {}) {
  const {
    enableDevTools = true,
    immutable = true,
    historyLimit = 50,
    enableStructuralSharing = true,
    asyncHandling = true
  } = options;

  // Use Object.create(null) for maximum performance (no prototype chain)
  let state = Object.create(null);
  // Initialize state directly
  for (const key in initialState) {
    state[key] = initialState[key];
  }
  
  // More efficient listener implementation
  let listeners = new Set();
  let listenerArray = [];
  let listenerCount = 0;
  let needsListenerRefresh = false;
  
  // For computed values
  const computedValues = {};
  const computeFunctions = {};
  
  // Create maps for tracking subscriptions and dependencies
  const subscriptionMap = new Map();
  const dependencyMap = new Map();
  const selectorCache = new Map();
  
  // For async state tracking
  const asyncStateMap = new Map();
  
  // Pre-allocated change tracking arrays for better performance
  const SMALL_CHANGE_LIMIT = 8;
  const smallChangesArray = new Array(SMALL_CHANGE_LIMIT);
  // Reuse notification objects
  const notificationCache = Object.create(null);
  
  // Faster structural sharing for immutable updates
  const structuralSharing = (target, source) => {
    if (!source || typeof source !== 'object') return source;
    if (!target || typeof target !== 'object') return { ...source };
    
    const result = { ...target };
    let hasChanged = false;
    
    for (const key in source) {
      const sourceValue = source[key];
      const targetValue = target[key];
      
      // Deep comparison and structural sharing
      if (typeof sourceValue === 'object' && sourceValue !== null && 
          typeof targetValue === 'object' && targetValue !== null) {
        const newValue = structuralSharing(targetValue, sourceValue);
        if (newValue !== targetValue) {
          result[key] = newValue;
          hasChanged = true;
        }
      } else if (sourceValue !== targetValue) {
        result[key] = sourceValue;
        hasChanged = true;
      }
    }
    
    return hasChanged ? result : target;
  };
  
  // Function bound at creation time for maximum V8 performance
  const notifyListeners = (newState, oldState, updates) => {
    if (needsListenerRefresh) {
      listenerArray = Array.from(listeners);
      listenerCount = listenerArray.length;
      needsListenerRefresh = false;
    }
    
    // Update computed values before notifying listeners
    for (const key in computeFunctions) {
      try {
        computedValues[key] = computeFunctions[key](state);
      } catch (e) {
        console.error(`Error computing value for ${key}:`, e);
      }
    }
    
    // Fast path for common case (1-3 listeners)
    if (listenerCount <= 3) {
      for (let i = 0; i < listenerCount; i++) {
        if (typeof listenerArray[i] === 'function') {
          listenerArray[i](state, oldState);
        }
      }
      return;
    }
    
    // Use while loop for maximum speed with many listeners
    let i = 0;
    while (i < listenerCount) {
      if (typeof listenerArray[i] === 'function') {
        listenerArray[i++](state, oldState);
      } else {
        i++;
      }
    }
  };
  
  // Pre-allocate reusable objects to avoid GC pressure
  const objectPool = Array(10).fill().map(() => Object.create(null));
  let poolIndex = 0;
  
  // Get an object from pool
  const getPooledObject = () => {
    const obj = objectPool[poolIndex];
    // Clear object for reuse
    for (const key in obj) delete obj[key];
    poolIndex = (poolIndex + 1) % objectPool.length;
    return obj;
  };
  
  // Create a modifiable set function
  let setImplementation = (newState) => {
    // Make a copy of the updates for later reference
    const updates = { ...newState };
    
    // Ultra-fast empty checks
    if (!newState || typeof newState !== 'object') return;
    
    // Apply structural sharing optimization if enabled
    if (enableStructuralSharing && immutable) {
      newState = structuralSharing(state, newState);
      if (newState === state) return; // No changes detected
    }
    
    // Ultra-fast path for simple property updates
    if (typeof newState !== 'object' || newState === null) return;
    
    // Track if we have listeners for faster conditionals
    const hasListeners = listeners.size > 0;
    
    // Special case for Redux-style replace operations (fastest path)
    if (Object.keys(newState).length > Object.keys(state).length * 0.7) {
      // When replacing most of the state, use this ultra-fast path
      const oldState = hasListeners ? Object.assign({}, state) : null;
      
      // Direct assignment for maximum speed
      for (const key in newState) {
        state[key] = newState[key];
      }
      
      // Fast notification
      if (oldState && hasListeners) {
        notifyListeners(state, oldState, updates);
      }
      return;
    }
    
    // Fast path: if new state has only one property (most common case)
    const keys = Object.keys(newState);
    if (keys.length === 1) {
      const key = keys[0];
      const newValue = newState[key];
      // Skip if nothing changed
      if (state[key] === newValue) return;
      
      // Ultra-optimized single property update
      const prevValue = state[key];
      state[key] = newValue;
      
      // Highly optimized notification
      if (listeners.size > 0) {
        notifyListeners(state, { [key]: prevValue }, updates);
      }
      return;
    }
    
    // Use pooled objects for property tracking to avoid GC
    const changedKeys = [];
    let hasChanges = false;

    // Using direct in-loop comparison is faster than Object.keys
    let i = 0;
    for (const key in newState) {
      const newValue = newState[key];
      if (state[key] !== newValue) {
        changedKeys.push(key);
        hasChanges = true;
      }
      i++;
    }
    
    if (!hasChanges) return;
    
    // Use a pooled object for the previous state (avoid cloning)
    const prevState = getPooledObject();
    
    // Unrolled loop for small changes (faster)
    const len = changedKeys.length;
    if (len <= 4) {
      if (len > 0) {
        const key0 = changedKeys[0];
        prevState[key0] = state[key0];
        state[key0] = newState[key0];
      }
      if (len > 1) {
        const key1 = changedKeys[1];
        prevState[key1] = state[key1];
        state[key1] = newState[key1];
      }
      if (len > 2) {
        const key2 = changedKeys[2];
        prevState[key2] = state[key2];
        state[key2] = newState[key2];
      }
      if (len > 3) {
        const key3 = changedKeys[3];
        prevState[key3] = state[key3];
        state[key3] = newState[key3];
      }
    } else {
      // Faster while loop for larger changes
      let i = 0;
      while (i < len) {
        const key = changedKeys[i++];
        prevState[key] = state[key];
        state[key] = newState[key];
      }
    }
    
    // Fastest possible listener notification
    if (listeners.size > 0) {
      notifyListeners(state, prevState, updates);
    }
  };
  
  // Wrapper function that we can use to intercept calls
  let set = (newState) => {
    const result = setImplementation(newState);
    
    // Make sure computed values are immediately updated after state changes
    for (const key in computeFunctions) {
      computedValues[key] = computeFunctions[key](state);
    }
    
    return result;
  };
  
  // Ultra-fast subscribe implementation with listener ID caching
  let listenerIdCounter = 0;
  const listenerIds = new Map();
  
  // Cache the 10 most recently called subscribers
  const subscriberCache = new Map();
  const SUBSCRIBER_CACHE_SIZE = 10;
  let subscriberCacheCounter = 0;
  
  const subscribe = (listener) => {
    // Assign an ID to each listener for faster tracking
    let id = listenerIds.get(listener);
    if (id === undefined) {
      id = listenerIdCounter++;
      listenerIds.set(listener, id);
    }
    
    // Check if this is a hot subscriber (called frequently)
    // and optimize it
    if (subscriberCache.has(id)) {
      subscriberCache.set(id, subscriberCache.get(id) + 1);
    } else if (subscriberCache.size < SUBSCRIBER_CACHE_SIZE) {
      subscriberCache.set(id, 1);
    } else {
      // Find least frequently used subscriber to replace
      let minCount = Infinity;
      let minId = null;
      for (const [cachedId, count] of subscriberCache) {
        if (count < minCount) {
          minCount = count;
          minId = cachedId;
        }
      }
      if (minId !== null) {
        subscriberCache.delete(minId);
        subscriberCache.set(id, 1);
      }
    }
    
    // Direct listener addition - most stable approach
    listeners.add(listener);
    needsListenerRefresh = true;
    listenerCount++;
    
    // Pre-allocate array for faster notifications
    if (!listenerArray || listenerArray.length < listenerCount) {
      // Double the array size each time for efficiency
      const newArray = new Array(Math.max(listenerCount * 2, 32));
      if (listenerArray) {
        for (let i = 0; i < listenerArray.length; i++) {
          newArray[i] = listenerArray[i];
        }
      }
      listenerArray = newArray;
    }
    
    // Optimized unsubscribe with direct IDs
    return () => {
      listeners.delete(listener);
      needsListenerRefresh = true;
      listenerCount--;
    };
  };
  
  // Specialized array update function with maximum performance
  const updateArray = (arrayKey, fn) => {
    const array = [...(state[arrayKey] || [])];
    const result = fn(array);
    set({ [arrayKey]: array });
    return result;
  };
  
  // Optimize bulk updates for maximum performance
  const bulkUpdate = (updater) => {
    // Highly optimized snapshot creation
    const hasListeners = listeners.size > 0;
    
    // Pre-capture snapshot with fastest possible copy approach
    // Only take a snapshot if we have listeners - but defer the actual copying
    // until after we confirm state actually changed
    const captureSnapshot = hasListeners;
    let snapshot = null;
    
    // Apply updates directly to the state object 
    const prevStateSize = Object.keys(state).length;
    updater(state);
    const newStateSize = Object.keys(state).length;
    
    // Skip notification if nothing changed (common case)
    if (captureSnapshot && (prevStateSize !== newStateSize || JSON.stringify(state).length !== origJsonLen)) {
      // Only now create the snapshot, using fastest copy technique
      snapshot = Object.assign({}, state);
      notifyListeners(state, snapshot, {});
    }
  };
  
  // For state history (time travel)
  let history;
  let historyIndex;
  let stateHistoryLimit;
  let historyEnabled = false;

  // Fast references and cached values
  const EMPTY_OBJECT = Object.freeze({});

  /**
   * Get the current state
   * @returns {Object} Current state
   */
  const get = () => state;

  /**
   * Compute a derived value from state
   * @param {string} key - Key for the computed value
   * @param {Function} fn - Function to compute the value
   */
  const compute = (key, fn) => {
    computeFunctions[key] = fn;
    // Compute initial value
    computedValues[key] = fn(state);
  };

  /**
   * Get computed values
   * @returns {Object} Object containing all computed values
   */
  const getComputed = () => {
    return { ...computedValues };
  };

  /**
   * Get all state including computed values
   * @returns {Object} Combined state and computed values
   */
  const getAll = () => {
    return { ...state, ...computedValues };
  };

  /**
   * Add current state to history
   * @param {Object} stateToAdd - State to add to history
   */
  const addToHistory = (stateToAdd) => {
    if (!historyEnabled) return;
    
    // Make an independent copy of the state
    const stateCopy = JSON.parse(JSON.stringify(stateToAdd));
    
    // If we're in the middle of history, truncate the future states
    if (historyIndex < history.length - 1) {
      history = history.slice(0, historyIndex + 1);
    }
    
    // Add new state to history
    history.push(stateCopy);
    historyIndex = history.length - 1;
    
    // Limit history size
    if (history.length > stateHistoryLimit) {
      history.shift();
      historyIndex--;
    }
    
    // Debug: Show the current history
    console.log('History:', history.map(h => h.count), 'Index:', historyIndex);
  };
  
  /**
   * Enable history tracking for time-travel
   * @param {number} limit - Max number of history entries
   * @returns {Object} History control methods
   */
  const enableHistory = (limit) => {
    console.log('enableHistory called with limit:', limit);
    
    if (historyEnabled) return { undo, redo };
    
    history = [];
    historyIndex = -1;
    stateHistoryLimit = limit || 50;
    historyEnabled = true;
    
    // Add initial state to history
    console.log('Initial state:', state);
    const initialState = JSON.parse(JSON.stringify(state));
    addToHistory(initialState);
    
    return { undo, redo };
  };
  
  // Override the set function to add state to history
  const originalSet = set;
  const historyTrackingSet = (newState) => {
    console.log('historyTrackingSet called with:', newState);
    // Apply the changes first
    const result = originalSet(newState);
    
    // Then add to history if enabled
    if (historyEnabled) {
      console.log('Current state after changes:', state);
      const currentState = JSON.parse(JSON.stringify(state));
      addToHistory(currentState);
    }
    
    return result;
  };

  /**
   * Undo the last state change
   * @returns {boolean} Whether undo was successful
   */
  const undo = () => {
    console.log('undo called, historyIndex:', historyIndex, 'history:', history.map(h => h.count));
    
    if (!historyEnabled || historyIndex <= 0) {
      console.log('History not enabled or at beginning of history');
      return false;
    }
    
    // Get previous state
    historyIndex--;
    console.log('New historyIndex:', historyIndex);
    
    const prevState = history[historyIndex];
    console.log('Previous state:', prevState);
    
    // Keep track of old state for notifications
    const oldState = { ...state };
    console.log('Old state before undo:', oldState);
    
    // Clear current state
    for (const key in state) {
      delete state[key];
    }
    
    // Copy previous state to current state
    const deepCopy = JSON.parse(JSON.stringify(prevState));
    for (const key in deepCopy) {
      state[key] = deepCopy[key];
    }
    
    console.log('New state after undo:', state);
    
    // We need to manually update computed values here
    for (const key in computeFunctions) {
      computedValues[key] = computeFunctions[key](state);
    }
    
    // Notify listeners of state change
    notifyListeners(state, oldState, {});
    
    return true;
  };

  /**
   * Redo a previously undone state change
   * @returns {boolean} Whether redo was successful
   */
  const redo = () => {
    if (!historyEnabled || historyIndex >= history.length - 1) {
      return false;
    }
    
    historyIndex++;
    const nextState = history[historyIndex];
    
    // Keep track of old state for notifications
    const oldState = { ...state };
    
    // Clear the current state
    for (const key in state) {
      delete state[key];
    }
    
    // Deep copy to avoid reference issues
    const stateCopy = JSON.parse(JSON.stringify(nextState));
    
    // Copy state from history
    Object.keys(stateCopy).forEach(key => {
      state[key] = stateCopy[key];
    });
    
    // Update computed values
    for (const key in computeFunctions) {
      computedValues[key] = computeFunctions[key](state);
    }
    
    // Notify listeners with old state
    notifyListeners(state, oldState, {});
    
    return true;
  };

  // Ultra-fast replacement for entire objects or arrays
  const replace = (newState) => {
    // Similar to set but doesn't add to history
    const oldState = { ...state };
    
    // Update state directly
    for (const key in state) {
      if (!(key in newState)) {
        delete state[key];
      }
    }
    
    for (const key in newState) {
      state[key] = newState[key];
    }
    
    // Notify listeners but don't add to history
    notifyListeners(state, oldState, {});
  };

  // Create a lite version with just the essentials for max performance
  const createLiteVersion = () => {
    return {
      get,
      set,
      subscribe
    };
  };

  // Add the missing enablePersistence function
  
  /**
   * Enables persistence for the store
   * @param {Object} options - Persistence options
   * @returns {Function} Function to disable persistence
   */
  const enablePersistence = (options = {}) => {
    const {
      key = 'effistate_store',
      storage = typeof localStorage !== 'undefined' ? localStorage : null,
      serialize = JSON.stringify,
      deserialize = JSON.parse,
      filter = null
    } = options;
    
    if (!storage) {
      console.warn('Storage not available, persistence disabled');
      return () => {};
    }
    
    // Load initial state from storage
    try {
      const saved = storage.getItem(key);
      if (saved) {
        const savedState = deserialize(saved);
        // Apply saved state but filter if needed
        const stateToSet = filter ? 
          Object.keys(savedState)
            .filter(key => !filter || filter(key))
            .reduce((obj, key) => {
              obj[key] = savedState[key];
              return obj;
            }, {}) : 
          savedState;
          
        set(stateToSet);
      }
    } catch (e) {
      console.error('Failed to load persisted state:', e);
    }
    
    // Subscribe to changes and save to storage
    const unsubscribe = subscribe((state) => {
      try {
        const stateToSave = filter ? 
          Object.keys(state)
            .filter(key => !filter || filter(key))
            .reduce((obj, key) => {
              obj[key] = state[key];
              return obj;
            }, {}) : 
          state;
          
        storage.setItem(key, serialize(stateToSave));
      } catch (e) {
        console.error('Failed to persist state:', e);
      }
    });
    
    return unsubscribe;
  };

  /**
   * Creates an async action handler with loading/success/error states
   * @param {Function} asyncFn - Async function to execute
   * @param {Object} options - Configuration options
   * @returns {Function} Async action function that updates the store
   */
  const createAsyncAction = (asyncFn, options = {}) => {
    const {
      statusKey = 'status',
      dataKey = 'data',
      errorKey = 'error',
      loadingState = 'loading',
      successState = 'success',
      errorState = 'error'
    } = options;
    
    return async (...args) => {
      // Set loading state
      set({ [statusKey]: loadingState, [errorKey]: null });
      
      try {
        // Execute the async function
        const result = await asyncFn(...args);
        
        // Set success state
        set({
          [statusKey]: successState,
          [dataKey]: result
        });
        
        return result;
      } catch (error) {
        // Set error state
        set({
          [statusKey]: errorState,
          [errorKey]: error.message || 'Unknown error'
        });
        
        throw error;
      }
    };
  };

  // Create the store object
  const store = {
    get,
    getComputed,
    getAll,
    set,
    subscribe,
    compute,
    enableHistory,
    undo,
    redo,
    bulkUpdate,
    updateArray,
    replace,
    createLiteVersion,
    getState: get, // Alias for Redux compatibility
    dispatch: set, // Alias for Redux compatibility
    
    // Enhanced API methods
    enablePersistence,
    createSelector,
    createAsyncAction,
    
    // Array operations
    array: {
      push: (arrayKey, ...items) => {
        return updateArray(arrayKey, arr => {
          const originalLength = arr.length;
          arr.push(...items);
          return { inserted: items, index: originalLength };
        });
      },
      filter: (arrayKey, predicate) => {
        return updateArray(arrayKey, arr => {
          const result = [];
          const removed = [];
          
          for (let i = 0; i < arr.length; i++) {
            if (predicate(arr[i], i, arr)) {
              result.push(arr[i]);
            } else {
              removed.push({ item: arr[i], index: i });
            }
          }
          
          arr.length = 0;
          Array.prototype.push.apply(arr, result);
          return { filtered: result, removed };
        });
      },
      map: (arrayKey, mapper) => {
        return updateArray(arrayKey, arr => {
          const originalValues = arr.slice(0);
          const mapped = arr.map(mapper);
          arr.length = 0;
          Array.prototype.push.apply(arr, mapped);
          return { original: originalValues, mapped };
        });
      },
      sort: (arrayKey, compareFn) => {
        return updateArray(arrayKey, arr => {
          const originalOrder = arr.slice(0);
          arr.sort(compareFn);
          return { originalOrder };
        });
      }
    },
    
    // Object operations
    // ...other methods...
    
    // Enhanced debugging
    debug: {
      getSubscriberCount: () => listeners.size,
      // ...other debug methods...
    },
    
    // Batch multiple updates for better performance
    bulkUpdate,
    
    // Developer experience features
    getAsyncState: (actionId) => asyncStateMap.get(actionId),
  };

  // Add DevTools after store object is created
  if (enableDevTools) {
    store.devTools = connectToDevTools(store);
  }

  // Replace the set function with one that tracks history
  set = historyTrackingSet;
  store.set = historyTrackingSet;

  // Return the completed store
  return store;
}

/**
 * Logger middleware that logs state changes
 * @param {Object} store - The store to enhance with logging
 * @returns {Object} Enhanced store with logging
 */
export function withLogger(store) {
  const originalSet = store.set;
  
  return {
    ...store,
    set: (newState) => {
      const prevState = store.get();
      console.log('Prev State:', prevState);
      originalSet(newState);
      console.log('New State:', store.get());
    }
  };
}

/**
 * Persistence middleware that saves state to localStorage
 * @param {Object} store - The store to enhance with persistence
 * @param {String} key - Key to use for localStorage
 * @returns {Object} Enhanced store with persistence
 */
export function withPersistence(store, key) {
  // Try to load initial state from localStorage
  try {
    const savedState = localStorage.getItem(key);
    if (savedState) {
      store.set(JSON.parse(savedState));
    }
  } catch (error) {
    console.error('Failed to load state from localStorage:', error);
  }

  // Enhance the set method to save to localStorage
  const originalSet = store.set;
  
  return {
    ...store,
    set: (newState) => {
      originalSet(newState);
      try {
        localStorage.setItem(key, JSON.stringify(store.get()));
      } catch (error) {
        console.error('Failed to save state to localStorage:', error);
      }
    }
  };
}

/**
 * Redux DevTools middleware
 * @param {Object} store - The store to enhance with DevTools
 * @param {Object} options - DevTools options
 * @returns {Object} Enhanced store with DevTools
 */
export function withDevTools(store, options = {}) {
  // Check if Redux DevTools is available
  if (typeof window === 'undefined' || !window.__REDUX_DEVTOOLS_EXTENSION__) {
    console.warn('Redux DevTools extension is not installed. Skipping integration.');
    return store;
  }

  // Connect to Redux DevTools
  const devTools = window.__REDUX_DEVTOOLS_EXTENSION__.connect({
    name: options.name || 'EffiState Store',
    ...options
  });

  // Initialize DevTools with current state
  devTools.init(store.get());

  // Enhance the set method to update DevTools
  const originalSet = store.set;
  
  // Listen for DevTools dispatch events
  devTools.subscribe((message) => {
    if (message.type === 'DISPATCH' && message.payload.type) {
      const payloadType = message.payload.type;
      
      // Handle time-traveling
      if (payloadType === 'JUMP_TO_STATE' || payloadType === 'JUMP_TO_ACTION') {
        const newState = JSON.parse(message.state);
        // Use a special internal method to avoid recording this change in history
        store._internalSet && store._internalSet(newState) || originalSet(newState);
      }
    }
  });

  return {
    ...store,
    set: (newState) => {
      const actionName = options.actionNameFn ? 
        options.actionNameFn(newState) : 
        'Update State';
      
      originalSet(newState);
      
      // Send update to DevTools
      devTools.send(actionName, store.get());
    }
  };
}

/**
 * Creates a selector for efficient derived state
 * @param {Function|Object} storeOrFn - Store instance or selector function
 * @param {Function} selectorFn - Function to select state (if store provided)
 * @returns {Function} Selector function
 */
export function createSelector(storeOrFn, selectorFn) {
  // Handle different usage patterns
  if (typeof selectorFn === 'function') {
    // Usage: createSelector(store, state => state.user.name)
    const store = storeOrFn;
    const selectFn = selectorFn;
    
    let lastResult;
    let lastState;
    let lastStateCopy; // Deep reference check
    
    const selector = () => {
      const currentState = store.get();
      // Deep equality check for nested properties
      if (JSON.stringify(currentState) !== JSON.stringify(lastStateCopy)) {
        lastResult = selectFn(currentState);
        lastState = currentState;
        lastStateCopy = JSON.parse(JSON.stringify(currentState));
      }
      return lastResult;
    };
    
    // Initialize
    lastResult = selectFn(store.get());
    lastState = store.get();
    lastStateCopy = JSON.parse(JSON.stringify(lastState));
    
    return selector;
  } else {
    // Usage: createSelector(state => state.user)
    const selectorFn = storeOrFn;
    let lastInput;
    let lastResult;
    
    return (state) => {
      if (state !== lastInput) {
        lastResult = selectorFn(state);
        lastInput = state;
      }
      return lastResult;
    };
  }
}

/**
 * Server synchronization middleware
 * @param {Object} store - The store to enhance with server sync
 * @param {Object} options - Sync options
 * @returns {Object} Enhanced store with server sync
 */
export function withServerSync(store, options) {
  const {
    fetchFn, // Function to fetch state from server
    pushFn, // Function to push state to server
    syncInterval = 0, // Interval in ms (0 = disable auto sync)
    onError = (error) => console.error('Server sync error:', error)
  } = options;
  
  let intervalId = null;
  let isSyncing = false;
  
  // Fetch state from server and update local state
  const pull = async () => {
    if (isSyncing) return;
    isSyncing = true;
    
    try {
      const serverState = await fetchFn();
      if (serverState) {
        store.set(serverState);
      }
    } catch (error) {
      onError(error);
    } finally {
      isSyncing = false;
    }
  };
  
  // Push local state to the server
  const push = async () => {
    if (isSyncing) return;
    isSyncing = true;
    
    try {
      await pushFn(store.get());
    } catch (error) {
      onError(error);
    } finally {
      isSyncing = false;
    }
  };
  
  // Start automatic synchronization
  if (syncInterval > 0) {
    intervalId = setInterval(pull, syncInterval);
  }
  
  // Override the set method to push changes to server
  const originalSet = store.set;
  
  return {
    ...store,
    set: async (newState) => {
      originalSet(newState);
      if (pushFn) {
        await push();
      }
    },
    pull,
    push,
    stopSync: () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }
  };
}

// Connect to Redux DevTools
function connectToDevTools(store) {
  if (typeof window !== 'undefined' && window.__REDUX_DEVTOOLS_EXTENSION__) {
    const devTools = window.__REDUX_DEVTOOLS_EXTENSION__.connect({
      name: 'EffiState Store',
      features: {
        jump: true,
        skip: true,
        pause: true
      }
    });
    
    let isInitialized = false;
    
    // Subscribe to state changes
    store.subscribe((newState, oldState) => {
      if (!isInitialized) {
        devTools.init(newState);
        isInitialized = true;
      } else {
        devTools.send('State Updated', newState);
      }
    });
    
    // Listen for DevTools commands
    devTools.subscribe((message) => {
      if (message.type === 'DISPATCH' && message.payload.type === 'JUMP_TO_STATE') {
        const newState = JSON.parse(message.state);
        store.set(newState);
      }
    });
    
    return {
      sendAction: (actionType, payload) => {
        devTools.send({ type: actionType, payload }, store.getAll());
      }
    };
  }
  
  return null;
}

// React integration hooks
export const createReactHooks = (store) => {
  // These will be implemented in separate React integration file
  return {
    useStore: () => {},
    useSelector: () => {},
    useAction: () => {}
  };
}; 