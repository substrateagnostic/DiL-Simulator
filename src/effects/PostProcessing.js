// Lightweight post-processing effects via CSS and scene modifications
// (Avoids Three.js EffectComposer dependency to keep things simple)

export class PostProcessing {
  constructor() {
    this.vignetteElement = null;
    this.bloomEnabled = false;
  }

  init() {
    // CSS-based vignette. Eased since the Display Case round-2 critique:
    // the old transparent-60% -> 0.4-black ramp swallowed the diorama's
    // near wall/floor corner ("the vignette is cropping the miniature
    // instead of framing it"). Falloff now starts further out and peaks
    // lower so the room slab's full silhouette stays legible.
    this.vignetteElement = document.createElement('div');
    this.vignetteElement.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 5;
      background: radial-gradient(ellipse at center, transparent 72%, rgba(0,0,0,0.26) 100%);
    `;
    document.getElementById('game-container').appendChild(this.vignetteElement);
  }

  setVignetteIntensity(intensity) {
    if (this.vignetteElement) {
      const a = Math.min(0.5, intensity);
      this.vignetteElement.style.background = `radial-gradient(ellipse at center, transparent 72%, rgba(0,0,0,${a}) 100%)`;
    }
  }

  dispose() {
    if (this.vignetteElement && this.vignetteElement.parentNode) {
      this.vignetteElement.parentNode.removeChild(this.vignetteElement);
    }
  }
}
