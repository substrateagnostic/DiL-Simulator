class InputManagerClass {
  constructor() {
    this.keys = {};
    this.justPressed = {};
    this.justReleased = {};
    this._prevKeys = {};
    this.enabled = true;

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
  }

  init() {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  }

  _onKeyDown(e) {
    if (!this.enabled) return;
    // Prevent default for game keys
    const gameKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'e', 'Enter', 'Escape', ' ', '`', 'F2'];
    if (gameKeys.includes(e.key)) {
      e.preventDefault();
    }
    this.keys[e.key.toLowerCase()] = true;
  }

  _onKeyUp(e) {
    this.keys[e.key.toLowerCase()] = false;
  }

  update() {
    // Calculate justPressed and justReleased
    this.justPressed = {};
    this.justReleased = {};

    for (const key in this.keys) {
      if (this.keys[key] && !this._prevKeys[key]) {
        this.justPressed[key] = true;
      }
      if (!this.keys[key] && this._prevKeys[key]) {
        this.justReleased[key] = true;
      }
    }

    this._prevKeys = { ...this.keys };
  }

  isDown(key) {
    return !!this.keys[key.toLowerCase()];
  }

  isJustPressed(key) {
    return !!this.justPressed[key.toLowerCase()];
  }

  isJustReleased(key) {
    return !!this.justReleased[key.toLowerCase()];
  }

  // Movement helpers
  getMovementVector() {
    let x = 0, z = 0;
    if (this.isDown('w') || this.isDown('arrowup')) z -= 1;
    if (this.isDown('s') || this.isDown('arrowdown')) z += 1;
    if (this.isDown('a') || this.isDown('arrowleft')) x -= 1;
    if (this.isDown('d') || this.isDown('arrowright')) x += 1;

    // Normalize diagonal
    if (x !== 0 && z !== 0) {
      const inv = 1 / Math.SQRT2;
      x *= inv;
      z *= inv;
    }
    return { x, z };
  }

  isInteractPressed() {
    return this.isJustPressed('e') || this.isJustPressed('enter');
  }

  isCancelPressed() {
    return this.isJustPressed('escape');
  }

  isConfirmPressed() {
    return this.isJustPressed('e') || this.isJustPressed('enter') || this.isJustPressed(' ');
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
  }
}

export const InputManager = new InputManagerClass();
