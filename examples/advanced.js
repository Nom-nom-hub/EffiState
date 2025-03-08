import { createStore, withDevTools, withServerSync, createSelector } from '../src/effistate';
import { useStore, useSelector } from '../src/react';

// Create a store with initial state
const todoStore = createStore({ 
  todos: [],
  filter: 'all',
  loading: false
});

// Add DevTools integration
const devToolsStore = withDevTools(todoStore, {
  name: 'Todo App',
  actionNameFn: (newState) => {
    if (newState.todos) return 'UPDATE_TODOS';
    if (newState.filter) return 'SET_FILTER';
    if ('loading' in newState) return 'SET_LOADING';
    return 'UPDATE_STATE';
  }
});

// Add computed values
devToolsStore.compute('filteredTodos', (state) => {
  switch (state.filter) {
    case 'active':
      return state.todos.filter(todo => !todo.completed);
    case 'completed':
      return state.todos.filter(todo => todo.completed);
    default:
      return state.todos;
  }
});

devToolsStore.compute('completedCount', (state) => {
  return state.todos.filter(todo => todo.completed).length;
});

devToolsStore.compute('activeCount', (state) => {
  return state.todos.filter(todo => !todo.completed).length;
});

// Add server synchronization
const serverSyncStore = withServerSync(devToolsStore, {
  fetchFn: async () => {
    // Fetch todos from a server
    const response = await fetch('/api/todos');
    const data = await response.json();
    return { todos: data.todos };
  },
  pushFn: async (state) => {
    // Save todos to a server
    await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ todos: state.todos })
    });
  },
  syncInterval: 30000, // Sync every 30 seconds
  onError: (error) => console.error('Sync failed:', error)
});

// Create selectors for efficient rendering
const useTodoSelector = createSelector(
  serverSyncStore,
  state => state.todos,
  (a, b) => a.length === b.length && a.every((todo, i) => todo.id === b[i].id && todo.completed === b[i].completed)
);

const useFilterSelector = createSelector(
  serverSyncStore,
  state => state.filter
);

// React component
function TodoApp() {
  // Use the full store
  const state = useStore(serverSyncStore);
  
  // Or use selectors for better performance
  const todos = useSelector(serverSyncStore, state => state.todos);
  const filter = useSelector(serverSyncStore, state => state.filter);
  
  // Alternative way using the custom selector hook
  // const todos = useTodoSelector();
  // const filter = useFilterSelector();
  
  // Get computed values
  const { filteredTodos, completedCount, activeCount } = useSelector(
    serverSyncStore, 
    state => ({
      filteredTodos: state.getComputed().filteredTodos,
      completedCount: state.getComputed().completedCount,
      activeCount: state.getComputed().activeCount
    })
  );
  
  // Add a new todo
  const addTodo = (text) => {
    serverSyncStore.set({
      todos: [
        ...todos,
        { id: Date.now(), text, completed: false }
      ]
    });
  };
  
  // Toggle a todo's completed status
  const toggleTodo = (id) => {
    serverSyncStore.set({
      todos: todos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    });
  };
  
  // Undo/redo functionality
  const handleUndo = () => serverSyncStore.undo();
  const handleRedo = () => serverSyncStore.redo();
  
  // Load data from server
  const handleRefresh = () => serverSyncStore.pull();
  
  return (
    <div>
      <h1>Todo App</h1>
      
      <div className="controls">
        <button onClick={handleUndo}>Undo</button>
        <button onClick={handleRedo}>Redo</button>
        <button onClick={handleRefresh}>Refresh</button>
      </div>
      
      <div className="stats">
        <span>{activeCount} active</span>
        <span>{completedCount} completed</span>
      </div>
      
      <div className="filters">
        <button 
          className={filter === 'all' ? 'active' : ''} 
          onClick={() => serverSyncStore.set({ filter: 'all' })}
        >
          All
        </button>
        <button 
          className={filter === 'active' ? 'active' : ''} 
          onClick={() => serverSyncStore.set({ filter: 'active' })}
        >
          Active
        </button>
        <button 
          className={filter === 'completed' ? 'active' : ''} 
          onClick={() => serverSyncStore.set({ filter: 'completed' })}
        >
          Completed
        </button>
      </div>
      
      <form onSubmit={(e) => {
        e.preventDefault();
        const input = e.target.elements.todoText;
        addTodo(input.value);
        input.value = '';
      }}>
        <input name="todoText" placeholder="What needs to be done?" />
        <button type="submit">Add</button>
      </form>
      
      <ul className="todo-list">
        {filteredTodos.map(todo => (
          <li key={todo.id} className={todo.completed ? 'completed' : ''}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo.id)}
            />
            <span>{todo.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
} 