import { useSyncExternalStore } from 'react';
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';

/**
 * React hook for using EffiState stores
 * @param {Object} store - The EffiState store
 * @returns {Object} Current state
 */
export function useStore(store) {
  // Use ref for current state to avoid unnecessary renders
  const stateRef = useRef(store.get());
  const [, forceUpdate] = useState(0);
  
  // This is more efficient than useState for complex state
  useEffect(() => {
    // Only trigger re-render on actual state changes
    const unsubscribe = store.subscribe((newState, oldState) => {
      stateRef.current = newState;
      // Force render without full state comparison
      forceUpdate(count => count + 1);
    });
    
    return unsubscribe;
  }, [store]);
  
  return stateRef.current;
}

/**
 * React hook for using computed values from EffiState stores
 * @param {Object} store - The EffiState store
 * @returns {Object} Current computed values
 */
export function useComputed(store) {
  return useSyncExternalStore(store.subscribe, store.getComputed);
}

/**
 * React hook for using complete state (including computed values) from EffiState stores
 * @param {Object} store - The EffiState store
 * @returns {Object} Complete state with computed values
 */
export function useFullStore(store) {
  return useSyncExternalStore(store.subscribe, store.getAll);
}

/**
 * React hook for using a selector with an EffiState store
 * @param {Object} store - The EffiState store
 * @param {Function} selector - Selector function to pick parts of state
 * @param {Function} equalityFn - Optional equality function
 * @returns {Any} Selected state
 */
export function useSelector(store, selector, equalityFn = (a, b) => a === b) {
  // Memoize selector to maintain reference stability
  const memoizedSelector = useCallback(selector, []);
  
  // Use ref to store previous value for equality comparison
  const prevValueRef = useRef(memoizedSelector(store.get()));
  const [, forceUpdate] = useState(0);
  
  useEffect(() => {
    return store.subscribe((state) => {
      const newValue = memoizedSelector(state);
      if (!equalityFn(prevValueRef.current, newValue)) {
        prevValueRef.current = newValue;
        forceUpdate(c => c + 1);
      }
    });
  }, [store, memoizedSelector, equalityFn]);
  
  return prevValueRef.current;
} 