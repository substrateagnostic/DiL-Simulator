import * as THREE from 'three';

// Simple particle system for combat effects, coffee steam, etc.
export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.emitters = [];
  }

  // Create a burst of particles
  burst(position, count = 10, color = 0xffffff, speed = 2, lifetime = 1) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;
      velocities.push({
        x: (Math.random() - 0.5) * speed,
        y: Math.random() * speed,
        z: (Math.random() - 0.5) * speed,
      });
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color,
      size: 0.08,
      transparent: true,
      opacity: 1,
    });
    const points = new THREE.Points(geo, mat);
    this.scene.add(points);

    const emitter = {
      points,
      velocities,
      lifetime,
      elapsed: 0,
      positions: geo.attributes.position,
    };
    this.emitters.push(emitter);
  }

  update(dt) {
    for (let i = this.emitters.length - 1; i >= 0; i--) {
      const e = this.emitters[i];
      e.elapsed += dt;

      if (e.elapsed >= e.lifetime) {
        this.scene.remove(e.points);
        e.points.geometry.dispose();
        e.points.material.dispose();
        this.emitters.splice(i, 1);
        continue;
      }

      // Update particle positions
      const arr = e.positions.array;
      for (let j = 0; j < e.velocities.length; j++) {
        arr[j * 3] += e.velocities[j].x * dt;
        arr[j * 3 + 1] += e.velocities[j].y * dt;
        arr[j * 3 + 2] += e.velocities[j].z * dt;
        e.velocities[j].y -= 2 * dt; // Gravity
      }
      e.positions.needsUpdate = true;

      // Fade out
      e.points.material.opacity = 1 - (e.elapsed / e.lifetime);
    }
  }

  dispose() {
    for (const e of this.emitters) {
      this.scene.remove(e.points);
      e.points.geometry.dispose();
      e.points.material.dispose();
    }
    this.emitters = [];
  }
}
