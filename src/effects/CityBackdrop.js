import * as THREE from 'three';

// The world outside the building. A low-poly city sprawls below and around
// the floating room dioramas: lit windows, drifting cloud shadows across the
// office floor, car-light streaks on streets far below, pulsing aircraft
// beacons on the tall towers. Time-of-day advances with the story acts.
//
// Owned by Engine (built once into the main scene; combat has its own scene
// and is unaffected). Engine.setTimeOfDay(key) drives the palette.

const TIME_OF_DAY = {
  morning:    { sky: 0x20203c, building: 0x4a5668, windowLit: 0.18, beacon: 0x884444, fog: 0x14142a, streak: 0x99bbdd },
  afternoon:  { sky: 0x232340, building: 0x55607a, windowLit: 0.12, beacon: 0x884444, fog: 0x16162e, streak: 0xaabbcc },
  goldenhour: { sky: 0x33203a, building: 0x6a4a52, windowLit: 0.35, beacon: 0xcc5544, fog: 0x241626, streak: 0xffcc88 },
  dusk:       { sky: 0x281a3c, building: 0x3c3050, windowLit: 0.55, beacon: 0xff4444, fog: 0x1a1230, streak: 0xffaa66 },
  night:      { sky: 0x0e0e20, building: 0x1c2030, windowLit: 0.75, beacon: 0xff3333, fog: 0x0a0a18, streak: 0xffdd99 },
  predawn:    { sky: 0x161628, building: 0x262a3c, windowLit: 0.4, beacon: 0xff4444, fog: 0x10101f, streak: 0xbbaadd },
};

const CENTER = { x: 13, z: 8 };   // rough center of the room play area

