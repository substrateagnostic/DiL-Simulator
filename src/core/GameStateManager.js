// Pushdown automaton - states stack
export class GameStateManager {
  constructor() {
    this.stack = [];
  }

  get current() {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
  }

  push(state) {
    const prev = this.current;
    if (prev && prev.pause) prev.pause();
    this.stack.push(state);
    if (state.enter) state.enter();
  }

  pop() {
    const state = this.stack.pop();
    if (state && state.exit) state.exit();
    const next = this.current;
    if (next && next.resume) next.resume();
    return state;
  }

  swap(state) {
    const old = this.stack.pop();
    if (old && old.exit) old.exit();
    this.stack.push(state);
    if (state.enter) state.enter();
  }

  update(dt) {
    const state = this.current;
    if (state && state.update) state.update(dt);
  }

  // Get the exploration state (always at the bottom during gameplay)
  getExplorationState() {
    return this.stack.find(s => s.constructor.name === 'ExplorationState') || null;
  }

  clear() {
    while (this.stack.length > 0) {
      this.pop();
    }
  }
}
