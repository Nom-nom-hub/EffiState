/**
 * EffiState Middleware System
 * Allows extending store functionality through plugins
 */

// Create logger middleware
export const createLogger = (options = {}) => {
  const {
    collapsed = false,
    predicate = null,
    colors = {
      prevState: '#9E9E9E',
      nextState: '#4CAF50',
      action: '#03A9F4'
    },
    logger = console
  } = options;
  
  return (store) => ({
    beforeUpdate: (newState) => {
      if (predicate && !predicate(store.getAll(), newState)) {
        return newState;
      }
      
      const prevState = store.getAll();
      
      const logStyle = collapsed ? logger.groupCollapsed : logger.group;
      
      // Log update
      logStyle('EffiState Update');
      logger.log('%cPrevious State:', `color: ${colors.prevState}`, prevState);
      logger.log('%cNext State:', `color: ${colors.nextState}`, newState);
      logger.groupEnd();
      
      return newState;
    }
  });
};

// Create validation middleware
export const createValidator = (validators) => {
  return (store) => ({
    beforeUpdate: (newState) => {
      for (const key in validators) {
        if (key in newState) {
          const validator = validators[key];
          const value = newState[key];
          
          if (!validator(value)) {
            console.error(`Validation failed for property "${key}" with value:`, value);
            // Remove invalid property
            delete newState[key];
          }
        }
      }
      
      return newState;
    }
  });
};

// Create offline queue middleware
export const createOfflineQueue = (options = {}) => {
  const {
    isOnline = () => navigator.onLine,
    storage = localStorage,
    key = 'effistate_queue',
    processInterval = 5000
  } = options;
  
  let queue = [];
  let intervalId = null;
  
  // Load queue from storage
  try {
    const savedQueue = storage.getItem(key);
    if (savedQueue) {
      queue = JSON.parse(savedQueue);
    }
  } catch (e) {
    console.error('Failed to load offline queue', e);
  }
  
  // Save queue to storage
  const saveQueue = () => {
    try {
      storage.setItem(key, JSON.stringify(queue));
    } catch (e) {
      console.error('Failed to save offline queue', e);
    }
  };
  
  // Process queue when online
  const processQueue = () => {
    if (isOnline() && queue.length > 0) {
      const actions = [...queue];
      queue = [];
      saveQueue();
      
      // Process all actions
      actions.forEach(action => {
        store.set(action);
      });
    }
  };
  
  // Start processing interval
  intervalId = setInterval(processQueue, processInterval);
  
  return (store) => ({
    beforeUpdate: (newState) => {
      if (!isOnline()) {
        // Add to queue
        queue.push(newState);
        saveQueue();
        return null; // Don't update store when offline
      }
      
      return newState;
    },
    
    dispose: () => {
      clearInterval(intervalId);
    }
  });
}; 