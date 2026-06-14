import {Unsubscribe} from '../types';


export function createStore<T>(initialState: T) {
  let state = initialState;
  const listeners = new Set<(state: T) => void>();

  return {
    get() {
      return state;
    },
    set(nextState: T) {
      state = nextState;
      listeners.forEach((listener) => listener(state));
    },
    update(updater: (state: T) => T) {
      this.set(updater(state));
    },
    subscribe(listener: (state: T) => void): Unsubscribe {
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
    }
  };
}
