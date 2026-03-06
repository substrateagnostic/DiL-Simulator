import { ease } from './math.js';

const activeTweens = [];

export class Tween {
  constructor(target) {
    this.target = target;
    this.steps = [];
    this.currentStep = 0;
    this.elapsed = 0;
    this.startValues = {};
    this.active = false;
    this.onCompleteCallback = null;
    this.onUpdateCallback = null;
  }

  to(props, duration, easing = 'outQuad') {
    this.steps.push({ type: 'to', props, duration, easing });
    return this;
  }

  delay(duration) {
    this.steps.push({ type: 'delay', duration });
    return this;
  }

  onComplete(fn) {
    this.onCompleteCallback = fn;
    return this;
  }

  onUpdate(fn) {
    this.onUpdateCallback = fn;
    return this;
  }

  start() {
    this.active = true;
    this.currentStep = 0;
    this.elapsed = 0;
    this._initStep();
    activeTweens.push(this);
    return this;
  }

  stop() {
    this.active = false;
    const idx = activeTweens.indexOf(this);
    if (idx !== -1) activeTweens.splice(idx, 1);
    return this;
  }

  _initStep() {
    if (this.currentStep >= this.steps.length) {
      this.active = false;
      const idx = activeTweens.indexOf(this);
      if (idx !== -1) activeTweens.splice(idx, 1);
      if (this.onCompleteCallback) this.onCompleteCallback();
      return;
    }

    const step = this.steps[this.currentStep];
    this.elapsed = 0;

    if (step.type === 'to') {
      this.startValues = {};
      for (const key in step.props) {
        this.startValues[key] = this.target[key];
      }
    }
  }

  update(dt) {
    if (!this.active || this.currentStep >= this.steps.length) return;

    const step = this.steps[this.currentStep];
    this.elapsed += dt;

    if (step.type === 'delay') {
      if (this.elapsed >= step.duration) {
        this.currentStep++;
        this._initStep();
      }
      return;
    }

    if (step.type === 'to') {
      const t = Math.min(this.elapsed / step.duration, 1);
      const easeFn = ease[step.easing] || ease.outQuad;
      const et = easeFn(t);

      for (const key in step.props) {
        this.target[key] = this.startValues[key] + (step.props[key] - this.startValues[key]) * et;
      }

      if (this.onUpdateCallback) this.onUpdateCallback(t);

      if (t >= 1) {
        this.currentStep++;
        this._initStep();
      }
    }
  }
}

export function updateTweens(dt) {
  for (let i = activeTweens.length - 1; i >= 0; i--) {
    activeTweens[i].update(dt);
  }
}

export function killAllTweens() {
  activeTweens.length = 0;
}

export function tweenTo(target, props, duration, easing) {
  return new Tween(target).to(props, duration, easing).start();
}