export class CityBackdrop {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'city_backdrop';
    this.time = 0;
    this.tod = 'morning';
    this.buildings = [];
    this.beacons = [];
    this.streaks = [];
    this.cloudShadows = [];
    this._windowTextures = {};
    this._build();
    scene.add(this.group);
  }

  // Cached canvas of a building facade — dark concrete + window grid.
  // litChance is baked per texture; buildings re-sample on time changes.
  _facadeTexture(litChance) {
    const key = `${Math.round(litChance * 20)}`;
    if (this._windowTextures[key]) return this._windowTextures[key];
    const c = document.createElement('canvas');
    c.width = 64; c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#181c26';
    ctx.fillRect(0, 0, 64, 128);
    for (let y = 6; y < 122; y += 9) {
      for (let x = 5; x < 58; x += 9) {
        const lit = ((x * 31 + y * 17) % 100) / 100 < litChance;
        ctx.fillStyle = lit
          ? (Math.random() < 0.85 ? '#ffd98c' : '#aaccee')
          : '#0c0e16';
        ctx.fillRect(x, y, 5, 6);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    this._windowTextures[key] = tex;
    return tex;
  }

  _build() {
    // ── Buildings — a ring around the play area, rooftops below floor level ──
    // Deterministic pseudo-random so the skyline is stable across loads.
    let seed = 1337;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let i = 0; i < 64; i++) {
      const angle = (i / 64) * Math.PI * 2 + rand() * 0.08;
      // Keep the camera corridor clear — the iso camera looks in from the
      // +x/+z diagonal (~PI/4); a tower there would sit in front of the room
      if (Math.abs(angle - Math.PI / 4) < 0.55) { rand(); rand(); continue; }
      // Alternate near/far bands so neighboring towers can't interpenetrate
      // (overlapping dark boxes read as 'tearing' at the silhouette)
      const radius = i % 2 === 0 ? 25 + rand() * 9 : 40 + rand() * 12;
      const x = CENTER.x + Math.cos(angle) * radius;
      const z = CENTER.z + Math.sin(angle) * radius * 0.8;
      const w = 2.5 + rand() * 4;
      const h = 5 + rand() * 11;
      const d = 2.5 + rand() * 4;

      const mat = new THREE.MeshToonMaterial({
        color: 0x4a5668,
        map: this._facadeTexture(0.18 + rand() * 0.1),
      });
      const building = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      // Rooftops sit below the room floor — the office is high in its tower
      const baseDrop = 2.5 + rand() * 4;
      building.position.set(x, -h / 2 - baseDrop, z);
      this.group.add(building);
      this.buildings.push({ mesh: building, h, baseDrop });

      // Aircraft beacon on the tallest few
      if (h > 13) {
        const beacon = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 6, 5),
          new THREE.MeshBasicMaterial({ color: 0xff3333, transparent: true, opacity: 0.8 })
        );
        beacon.position.set(x, building.position.y + h / 2 + 0.15, z);
        this.group.add(beacon);
        this.beacons.push({ mesh: beacon, phase: rand() * Math.PI * 2, building: this.buildings[this.buildings.length - 1] });
      }
    }

    // ── The Vaults Fargo tower itself — visible from street level only,
    // looming south beyond the road, windows lit to the story's hour ────
    const hqMat = new THREE.MeshToonMaterial({
      color: 0x3c4456,
      map: this._facadeTexture(0.3),
    });
    // North, behind the street facades — you just walked out of it
    this.hqTower = new THREE.Mesh(new THREE.BoxGeometry(11, 46, 8), hqMat);
    this.hqTower.position.set(CENTER.x, 23 - 0.4, CENTER.z - 18);
    this.hqTower.visible = false;
    this.group.add(this.hqTower);
    const hqBeacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 6, 5),
      new THREE.MeshBasicMaterial({ color: 0xff3333, transparent: true, opacity: 0.8 })
    );
    hqBeacon.position.set(CENTER.x, 46, CENTER.z - 18);
    hqBeacon.visible = false;
    this.group.add(hqBeacon);
    this.hqBeacon = hqBeacon;
    this.beacons.push({ mesh: hqBeacon, phase: 0.7, hq: true });

    // ── Car-light streaks on two streets far below ───────────────────────
    for (let i = 0; i < 10; i++) {
      const isX = i % 2 === 0;
      const streak = new THREE.Mesh(
        new THREE.BoxGeometry(isX ? 1.4 : 0.12, 0.06, isX ? 0.12 : 1.4),
        new THREE.MeshBasicMaterial({ color: 0xffdd99, transparent: true, opacity: 0.7 })
      );
      const lane = (i % 4 < 2) ? -1 : 1;
      streak.position.y = -16;
      this.group.add(streak);
      this.streaks.push({
        mesh: streak, isX,
        lane: (isX ? CENTER.z : CENTER.x) + lane * (16 + (i % 3) * 2),
        speed: (4 + (i % 5)) * (lane > 0 ? 1 : -1),
        offset: i * 11,
      });
    }

    // ── Street-level ground: a dark plane swallows the blueprint void
    // floor, and slow mist patches drift over the asphalt (Alex's note:
    // the light-blue void reads wrong at the bottom of the city) ───────
    this.streetGround = new THREE.Mesh(
      new THREE.CircleGeometry(85, 28),
      new THREE.MeshBasicMaterial({ color: 0x0b0814, transparent: true, opacity: 0.97, depthWrite: false })
    );
    this.streetGround.rotation.x = -Math.PI / 2;
    this.streetGround.position.set(CENTER.x, -0.08, CENTER.z);
    this.streetGround.renderOrder = -2;
    this.streetGround.visible = false;
    this.group.add(this.streetGround);

    this.mistPatches = [];
    for (let i = 0; i < 7; i++) {
      const mist = new THREE.Mesh(
        new THREE.CircleGeometry(7 + (i % 3) * 4, 12),
        new THREE.MeshBasicMaterial({ color: 0x241a36, transparent: true, opacity: 0.16, depthWrite: false })
      );
      mist.rotation.x = -Math.PI / 2;
      mist.position.set(CENTER.x + (i - 3) * 11, 0.22 + (i % 2) * 0.18, CENTER.z + ((i * 7) % 22) - 11);
      mist.visible = false;
      this.group.add(mist);
      this.mistPatches.push({ mesh: mist, speed: 0.35 + (i % 4) * 0.12, phase: i * 1.7 });
    }

    // ── Cloud shadows drifting across the office floor ──────────────────
    for (let i = 0; i < 4; i++) {
      const blob = new THREE.Mesh(
        new THREE.CircleGeometry(3 + i * 1.2, 14),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.07, depthWrite: false })
      );
      blob.rotation.x = -Math.PI / 2;
      blob.position.set(i * 9 - 6, 0.008, 2 + i * 4);
      blob.scale.x = 1.6;
      this.group.add(blob);
      this.cloudShadows.push({ mesh: blob, speed: 0.25 + i * 0.08 });
    }
  }

  // Recenter the whole city on the building's plate center so the ring
  // of towers stays anchored to the SAME building as you change floors.
  setCenter(x, z) {
    this.group.position.set(x - CENTER.x, this.group.position.y, z - CENTER.z);
  }

  // Street-level mode: you're at the BOTTOM of the city. Tower bases
  // land at the ground plane and stretch overhead; car lights run at
  // curb height; the Vaults Fargo tower looms to the south.
  setStreetLevel(on) {
    if (this.streetLevel === on) return;
    this.streetLevel = on;
    this.streakY = on ? -0.25 : -16;
    for (const b of this.buildings) {
      if (on) {
        b.mesh.scale.y = 2.4;
        b.mesh.position.y = (b.h * 2.4) / 2 - 0.6;
      } else {
        b.mesh.scale.y = 1;
        b.mesh.position.y = -b.h / 2 - b.baseDrop;
      }
    }
    for (const bc of this.beacons) {
      if (bc.hq) continue;
      const b = bc.building;
      if (b) bc.mesh.position.y = b.mesh.position.y + (b.h * b.mesh.scale.y) / 2 + 0.15;
    }
    if (this.hqTower) {
      this.hqTower.visible = on;
      this.hqBeacon.visible = on;
    }
    // Ground fog replaces the blueprint void floor down here; cloud
    // shadows are an office-window thing and read wrong on asphalt
    if (this.streetGround) this.streetGround.visible = on;
    for (const m of (this.mistPatches || [])) m.mesh.visible = on;
    for (const cs of this.cloudShadows) cs.mesh.visible = !on;
  }

  setTimeOfDay(key) {
    if (!TIME_OF_DAY[key] || key === this.tod) return;
    this.tod = key;
    const t = TIME_OF_DAY[key];
    for (const b of this.buildings) {
      b.mesh.material.color.set(t.building);
      b.mesh.material.map = this._facadeTexture(t.windowLit + Math.random() * 0.08);
      b.mesh.material.needsUpdate = true;
    }
    if (this.hqTower) {
      this.hqTower.material.color.set(t.building);
      this.hqTower.material.map = this._facadeTexture(Math.min(0.8, t.windowLit + 0.12));
      this.hqTower.material.needsUpdate = true;
    }
    for (const bc of this.beacons) bc.mesh.material.color.set(t.beacon);
    for (const s of this.streaks) s.mesh.material.color.set(t.streak);
    // Fog + void tint
    if (this.scene.fog) this.scene.fog.color.set(t.fog);
  }

  update(dt) {
    this.time += dt;

    // Beacons pulse slowly
    for (const bc of this.beacons) {
      bc.mesh.material.opacity = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(this.time * 1.6 + bc.phase));
    }

    // Car streaks loop along their streets (street level: curb height)
    const sy = this.streakY ?? -16;
    for (const s of this.streaks) {
      const range = 46;
      const p = ((this.time * s.speed + s.offset) % range + range) % range - range / 2;
      if (s.isX) {
        s.mesh.position.set(CENTER.x + p, sy, s.lane);
      } else {
        s.mesh.position.set(s.lane, sy, CENTER.z + p);
      }
    }

    // Cloud shadows drift and wrap across the play area
    for (const cs of this.cloudShadows) {
      cs.mesh.position.x += cs.speed * dt;
      if (cs.mesh.position.x > 34) cs.mesh.position.x = -10;
    }

    // Street mist breathes and drifts
    if (this.streetLevel) {
      for (const m of this.mistPatches) {
        m.mesh.position.x += m.speed * dt;
        if (m.mesh.position.x > CENTER.x + 45) m.mesh.position.x = CENTER.x - 45;
        m.mesh.material.opacity = 0.11 + 0.07 * (0.5 + 0.5 * Math.sin(this.time * 0.4 + m.phase));
      }
    }
  }
}
