/**
 * Vue integration for EffiState
 * Compatible with Vue 3 Composition API
 */
export function createVueBindings(store) {
  const { ref, computed, watch, onUnmounted } = Vue;
  
  // Create reactive state from store
  const useState = () => {
    const state = ref(store.getAll());
    
    // Subscribe to changes
    const unsubscribe = store.subscribe((newState) => {
      state.value = newState;
    });
    
    // Clean up subscription
    onUnmounted(() => {
      unsubscribe();
    });
    
    // Return reactive state and setter
    return [
      state, 
      (newState) => store.set(newState)
    ];
  };
  
  // Create computed property from selector
  const useSelector = (selector) => {
    const state = ref(
      typeof selector === 'function' 
        ? selector(store.getAll())
        : store.get()[selector]
    );
    
    // Subscribe to changes
    const unsubscribe = store.subscribe((newState) => {
      state.value = typeof selector === 'function'
        ? selector(newState)
        : newState[selector];
    });
    
    // Clean up subscription
    onUnmounted(() => {
      unsubscribe();
    });
    
    return state;
  };
  
  // Create store plugin
  const createStorePlugin = () => {
    return {
      install(app) {
        app.provide('effistate', store);
        
        // Add global store property for options API
        app.config.globalProperties.$store = store;
      }
    };
  };
  
  return {
    useState,
    useSelector,
    createStorePlugin
  };
} 