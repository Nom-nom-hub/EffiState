/**
 * EffiState TypeScript Definitions
 */

export interface Store<T extends object> {
  /** Get the current state */
  get: () => T;
  /** Get computed values */
  getComputed: () => Record<string, any>;
  /** Get full state with computed values */
  getAll: () => T & Record<string, any>;
  /** Update the state */
  set: (newState: Partial<T>) => void;
  /** Subscribe to state changes */
  subscribe: (listener: (state: T, prevState?: T) => void) => () => void;
  /** Define a computed value */
  compute: <R>(key: string, fn: (state: T, computed?: Record<string, any>) => R) => { key: string, fn: Function };
  /** Undo the last state change */
  undo: () => boolean;
  /** Redo a previously undone state change */
  redo: () => boolean;
  /** For internal use and testing */
  _getHistory?: () => T[];
  /** For internal use and testing */
  _getHistoryIndex?: () => number;
}

/**
 * Creates a new store with the provided initial state
 */
export function createStore<T extends object>(initialState?: T): Store<T>;

/**
 * Logger middleware that logs state changes
 */
export function withLogger<T extends object>(store: Store<T>): Store<T>;

/**
 * Persistence middleware that saves state to localStorage
 */
export function withPersistence<T extends object>(store: Store<T>, key: string): Store<T>;

/**
 * DevTools options
 */
export interface DevToolsOptions {
  /** Name to display in Redux DevTools */
  name?: string;
  /** Function to generate action names */
  actionNameFn?: (newState: any) => string;
  /** Any additional DevTools options */
  [key: string]: any;
}

/**
 * Redux DevTools middleware
 */
export function withDevTools<T extends object>(
  store: Store<T>, 
  options?: DevToolsOptions
): Store<T>;

/**
 * Selector hook factory
 */
export function createSelector<T extends object, R>(
  store: Store<T>,
  selectorFn: (state: T) => R,
  equalityFn?: (a: R, b: R) => boolean
): () => R;

/**
 * Server sync options
 */
export interface ServerSyncOptions {
  /** Function to fetch state from server */
  fetchFn: () => Promise<any>;
  /** Function to push state to server */
  pushFn?: (state: any) => Promise<void>;
  /** Interval in ms for auto sync (0 = disable) */
  syncInterval?: number;
  /** Error handler */
  onError?: (error: any) => void;
}

/**
 * Server sync middleware
 */
export interface SyncedStore<T extends object> extends Store<T> {
  /** Fetch state from server */
  pull: () => Promise<void>;
  /** Push state to server */
  push: () => Promise<void>;
  /** Stop automatic synchronization */
  stopSync: () => void;
}

/**
 * Server synchronization middleware
 */
export function withServerSync<T extends object>(
  store: Store<T>,
  options: ServerSyncOptions
): SyncedStore<T>; 