/**
 * EffiState - Efficient, Minimalist JavaScript State Management Library
 */

/**
 * Creates a new store with the provided initial state
 * @param {Object} initialState - The initial state object
 * @returns {Object} Store interface with get, set, and subscribe methods
 */
function createStore(initialState = {}) {
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
  
  // Pre-allocated change tracking arrays for better performance
  const SMALL_CHANGE_LIMIT = 8;
  new Array(SMALL_CHANGE_LIMIT);
  
  // Function bound at creation time for maximum V8 performance
  const notifyListeners = (newState, oldState) => {
    if (needsListenerRefresh) {
      listenerArray = Array.from(listeners);
      listenerCount = listenerArray.length;
      needsListenerRefresh = false;
    }
    
    // Fast path for common case (1-3 listeners)
    if (listenerCount <= 3) {
      for (let i = 0; i < listenerCount; i++) {
        listenerArray[i](newState, oldState);
      }
      return;
    }
    
    // Use while loop for maximum speed with many listeners
    let i = 0;
    while (i < listenerCount) {
      listenerArray[i++](newState, oldState);
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
  
  // Extremely optimized set function using V8 optimization techniques
  const set = (newState) => {
    // Ultra-fast empty checks
    if (!newState || typeof newState !== 'object') return;
    
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
        notifyListeners(state, oldState);
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
        notifyListeners(state, { [key]: prevValue });
      }
      return;
    }
    
    // Use pooled objects for property tracking to avoid GC
    const changedKeys = [];
    let hasChanges = false;
    for (const key in newState) {
      const newValue = newState[key];
      if (state[key] !== newValue) {
        changedKeys.push(key);
        hasChanges = true;
      }
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
      notifyListeners(state, prevState);
    }
  };
  
  // Ultra-fast subscribe implementation with listener ID caching
  let listenerIdCounter = 0;
  const listenerIds = new Map();
  
  // Cache the 10 most recently called subscribers
  const subscriberCache = new Map();
  const SUBSCRIBER_CACHE_SIZE = 10;
  
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
  const updateArray = (arrayKey, updater) => {
    const array = state[arrayKey];
    if (!array || !Array.isArray(array)) return;
    
    // Optimize memory usage
    const hasListeners = listeners.size > 0;
    
    // Only copy if needed
    let prevArray = null;
    if (hasListeners) {
      // Use fast copy technique for different array sizes
      if (array.length < 1000) {
        prevArray = array.slice(0);
      } else {
        // Faster for very large arrays
        prevArray = Array.from(array);
      }
    }
    
    // Apply updates directly to the array
    updater(array);
    
    // Notify listeners with the minimal info needed
    if (hasListeners) {
      notifyListeners(array, prevArray);
    }
    return array; // Return for chaining
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
      notifyListeners(state, snapshot);
    }
  };
  
  // For computed values
  let computed = {};
  // For tracking which computed values depend on which state properties
  let computedDependencies = {};

  // For state history (initialize lazily)
  let history;
  let historyIndex;
  let historyEnabled = false;

  // Fast references and cached values
  Object.freeze({});

  /**
   * Get the current state
   * @returns {Object} Current state
   */
  const get = () => state;

  /**
   * Get computed values
   * @returns {Object} Computed values
   */
  const getComputed = () => computed;

  /**
   * Get the complete state including computed values
   * @returns {Object} Complete state with computed values
   */
  const getAll = () => ({ ...state, ...computed });

  /**
   * Define a computed value
   * @param {String} key - The name of the computed value
   * @param {Function} fn - The function to compute the value
   */
  const compute = (key, fn) => {
    
    // Initialize computed value
    computed[key] = fn(state, computed);
    
    // Create a proxy to track which state properties this computed value uses
    const trackStateDependencies = () => {
      const tracked = new Set();
      const stateProxy = new Proxy(state, {
        get(target, prop) {
          tracked.add(prop);
          return target[prop];
        }
      });
      
      // Run the function with the proxy to see which properties it accesses
      fn(stateProxy, computed);
      
      // Update dependency tracking
      tracked.forEach(prop => {
        if (!computedDependencies[prop]) {
          computedDependencies[prop] = new Set();
        }
        computedDependencies[prop].add(key);
      });
    };
    
    // Run tracking
    trackStateDependencies();
    
    return { key, fn };
  };

  /**
   * Enable history tracking for undo/redo
   */
  const enableHistory = (limit = 50) => {
    if (!historyEnabled) {
      history = [];
      historyIndex = -1;
      historyEnabled = true;
      
      // Store initial state
      history.push({ ...state });
      historyIndex = 0;
    }
  };

  /**
   * Undo the last state change
   * @returns {Boolean} Whether undo was successful
   */
  const undo = () => {
    if (historyEnabled && historyIndex > 0) {
      historyIndex--;
      
      // Apply the stored changes in reverse
      const historyEntry = history[historyIndex + 1];
      Object.keys(historyEntry).forEach(key => {
        state[key] = historyEntry[key];
      });
      
      // Update computed values after state change
      updateComputed();
      
      listeners.forEach(listener => listener(state));
      return true;
    }
    return false;
  };

  /**
   * Redo a previously undone state change
   * @returns {Boolean} Whether redo was successful
   */
  const redo = () => {
    if (historyEnabled && historyIndex < history.length - 1) {
      historyIndex++;
      
      // Apply the stored changes for this step
      const historyEntry = history[historyIndex];
      Object.keys(historyEntry).forEach(key => {
        state[key] = historyEntry[key];
      });
      
      // Update computed values after state change
      updateComputed();
      
      listeners.forEach(listener => listener(state));
      return true;
    }
    return false;
  };

  // Ultra-fast replacement for entire objects or arrays
  const replace = (key, newValue) => {
    if (state[key] === newValue) return;
    const oldValue = state[key];
    state[key] = newValue;
    
    // Notify with minimal object creation
    if (listeners.size > 0) {
      notifyListeners(state, { [key]: oldValue });
    }
  };

  // Create a lite version with just the essentials for max performance
  const createLiteVersion = () => {
    // Strip out history, computed values, devtools, etc.
    return {
      get,
      set,
      subscribe,
      bulkUpdate,
      updateArray,
      replace
    };
  };

  // Return the public API
  return {
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
    createLiteVersion
  };
}

