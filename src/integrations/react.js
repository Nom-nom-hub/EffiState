import { useEffect, useState, useRef, useMemo, useCallback } from 'react';

/**
 * React hooks for EffiState
 * @param {Object} store - EffiState store instance
 * @returns {Object} React hooks for the store
 */
export function createReactHooks(store) {
  // Use the whole store
  const useStore = () => {
    const [state, setState] = useState(store.getAll());
    
    useEffect(() => {
      return store.subscribe((newState) => {
        setState(newState);
      });
    }, []);
    
    return [state, store.set];
  };
  
  // Select a portion of the store with dependency tracking
  const useSelector = (selector, deps = []) => {
    // Create memoized selector function
    const memoizedSelector = useMemo(() => {
      return typeof selector === 'function' 
        ? store.createSelector(selector, deps)
        : () => store.get()[selector];
    }, [selector, ...deps]);
    
    // Get initial value
    const [selectedValue, setSelectedValue] = useState(memoizedSelector());
    
    // Subscribe to changes
    useEffect(() => {
      const unsubscribe = store.subscribe(() => {
        const newValue = memoizedSelector();
        setSelectedValue(newValue);
      });
      
      return unsubscribe;
    }, [memoizedSelector]);
    
    return selectedValue;
  };
  
  // Create bound actions
  const useAction = (actionCreator) => {
    const actionRef = useRef(actionCreator);
    
    // Update ref if action creator changes
    useEffect(() => {
      actionRef.current = actionCreator;
    }, [actionCreator]);
    
    // Create stable action bound to the store
    const boundAction = useCallback(
      (...args) => actionRef.current(store, ...args),
      [store]
    );
    
    return boundAction;
  };
  
  // Handle async actions with loading states
  const useAsyncAction = (asyncAction) => {
    const [state, setState] = useState({
      status: 'idle',
      error: null,
      data: null
    });
    
    // Create memoized action with loading state
    const boundAction = useCallback(
      async (...args) => {
        setState(prev => ({ ...prev, status: 'loading' }));
        try {
          const result = await asyncAction(...args);
          setState({ status: 'success', data: result, error: null });
          return result;
        } catch (error) {
          setState({ status: 'error', error, data: null });
          throw error;
        }
      },
      [asyncAction]
    );
    
    return [boundAction, state];
  };
  
  // Access and react to state history
  const useHistory = () => {
    const [historyState, setHistoryState] = useState({
      canUndo: false,
      canRedo: false,
      current: 0,
      total: 0
    });
    
    // Enable history if not already enabled
    const historyAPI = useMemo(() => {
      return store.enableHistory();
    }, []);
    
    // Update history state
    const updateHistoryState = useCallback(() => {
      const history = historyAPI.getHistory();
      const currentIndex = historyAPI.getCurrentIndex();
      
      setHistoryState({
        canUndo: currentIndex > 0,
        canRedo: currentIndex < history.length - 1,
        current: currentIndex,
        total: history.length
      });
    }, [historyAPI]);
    
    // Initial update
    useEffect(() => {
      updateHistoryState();
      
      // Subscribe to state changes to update history state
      const unsubscribe = store.subscribe(() => {
        updateHistoryState();
      });
      
      return unsubscribe;
    }, [updateHistoryState]);
    
    return {
      ...historyState,
      undo: () => {
        const result = historyAPI.undo();
        updateHistoryState();
        return result;
      },
      redo: () => {
        const result = historyAPI.redo();
        updateHistoryState();
        return result;
      }
    };
  };
  
  return {
    useStore,
    useSelector,
    useAction,
    useAsyncAction, 
    useHistory
  };
} 