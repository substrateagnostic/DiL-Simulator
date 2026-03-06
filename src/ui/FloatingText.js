// Floating damage/heal numbers as DOM elements
export class FloatingText {
  constructor() {
    this.container = document.getElementById('ui-overlay');
  }

  spawn(text, x, y, type = 'damage') {
    const el = document.createElement('div');
    el.className = `floating-damage ${type}`;
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    this.container.appendChild(el);

    // Remove after animation
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 1200);
  }

  spawnAt3DPosition(text, worldPos, camera, renderer, type = 'damage') {
    // Project 3D position to screen
    const vec = worldPos.clone();
    vec.project(camera);
    const w = renderer.domElement.width / 2;
    const h = renderer.domElement.height / 2;
    const screenX = (vec.x * w) + w;
    const screenY = -(vec.y * h) + h;

    // Add some random offset
    const offsetX = (Math.random() - 0.5) * 40;
    this.spawn(text, screenX + offsetX, screenY - 20, type);
  }
}
