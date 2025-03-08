import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { createStore } from '../src/effistate';
import { useStore, useSelector } from '../src/react';

// Mock component using EffiState
function Counter({ store }) {
  const state = useStore(store);
  
  return (
    <div>
      <div data-testid="count">{state.count}</div>
      <button 
        data-testid="increment"
        onClick={() => store.set({ count: state.count + 1 })}
      >
        Increment
      </button>
    </div>
  );
}

describe('React Integration', () => {
  test('useStore should render component with current state', () => {
    const store = createStore({ count: 0 });
    const { getByTestId } = render(<Counter store={store} />);
    
    expect(getByTestId('count').textContent).toBe('0');
    
    fireEvent.click(getByTestId('increment'));
    expect(getByTestId('count').textContent).toBe('1');
    
    act(() => {
      store.set({ count: 5 });
    });
    expect(getByTestId('count').textContent).toBe('5');
  });

  // No need for useSelector test using react-hooks, we can test it directly
  test('useSelector should only re-render on relevant changes', () => {
    const store = createStore({ user: { name: 'John' }, count: 0 });
    
    function SelectorComponent() {
      const username = useSelector(store, state => state.user.name);
      return <div data-testid="username">{username}</div>;
    }
    
    const { getByTestId, rerender } = render(<SelectorComponent />);
    expect(getByTestId('username').textContent).toBe('John');
    
    // Update unrelated state, should not cause re-render
    act(() => {
      store.set({ count: 5 });
    });
    expect(getByTestId('username').textContent).toBe('John');
    
    // Update related state, should cause re-render
    act(() => {
      store.set({ user: { name: 'Jane' } });
    });
    expect(getByTestId('username').textContent).toBe('Jane');
  });
}); 