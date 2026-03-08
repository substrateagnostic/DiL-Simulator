import * as THREE from 'three';

// Simple particle system for combat effects, coffee steam, etc.
export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.emitters = [];
  }

  // Omnidirectional burst — existing workhorse
  burst(position, count = 10, color = 0xffffff, speed = 2, lifetime = 1) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3]     = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;
      velocities.push({
        x: (Math.random() - 0.5) * speed,
        y: Math.random() * speed,
        z: (Math.random() - 0.5) * speed,
      });
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color, size: 0.08, transparent: true, opacity: 1 });
    const points = new THREE.Points(geo, mat);
    this.scene.add(points);
    this.emitters.push({ points, velocities, lifetime, elapsed: 0, positions: geo.attributes.position });
  }

  // Directed stream — particles travel from `from` toward `to` (e.g. projectile, file_motion)
  stream(from, to, count = 15, color = 0xffffff, lifetime = 0.45) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dz = to.z - from.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    const speed = dist / lifetime;
    const nx = dx / dist, ny = dy / dist, nz = dz / dist;

    for (let i = 0; i < count; i++) {
      const t0 = (i / count) * 0.18; // stagger along path
      positions[i * 3]     = from.x + nx * t0;
      positions[i * 3 + 1] = from.y + ny * t0;
      positions[i * 3 + 2] = from.z + nz * t0;
      const spd = speed * (0.85 + Math.random() * 0.3);
      velocities.push({
        x: nx * spd + (Math.random() - 0.5) * 0.4,
        y: ny * spd + (Math.random() - 0.5) * 0.3,
        z: nz * spd,
      });
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color, size: 0.07, transparent: true, opacity: 1 });
    const points = new THREE.Points(geo, mat);
    this.scene.add(points);
    this.emitters.push({ points, velocities, lifetime, elapsed: 0, positions: geo.attributes.position, gravity: 0 });
  }

  // Expanding ring — particles fly outward in a flat circle (e.g. cc_all AOE)
  ring(position, count = 24, color = 0xffffff, expandSpeed = 3, lifetime = 0.8) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      positions[i * 3]     = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;
      velocities.push({
        x: Math.cos(angle) * expandSpeed,
        y: (Math.random() - 0.2) * 0.8,
        z: Math.sin(angle) * expandSpeed,
      });
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color, size: 0.08, transparent: true, opacity: 1 });
    const points = new THREE.Points(geo, mat);
    this.scene.add(points);
    this.emitters.push({ points, velocities, lifetime, elapsed: 0, positions: geo.attributes.position, gravity: 0 });
  }

  // Rising steam/smoke — particles drift gently upward (e.g. coffee_break)
  rise(position, count = 15, color = 0xffffff, lifetime = 1.5) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3]     = position.x + (Math.random() - 0.5) * 0.25;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 0.25;
      velocities.push({
        x: (Math.random() - 0.5) * 0.15,
        y: 0.5 + Math.random() * 0.7,
        z: (Math.random() - 0.5) * 0.15,
      });
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color, size: 0.10, transparent: true, opacity: 0.75 });
    const points = new THREE.Points(geo, mat);
    this.scene.add(points);
    this.emitters.push({ points, velocities, lifetime, elapsed: 0, positions: geo.attributes.position, gravity: 0, startOpacity: 0.75 });
  }

  // Orbital ring — particles spin in a halo around a center point (e.g. billable_hours)
  orbit(position, count = 12, color = 0xffffff, radius = 0.8, lifetime = 1.5) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const orbitData = [];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const r = radius * (0.8 + Math.random() * 0.4);
      positions[i * 3]     = position.x + Math.cos(angle) * r;
      positions[i * 3 + 1] = position.y + (Math.random() - 0.5) * 0.3;
      positions[i * 3 + 2] = position.z + Math.sin(angle) * r;
      orbitData.push({ angle, radius: r, speed: 3.0 + Math.random() * 1.5 });
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color, size: 0.10, transparent: true, opacity: 1 });
    const points = new THREE.Points(geo, mat);
    this.scene.add(points);
    this.emitters.push({
      type: 'orbit',
      points,
      orbitData,
      center: { x: position.x, y: position.y, z: position.z },
      lifetime,
      elapsed: 0,
      positions: geo.attributes.position,
    });
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

      const arr = e.positions.array;

      if (e.type === 'orbit') {
        // Orbital motion — angle advances each frame
        for (let j = 0; j < e.orbitData.length; j++) {
          const od = e.orbitData[j];
          od.angle += od.speed * dt;
          arr[j * 3]     = e.center.x + Math.cos(od.angle) * od.radius;
          arr[j * 3 + 1] = e.center.y + Math.sin(od.angle * 0.5) * od.radius * 0.25;
          arr[j * 3 + 2] = e.center.z + Math.sin(od.angle) * od.radius;
        }
      } else {
        const gravity = e.gravity !== undefined ? e.gravity : 2;
        for (let j = 0; j < e.velocities.length; j++) {
          arr[j * 3]     += e.velocities[j].x * dt;
          arr[j * 3 + 1] += e.velocities[j].y * dt;
          arr[j * 3 + 2] += e.velocities[j].z * dt;
          e.velocities[j].y -= gravity * dt;
        }
      }

      e.positions.needsUpdate = true;

      // Fade out over lifetime
      const startOpacity = e.startOpacity !== undefined ? e.startOpacity : 1;
      e.points.material.opacity = startOpacity * (1 - e.elapsed / e.lifetime);
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