/**
 * Logger middleware that logs state changes
 * @param {Object} store - The store to enhance with logging
 * @returns {Object} Enhanced store with logging
 */
function withLogger(store) {
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
function withPersistence(store, key) {
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
function withDevTools(store, options = {}) {
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
 * Create a selector function for efficient component updates
 * @param {Object} store - The store to select from
 * @param {Function} selectorFn - Function to select part of state
 * @param {Function} equalityFn - Optional equality function
 * @returns {Function} Selector hook
 */
function createSelector(store, selectorFn, equalityFn = (a, b) => a === b) {
  let currentValue = selectorFn(store.get());
  let hasInitialized = false;
  let isSubscribed = false;
  
  // Lazy subscription pattern
  const ensureSubscribed = () => {
    if (!isSubscribed) {
      store.subscribe((state) => {
        const newValue = selectorFn(state);
        // Only update if value changed according to equality function
        if (!hasInitialized || !equalityFn(currentValue, newValue)) {
          currentValue = newValue;
          hasInitialized = true;
        }
      });
      isSubscribed = true;
    }
  };
  
  // Return a function that always returns the latest value
  return () => {
    ensureSubscribed();
    return currentValue;
  };
}

/**
 * Server synchronization middleware
 * @param {Object} store - The store to enhance with server sync
 * @param {Object} options - Sync options
 * @returns {Object} Enhanced store with server sync
 */
function withServerSync(store, options) {
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

export { createSelector, createStore, withDevTools, withLogger, withPersistence, withServerSync };
