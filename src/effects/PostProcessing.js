// Lightweight post-processing effects via CSS and scene modifications
// (Avoids Three.js EffectComposer dependency to keep things simple)

export class PostProcessing {
  constructor() {
    this.vignetteElement = null;
    this.bloomEnabled = false;
  }

  init() {
    // CSS-based vignette
    this.vignetteElement = document.createElement('div');
    this.vignetteElement.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 5;
      background: radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.4) 100%);
    `;
    document.getElementById('game-container').appendChild(this.vignetteElement);
  }

  setVignetteIntensity(intensity) {
    if (this.vignetteElement) {
      const a = Math.min(0.7, intensity);
      this.vignetteElement.style.background = `radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,${a}) 100%)`;
    }
  }

  dispose() {
    if (this.vignetteElement && this.vignetteElement.parentNode) {
      this.vignetteElement.parentNode.removeChild(this.vignetteElement);
    }
  }
}
