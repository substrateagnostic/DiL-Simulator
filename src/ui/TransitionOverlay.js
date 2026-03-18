// Screen transition effects (fade, wipe, diamond)
export class TransitionOverlay {
  constructor() {
    this.container = document.getElementById('ui-overlay');
    this.element = null;
  }

  play(type = 'fade', duration = 0.5) {
    return new Promise(resolve => {
      this.remove();
      this.element = document.createElement('div');
      this.element.className = `transition-overlay transition-${type}`;
      this.element.style.setProperty('--duration', `${duration}s`);
      this.container.appendChild(this.element);

      setTimeout(() => {
        this.remove();
        resolve();
      }, duration * 1000);
    });
  }

  fadeOut(duration = 0.4) {
    return new Promise(resolve => {
      this.remove();
      this.element = document.createElement('div');
      this.element.className = 'transition-overlay transition-fade-out';
      this.element.style.setProperty('--duration', `${duration}s`);
      this.container.appendChild(this.element);
      setTimeout(resolve, duration * 1000);
    });
  }

  fadeIn(duration = 0.4) {
    return new Promise(resolve => {
      this.remove();
      this.element = document.createElement('div');
      this.element.className = 'transition-overlay transition-fade-in';
      this.element.style.setProperty('--duration', `${duration}s`);
      this.container.appendChild(this.element);
      setTimeout(() => {
        this.remove();
        resolve();
      }, duration * 1000);
    });
  }

  wipeDownOut(duration = 0.4) {
    return new Promise(resolve => {
      this.remove();
      this.element = document.createElement('div');
      this.element.className = 'transition-overlay transition-wipe-down-out';
      this.element.style.setProperty('--duration', `${duration}s`);
      this.container.appendChild(this.element);
      setTimeout(resolve, duration * 1000);
    });
  }

  wipeDownIn(duration = 0.4) {
    return new Promise(resolve => {
      this.remove();
      this.element = document.createElement('div');
      this.element.className = 'transition-overlay transition-wipe-down-in';
      this.element.style.setProperty('--duration', `${duration}s`);
      this.container.appendChild(this.element);
      setTimeout(() => {
        this.remove();
        resolve();
      }, duration * 1000);
    });
  }

  wipeUpOut(duration = 0.4) {
    return new Promise(resolve => {
      this.remove();
      this.element = document.createElement('div');
      this.element.className = 'transition-overlay transition-wipe-up-out';
      this.element.style.setProperty('--duration', `${duration}s`);
      this.container.appendChild(this.element);
      setTimeout(resolve, duration * 1000);
    });
  }

  wipeUpIn(duration = 0.4) {
    return new Promise(resolve => {
      this.remove();
      this.element = document.createElement('div');
      this.element.className = 'transition-overlay transition-wipe-up-in';
      this.element.style.setProperty('--duration', `${duration}s`);
      this.container.appendChild(this.element);
      setTimeout(() => {
        this.remove();
        resolve();
      }, duration * 1000);
    });
  }

  // Fade to black, execute callback, fade back
  async crossFade(callback, duration = 0.4) {
    await this.fadeOut(duration);
    if (callback) await callback();
    await this.fadeIn(duration);
  }

  remove() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }
}
