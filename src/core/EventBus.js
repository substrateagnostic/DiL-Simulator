class EventBusClass {
  constructor() {
    this.listeners = {};
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => this.off(event, callback);
  }

  once(event, callback) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      callback(...args);
    };
    return this.on(event, wrapper);
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event, ...args) {
    if (!this.listeners[event]) return;
    for (const cb of this.listeners[event]) {
      cb(...args);
    }
  }

  clear() {
    this.listeners = {};
  }
}

export const EventBus = new EventBusClass();
