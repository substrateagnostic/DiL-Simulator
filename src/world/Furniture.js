import * as THREE from 'three';
import { Materials } from '../effects/MaterialLibrary.js';

// Factory for procedural office furniture
export const Furniture = {
  desk(width = 1.2, depth = 0.6) {
    const group = new THREE.Group();
    // Desktop surface
    const topGeo = new THREE.BoxGeometry(width, 0.04, depth);
    const top = new THREE.Mesh(topGeo, Materials.desk());
    top.position.y = 0.72;
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.04, 0.72, 0.04);
    const legMat = Materials.metal();
    const positions = [
      [-(width/2 - 0.05), 0.36, -(depth/2 - 0.05)],
      [(width/2 - 0.05), 0.36, -(depth/2 - 0.05)],
      [-(width/2 - 0.05), 0.36, (depth/2 - 0.05)],
      [(width/2 - 0.05), 0.36, (depth/2 - 0.05)],
    ];
    for (const [x, y, z] of positions) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(x, y, z);
      leg.castShadow = true;
      group.add(leg);
    }

    // Modesty panel
    const panelGeo = new THREE.BoxGeometry(width - 0.1, 0.5, 0.02);
    const panel = new THREE.Mesh(panelGeo, Materials.deskDark());
    panel.position.set(0, 0.47, depth/2 - 0.04);
    group.add(panel);

    return group;
  },

  monitor() {
    const group = new THREE.Group();
    // Screen
    const screenGeo = new THREE.BoxGeometry(0.5, 0.32, 0.02);
    const screen = new THREE.Mesh(screenGeo, Materials.monitorScreen());
    screen.position.y = 0.94;
    screen.position.z = 0.007;
    group.add(screen);
    // Bezel
    const bezelGeo = new THREE.BoxGeometry(0.54, 0.36, 0.03);
    const bezel = new THREE.Mesh(bezelGeo, Materials.monitor());
    bezel.position.y = 0.94;
    bezel.position.z = -0.005;
    group.add(bezel);
    // Stand
    const standGeo = new THREE.BoxGeometry(0.04, 0.16, 0.04);
    const stand = new THREE.Mesh(standGeo, Materials.monitor());
    stand.position.y = 0.82;
    group.add(stand);
    // Base
    const baseGeo = new THREE.BoxGeometry(0.2, 0.02, 0.12);
    const base = new THREE.Mesh(baseGeo, Materials.monitor());
    base.position.y = 0.74;
    group.add(base);
    return group;
  },

  keyboard() {
    const geo = new THREE.BoxGeometry(0.35, 0.015, 0.12);
    const kb = new THREE.Mesh(geo, Materials.custom(0x333333));
    kb.position.y = 0.74;
    return kb;
  },

  chair() {
    const group = new THREE.Group();
    // Seat
    const seatGeo = new THREE.BoxGeometry(0.45, 0.06, 0.45);
    const seat = new THREE.Mesh(seatGeo, Materials.chairFabric());
    seat.position.y = 0.44;
    group.add(seat);
    // Back
    const backGeo = new THREE.BoxGeometry(0.45, 0.5, 0.05);
    const back = new THREE.Mesh(backGeo, Materials.chairFabric());
    back.position.set(0, 0.72, -0.2);
    group.add(back);
    // Post
    const postGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.44, 8);
    const post = new THREE.Mesh(postGeo, Materials.metal());
    post.position.y = 0.22;
    group.add(post);
    // Base star (simplified as a disc)
    const baseGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.03, 5);
    const base = new THREE.Mesh(baseGeo, Materials.metal());
    base.position.y = 0.015;
    group.add(base);

    group.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    return group;
  },

  cubicleWall(width = 2.0, height = 1.4) {
    const group = new THREE.Group();
    // Panel
    const panelGeo = new THREE.BoxGeometry(width, height, 0.06);
    const panel = new THREE.Mesh(panelGeo, Materials.cubicleWall());
    panel.position.y = height / 2;
    panel.castShadow = true;
    panel.receiveShadow = true;
    group.add(panel);
    // Metal trim top
    const trimGeo = new THREE.BoxGeometry(width, 0.04, 0.08);
    const trim = new THREE.Mesh(trimGeo, Materials.metal());
    trim.position.y = height;
    group.add(trim);
    return group;
  },

  fileCabinet() {
    const group = new THREE.Group();
    const bodyGeo = new THREE.BoxGeometry(0.4, 1.0, 0.5);
    const body = new THREE.Mesh(bodyGeo, Materials.metal());
    body.position.y = 0.5;
    group.add(body);
    // Drawer handles
    for (let i = 0; i < 3; i++) {
      const handleGeo = new THREE.BoxGeometry(0.12, 0.02, 0.02);
      const handle = new THREE.Mesh(handleGeo, Materials.custom(0x666666));
      handle.position.set(0, 0.25 + i * 0.3, 0.26);
      group.add(handle);
    }
    group.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    return group;
  },

  // Short 2-drawer wood-finish lateral cabinet
  fileCabinetLow() {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 0.7, metalness: 0.0 });
    const handleMat = Materials.custom(0x999966);
    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.5), woodMat);
    body.position.y = 0.275;
    group.add(body);
    // Drawer divider line
    const divider = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.01, 0.01), Materials.custom(0x4a3010));
    divider.position.set(0, 0.275, 0.255);
    group.add(divider);
    // Two wide horizontal bar handles
    for (let i = 0; i < 2; i++) {
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.025, 0.02), handleMat);
      handle.position.set(0, 0.14 + i * 0.27, 0.27);
      group.add(handle);
    }
    group.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    return group;
  },

  // Wide horizontal credenza-style lateral cabinet with wood top
  fileCabinetLateral() {
    const group = new THREE.Group();
    const bodyMat = Materials.metal();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b6340, roughness: 0.65, metalness: 0.0 });
    const handleMat = Materials.custom(0x888888);
    // Body (wider, lower)
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.65, 0.5), bodyMat);
    body.position.y = 0.325;
    group.add(body);
    // Wood top surface
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.04, 0.52), woodMat);
    top.position.y = 0.67;
    group.add(top);
    // Three vertical drawer dividers on the front face
    for (let i = 0; i < 2; i++) {
      const div = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.6, 0.01), Materials.custom(0x555555));
      div.position.set(-0.3 + i * 0.3, 0.325, 0.255);
      group.add(div);
    }
    // Three small round handles
    for (let i = 0; i < 3; i++) {
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.02), handleMat);
      handle.position.set(-0.3 + i * 0.3, 0.325, 0.27);
      group.add(handle);
    }
    group.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    return group;
  },

  waterCooler() {
    const group = new THREE.Group();
    // Base
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.9, 0.35),
      Materials.custom(0xdddddd)
    );
    base.position.y = 0.45;
    group.add(base);
    // Jug
    const jug = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.15, 0.4, 12),
      Materials.custom(0xaaddff)
    );
    jug.position.y = 1.1;
    group.add(jug);
    group.traverse(c => { if (c.isMesh) { c.castShadow = true; } });
    return group;
  },

  plant(tall = false) {
    const group = new THREE.Group();
    const potH = tall ? 0.3 : 0.2;
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.1, potH, 8),
      Materials.plantPot()
    );
    pot.position.y = potH / 2;
    group.add(pot);

    const leafCount = tall ? 5 : 3;
    for (let i = 0; i < leafCount; i++) {
      const angle = (i / leafCount) * Math.PI * 2;
      const h = potH + 0.1 + Math.random() * (tall ? 0.5 : 0.3);
      const leaf = new THREE.Mesh(
        new THREE.SphereGeometry(0.08 + Math.random() * 0.06, 6, 6),
        Materials.plant()
      );
      leaf.position.set(Math.cos(angle) * 0.08, h, Math.sin(angle) * 0.08);
      leaf.scale.y = 1.2;
      group.add(leaf);
    }
    group.traverse(c => { if (c.isMesh) { c.castShadow = true; } });
    return group;
  },

  // Sansevieria — tall upright flat leaves, two-tone striping
  plantTall() {
    const group = new THREE.Group();
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.11, 0.28, 8),
      Materials.plantPot()
    );
    pot.position.y = 0.14;
    group.add(pot);
    const darkMat  = new THREE.MeshStandardMaterial({ color: 0x244f24, roughness: 0.8 });
    const lightMat = new THREE.MeshStandardMaterial({ color: 0x4a8c3a, roughness: 0.8 });
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + Math.random() * 0.4;
      const height = 0.5 + Math.random() * 0.5;
      const leaf = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, height, 0.11),
        i % 2 === 0 ? darkMat : lightMat
      );
      leaf.position.set(Math.cos(angle) * 0.06, 0.28 + height / 2, Math.sin(angle) * 0.06);
      leaf.rotation.y = angle;
      leaf.rotation.z = (Math.random() - 0.5) * 0.12;
      group.add(leaf);
    }
    group.traverse(c => { if (c.isMesh) c.castShadow = true; });
    return group;
  },

  // Echeveria — low compact rosette succulent
  plantSucculent() {
    const group = new THREE.Group();
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.08, 0.13, 8),
      Materials.plantPot()
    );
    pot.position.y = 0.065;
    group.add(pot);
    const outerMat = new THREE.MeshStandardMaterial({ color: 0x5a8c52, roughness: 0.65, metalness: 0.05 });
    const innerMat = new THREE.MeshStandardMaterial({ color: 0x7ab86e, roughness: 0.6 });
    [[6, 0.09, 0.14, 0.38], [4, 0.05, 0.17, 0.45], [3, 0.02, 0.20, 0.55]].forEach(([cnt, r, yBase, tilt], ring) => {
      for (let i = 0; i < cnt; i++) {
        const angle = (i / cnt) * Math.PI * 2 + ring * 0.5;
        const leaf = new THREE.Mesh(
          new THREE.SphereGeometry(0.042 - ring * 0.007, 5, 4),
          ring < 2 ? outerMat : innerMat
        );
        leaf.scale.set(0.6, 0.4, 1.15);
        leaf.position.set(Math.cos(angle) * r, yBase, Math.sin(angle) * r);
        leaf.rotation.y = angle;
        leaf.rotation.x = tilt;
        group.add(leaf);
      }
    });
    group.traverse(c => { if (c.isMesh) c.castShadow = true; });
    return group;
  },

  // Tiny desk succulent (Echeveria) — sits on top of desk surface
  deskPlantSucculent() {
    const g = new THREE.Group();
    const deskTop = 0.74;
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.04, 0.065, 8),
      Materials.plantPot()
    );
    pot.position.y = deskTop + 0.0325;
    g.add(pot);
    const outerMat = new THREE.MeshStandardMaterial({ color: 0x5a8c52, roughness: 0.65, metalness: 0.05 });
    const innerMat = new THREE.MeshStandardMaterial({ color: 0x7ab86e, roughness: 0.6 });
    [[6, 0.045, 0.07, 0.38], [4, 0.025, 0.085, 0.45], [2, 0.01, 0.10, 0.55]].forEach(([cnt, r, yBase, tilt], ring) => {
      for (let i = 0; i < cnt; i++) {
        const angle = (i / cnt) * Math.PI * 2 + ring * 0.5;
        const leaf = new THREE.Mesh(
          new THREE.SphereGeometry(0.021 - ring * 0.0035, 5, 4),
          ring < 2 ? outerMat : innerMat
        );
        leaf.scale.set(0.6, 0.4, 1.15);
        leaf.position.set(Math.cos(angle) * r, deskTop + yBase, Math.sin(angle) * r);
        leaf.rotation.y = angle;
        leaf.rotation.x = tilt;
        g.add(leaf);
      }
    });
    g.traverse(c => { if (c.isMesh) c.castShadow = true; });
    return g;
  },

  // Tiny desk plant (small leafy) — sits on top of desk surface
  deskPlant() {
    const g = new THREE.Group();
    const deskTop = 0.74;
    const potH = 0.1;
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.05, potH, 8),
      Materials.plantPot()
    );
    pot.position.y = deskTop + potH / 2;
    g.add(pot);
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const h = deskTop + potH + 0.05 + Math.random() * 0.12;
      const leaf = new THREE.Mesh(
        new THREE.SphereGeometry(0.04 + Math.random() * 0.025, 6, 6),
        Materials.plant()
      );
      leaf.position.set(Math.cos(angle) * 0.04, h, Math.sin(angle) * 0.04);
      leaf.scale.y = 1.2;
      g.add(leaf);
    }
    g.traverse(c => { if (c.isMesh) c.castShadow = true; });
    return g;
  },

  // Boston fern — wide drooping fronds
  plantFern() {
    const group = new THREE.Group();
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.11, 0.22, 8),
      Materials.plantPot()
    );
    pot.position.y = 0.11;
    group.add(pot);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x3a8c42, roughness: 0.85 });
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const reach = 0.18 + Math.random() * 0.08;
      for (let j = 0; j < 3; j++) {
        const t = (j + 1) / 3;
        const leaflet = new THREE.Mesh(
          new THREE.SphereGeometry(0.048 - j * 0.009, 5, 4),
          leafMat
        );
        leaflet.scale.set(1.1, 0.32, 0.62);
        leaflet.position.set(Math.cos(angle) * reach * t, 0.27 - t * 0.07, Math.sin(angle) * reach * t);
        group.add(leaflet);
      }
    }
    group.traverse(c => { if (c.isMesh) c.castShadow = true; });
    return group;
  },

  coffeeMachine() {
    const group = new THREE.Group();
    // Counter base
    const counterBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.7, 0.37),
      Materials.deskDark()
    );
    counterBody.position.y = 0.35;
    counterBody.castShadow = true;
    counterBody.receiveShadow = true;
    group.add(counterBody);
    const counterTop = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.04, 0.39),
      Materials.desk()
    );
    counterTop.position.y = 0.72;
    counterTop.castShadow = true;
    counterTop.receiveShadow = true;
    group.add(counterTop);
    // Machine body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.4, 0.25),
      Materials.custom(0x222222)
    );
    body.position.y = 0.92;
    group.add(body);
    // Indicator light
    const light = new THREE.Mesh(
      new THREE.SphereGeometry(0.015, 6, 6),
      Materials.custom(0x44ff44, { emissive: 0x44ff44, emissiveIntensity: 0.5 })
    );
    light.position.set(0.1, 1.05, 0.13);
    group.add(light);
    return group;
  },

  fridge() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.6, 0.65),
      Materials.fridge()
    );
    body.position.y = 0.8;
    group.add(body);
    // Handle
    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.3, 0.03),
      Materials.metal()
    );
    handle.position.set(0.3, 0.9, 0.34);
    group.add(handle);
    group.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    return group;
  },

  microwave() {
    const group = new THREE.Group();
    // Counter base
    const counterBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.7, 0.42),
      Materials.deskDark()
    );
    counterBody.position.y = 0.35;
    counterBody.castShadow = true;
    counterBody.receiveShadow = true;
    group.add(counterBody);
    const counterTop = new THREE.Mesh(
      new THREE.BoxGeometry(0.54, 0.04, 0.44),
      Materials.desk()
    );
    counterTop.position.y = 0.72;
    counterTop.castShadow = true;
    counterTop.receiveShadow = true;
    group.add(counterTop);
    // Microwave body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.25, 0.3),
      Materials.microwave()
    );
    body.position.y = 0.855;
    group.add(body);
    // Door window
    const window_ = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.15, 0.01),
      Materials.custom(0x333344)
    );
    window_.position.set(-0.05, 0.855, 0.155);
    group.add(window_);
    return group;
  },

  vendingMachine() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 1.8, 0.6),
      Materials.vendingMachine()
    );
    body.position.y = 0.9;
    group.add(body);
    // Glass front
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 1.0, 0.01),
      Materials.glass()
    );
    glass.position.set(0, 1.1, 0.305);
    group.add(glass);
    group.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    return group;
  },

  speakerphone() {
    const group = new THREE.Group();
    const tableTop = 0.74;

    // Triangular Polycom-style body
    const bodyGeo = new THREE.CylinderGeometry(0.14, 0.16, 0.04, 3);
    const body = new THREE.Mesh(bodyGeo, Materials.custom(0x111111));
    body.position.y = tableTop + 0.02;
    group.add(body);

    // Three speaker grille bumps at each corner
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const grillGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.012, 6);
      const grill = new THREE.Mesh(grillGeo, Materials.custom(0x333333));
      grill.position.set(
        Math.sin(angle) * 0.1,
        tableTop + 0.045,
        Math.cos(angle) * 0.1
      );
      group.add(grill);
    }

    // Active indicator light (green, emissive)
    const lightGeo = new THREE.SphereGeometry(0.018, 6, 6);
    const light = new THREE.Mesh(lightGeo, Materials.custom(0x00cc44, { emissive: 0x00cc44, emissiveIntensity: 0.9 }));
    light.position.set(0, tableTop + 0.055, 0);
    group.add(light);

    return group;
  },

  conferenceTable() {
    const group = new THREE.Group();
    const topGeo = new THREE.BoxGeometry(3.0, 0.06, 1.2);
    const top = new THREE.Mesh(topGeo, Materials.deskDark());
    top.position.y = 0.72;
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);

    const legGeo = new THREE.BoxGeometry(0.08, 0.72, 0.08);
    const legMat = Materials.metal();
    [[-1.3, 0.36, -0.5], [1.3, 0.36, -0.5], [-1.3, 0.36, 0.5], [1.3, 0.36, 0.5]].forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(x, y, z);
      leg.castShadow = true;
      group.add(leg);
    });
    return group;
  },

  whiteboard() {
    const group = new THREE.Group();
    // Board
    const boardGeo = new THREE.BoxGeometry(1.8, 1.0, 0.04);
    const board = new THREE.Mesh(boardGeo, Materials.whiteboard());
    board.position.y = 1.4;
    group.add(board);
    // Frame
    const frameMat = Materials.metal();
    // Top/bottom
    const hGeo = new THREE.BoxGeometry(1.84, 0.03, 0.05);
    const top = new THREE.Mesh(hGeo, frameMat);
    top.position.y = 1.9;
    group.add(top);
    const bottom = new THREE.Mesh(hGeo, frameMat);
    bottom.position.y = 0.9;
    group.add(bottom);
    // Sides
    const vGeo = new THREE.BoxGeometry(0.03, 1.04, 0.05);
    const left = new THREE.Mesh(vGeo, frameMat);
    left.position.set(-0.92, 1.4, 0);
    group.add(left);
    const right = new THREE.Mesh(vGeo, frameMat);
    right.position.set(0.92, 1.4, 0);
    group.add(right);
    // Tray
    const trayGeo = new THREE.BoxGeometry(0.8, 0.03, 0.06);
    const tray = new THREE.Mesh(trayGeo, Materials.metal());
    tray.position.set(0, 0.88, 0.03);
    group.add(tray);
    return group;
  },

  motivationalPoster(text = 'SYNERGY') {
    const group = new THREE.Group();
    // Pick a random accent color from a set of bold corporate shades
    const accents = [0x1a6bc4, 0xe85d04, 0x2d6a4f, 0x9b2335, 0x5a3e8c, 0x0077aa];
    const accent = accents[Math.floor(Math.random() * accents.length)];

    // Thin dark wood frame
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.52, 0.025),
      Materials.custom(0x2a1a0a)
    );
    frame.position.y = 1.5;
    group.add(frame);

    // White/cream paper background
    const bg = new THREE.Mesh(
      new THREE.BoxGeometry(0.54, 0.44, 0.005),
      Materials.custom(0xf5f0e8)
    );
    bg.position.set(0, 1.5, 0.015);
    group.add(bg);

    // Bold color band across the top third
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(0.54, 0.16, 0.006),
      Materials.custom(accent)
    );
    band.position.set(0, 1.64, 0.016);
    group.add(band);

    // Thin accent line below the band
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(0.54, 0.012, 0.006),
      Materials.custom(accent)
    );
    line.position.set(0, 1.555, 0.016);
    group.add(line);

    return group;
  },

  trashCan() {
    const group = new THREE.Group();
    const bodyMat = Materials.custom(0x4a4a4a);
    const rimMat  = Materials.custom(0x333333);

    // Tapered body
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.10, 0.34, 10, 1, false),
      bodyMat
    );
    body.position.y = 0.17;
    group.add(body);

    // Top rim ring (slightly wider lip)
    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.145, 0.135, 0.03, 10),
      rimMat
    );
    rim.position.y = 0.355;
    group.add(rim);

    // Vertical stripe accents (3 evenly spaced)
    const stripeMat = Materials.custom(0x666666);
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.018, 0.28, 0.012),
        stripeMat
      );
      stripe.position.set(Math.cos(angle) * 0.125, 0.18, Math.sin(angle) * 0.125);
      stripe.rotation.y = -angle;
      group.add(stripe);
    }

    group.traverse(c => { if (c.isMesh) c.castShadow = true; });
    return group;
  },

  printer() {
    const group = new THREE.Group();
    // Counter base
    const counterBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.7, 0.52),
      Materials.deskDark()
    );
    counterBody.position.y = 0.35;
    counterBody.castShadow = true;
    counterBody.receiveShadow = true;
    group.add(counterBody);
    const counterTop = new THREE.Mesh(
      new THREE.BoxGeometry(0.64, 0.04, 0.54),
      Materials.desk()
    );
    counterTop.position.y = 0.72;
    counterTop.castShadow = true;
    counterTop.receiveShadow = true;
    group.add(counterTop);
    // Printer body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.3, 0.4),
      Materials.custom(0xe0ddd0)
    );
    body.position.y = 0.87;
    group.add(body);
    // Paper tray
    const tray = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.02, 0.2),
      Materials.custom(0xcccccc)
    );
    tray.position.set(0, 0.73, 0.15);
    group.add(tray);
    group.traverse(c => { if (c.isMesh) { c.castShadow = true; } });
    return group;
  },

  serverRack() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 1.8, 0.5),
      Materials.custom(0x1a1a1a)
    );
    body.position.y = 0.9;
    group.add(body);
    // Blinking lights
    for (let i = 0; i < 6; i++) {
      const light = new THREE.Mesh(
        new THREE.SphereGeometry(0.012, 4, 4),
        Materials.custom(i % 2 === 0 ? 0x00ff00 : 0x00aa00, { emissive: 0x00ff00, emissiveIntensity: 0.8 })
      );
      light.position.set(-0.2 + (i % 3) * 0.1, 0.5 + Math.floor(i / 3) * 0.6, 0.255);
      group.add(light);
    }
    group.traverse(c => { if (c.isMesh) { c.castShadow = true; } });
    return group;
  },

  receptionDesk() {
    const group = new THREE.Group();
    // Front panel (curved feel with box)
    const front = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 1.1, 0.1),
      Materials.deskDark()
    );
    front.position.set(0, 0.55, 0.35);
    group.add(front);
    // Work surface
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 0.04, 0.7),
      Materials.desk()
    );
    top.position.y = 0.72;
    group.add(top);
    // Side panels
    const sideMat = Materials.deskDark();
    const sideGeo = new THREE.BoxGeometry(0.06, 1.1, 0.7);
    const left = new THREE.Mesh(sideGeo, sideMat);
    left.position.set(-1.25, 0.55, 0);
    group.add(left);
    const right = new THREE.Mesh(sideGeo, sideMat);
    right.position.set(1.25, 0.55, 0);
    group.add(right);
    group.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    return group;
  },

  parkingSpot() {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1.0, metalness: 0 });
    const Y = 0.005; // just above the floor
    const SPOT_L = 2.0;
    const SPOT_W = 1.0;
    const LW = 0.06; // line width

    // Left side line
    const sideGeo = new THREE.PlaneGeometry(SPOT_L, LW);
    const left = new THREE.Mesh(sideGeo, mat);
    left.rotation.x = -Math.PI / 2;
    left.position.set(0, Y, -SPOT_W / 2);
    group.add(left);

    // Right side line
    const right = new THREE.Mesh(sideGeo, mat);
    right.rotation.x = -Math.PI / 2;
    right.position.set(0, Y, SPOT_W / 2);
    group.add(right);

    // Back line
    const backGeo = new THREE.PlaneGeometry(LW, SPOT_W);
    const back = new THREE.Mesh(backGeo, mat);
    back.rotation.x = -Math.PI / 2;
    back.position.set(-SPOT_L / 2, Y, 0);
    group.add(back);

    return group;
  },

  car() {
    const group = new THREE.Group();

    const COLORS = [0x1a3a6b, 0xc0c0c0, 0x111111, 0xdddddd, 0x7a1a1a, 0x3a3a3a, 0x1a4a2a, 0xc4a96b];
    const bodyColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.4, metalness: 0.3 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x6699bb, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.55 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
    const rimMat  = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.3, metalness: 0.8 });

    // Lower body
    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.28, 1.85), bodyMat);
    lowerBody.position.y = 0.28;
    group.add(lowerBody);

    // Cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.80, 0.27, 1.05), bodyMat);
    cabin.position.set(0, 0.555, -0.08);
    group.add(cabin);

    // Windshield
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.22, 0.04), glassMat);
    windshield.position.set(0, 0.56, 0.455);
    group.add(windshield);

    // Rear window
    const rearWindow = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.22, 0.04), glassMat);
    rearWindow.position.set(0, 0.56, -0.615);
    group.add(rearWindow);

    // Side windows
    for (const sx of [-0.41, 0.41]) {
      const sideWindow = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.7), glassMat);
      sideWindow.position.set(sx, 0.575, -0.065);
      group.add(sideWindow);
    }

    // Wheels
    for (const [wx, wz] of [[-0.47, 0.62], [0.47, 0.62], [-0.47, -0.62], [0.47, -0.62]]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 14), wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.16, wz);
      group.add(wheel);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.13, 8), rimMat);
      rim.rotation.z = Math.PI / 2;
      rim.position.set(wx, 0.16, wz);
      group.add(rim);
    }

    // Headlights
    const headlightMat = new THREE.MeshStandardMaterial({ color: 0xffffee, emissive: 0xffffee, emissiveIntensity: 0.4 });
    for (const lx of [-0.28, 0.28]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.07, 0.03), headlightMat);
      hl.position.set(lx, 0.3, 0.935);
      group.add(hl);
    }

    // Taillights
    const taillightMat = new THREE.MeshStandardMaterial({ color: 0xcc1111, emissive: 0xcc1111, emissiveIntensity: 0.35 });
    for (const lx of [-0.28, 0.28]) {
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.07, 0.03), taillightMat);
      tl.position.set(lx, 0.3, -0.935);
      group.add(tl);
    }

    // Front bumper
    const bumperMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
    const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.1, 0.06), bumperMat);
    frontBumper.position.set(0, 0.16, 0.935);
    group.add(frontBumper);
    const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.1, 0.06), bumperMat);
    rearBumper.position.set(0, 0.16, -0.935);
    group.add(rearBumper);

    group.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    return group;
  },

  carSUV() {
    const group = new THREE.Group();
    const COLORS = [0x2a3a2a, 0x1a1a2a, 0x3a2a1a, 0x555544, 0x2a2a3a, 0x111111, 0x3a1a1a];
    const bodyColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.5, metalness: 0.25 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x4477aa, roughness: 0.1, transparent: true, opacity: 0.5 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
    const rimMat   = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.8 });

    // Tall boxy lower body
    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.38, 1.88), bodyMat);
    lowerBody.position.y = 0.38;
    group.add(lowerBody);

    // Full-length boxy cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.90, 0.40, 1.30), bodyMat);
    cabin.position.set(0, 0.78, -0.14);
    group.add(cabin);

    // Windshield
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.32, 0.04), glassMat);
    windshield.position.set(0, 0.80, 0.50);
    group.add(windshield);
    const rearWindow = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.30, 0.04), glassMat);
    rearWindow.position.set(0, 0.80, -0.79);
    group.add(rearWindow);
    for (const sx of [-0.46, 0.46]) {
      const sw = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.26, 0.90), glassMat);
      sw.position.set(sx, 0.80, -0.16);
      group.add(sw);
    }

    // Roof rack
    const rackMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.7, metalness: 0.5 });
    for (const rz of [-0.4, 0.1]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.03, 0.05), rackMat);
      bar.position.set(0, 1.19, rz);
      group.add(bar);
    }

    // Larger wheels + rims
    for (const [wx, wz] of [[-0.51, 0.65], [0.51, 0.65], [-0.51, -0.65], [0.51, -0.65]]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.14, 14), wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.20, wz);
      group.add(wheel);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.15, 8), rimMat);
      rim.rotation.z = Math.PI / 2;
      rim.position.set(wx, 0.20, wz);
      group.add(rim);
    }

    const hlMat = new THREE.MeshStandardMaterial({ color: 0xffffee, emissive: 0xffffee, emissiveIntensity: 0.4 });
    const tlMat = new THREE.MeshStandardMaterial({ color: 0xcc1111, emissive: 0xcc1111, emissiveIntensity: 0.35 });
    const bumperMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
    for (const lx of [-0.32, 0.32]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.03), hlMat);
      hl.position.set(lx, 0.42, 0.95);
      group.add(hl);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.03), tlMat);
      tl.position.set(lx, 0.42, -0.95);
      group.add(tl);
    }
    const fb = new THREE.Mesh(new THREE.BoxGeometry(0.90, 0.12, 0.07), bumperMat);
    fb.position.set(0, 0.22, 0.95);
    group.add(fb);
    const rb = new THREE.Mesh(new THREE.BoxGeometry(0.90, 0.12, 0.07), bumperMat);
    rb.position.set(0, 0.22, -0.95);
    group.add(rb);

    group.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    return group;
  },

  carSports() {
    const group = new THREE.Group();
    const COLORS = [0x991111, 0x111133, 0x111111, 0xddbb00, 0xff5500, 0xdddddd, 0x113311];
    const bodyColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.25, metalness: 0.5 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x334455, roughness: 0.05, transparent: true, opacity: 0.45 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    const rimMat   = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.1, metalness: 1.0 });

    // Low, wide body
    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.20, 1.90), bodyMat);
    lowerBody.position.y = 0.20;
    group.add(lowerBody);

    // Short fastback cabin (rear-biased)
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.22, 0.90), bodyMat);
    cabin.position.set(0, 0.41, -0.22);
    group.add(cabin);

    // Sloped windshield
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.18, 0.04), glassMat);
    windshield.position.set(0, 0.41, 0.30);
    windshield.rotation.x = -0.35;
    group.add(windshield);
    const rearWindow = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.16, 0.04), glassMat);
    rearWindow.position.set(0, 0.41, -0.67);
    rearWindow.rotation.x = 0.35;
    group.add(rearWindow);
    for (const sx of [-0.39, 0.39]) {
      const sw = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.55), glassMat);
      sw.position.set(sx, 0.42, -0.20);
      group.add(sw);
    }

    // Side vents
    const ventMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    for (const sx of [-0.43, 0.43]) {
      for (const vz of [0.30, 0.42]) {
        const vent = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.08), ventMat);
        vent.position.set(sx, 0.26, vz);
        group.add(vent);
      }
    }

    // Low-profile wheels with large rims
    for (const [wx, wz] of [[-0.45, 0.66], [0.45, 0.66], [-0.45, -0.66], [0.45, -0.66]]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.10, 14), wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.14, wz);
      group.add(wheel);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.11, 10), rimMat);
      rim.rotation.z = Math.PI / 2;
      rim.position.set(wx, 0.14, wz);
      group.add(rim);
    }

    const hlMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5 });
    const tlMat = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 0.5 });
    const bumperMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.3, metalness: 0.4 });
    for (const lx of [-0.26, 0.26]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.05, 0.03), hlMat);
      hl.position.set(lx, 0.22, 0.96);
      group.add(hl);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.03), tlMat);
      tl.position.set(lx, 0.22, -0.96);
      group.add(tl);
    }
    const fb = new THREE.Mesh(new THREE.BoxGeometry(0.80, 0.08, 0.06), bumperMat);
    fb.position.set(0, 0.12, 0.96);
    group.add(fb);
    const rb = new THREE.Mesh(new THREE.BoxGeometry(0.80, 0.08, 0.06), bumperMat);
    rb.position.set(0, 0.12, -0.96);
    group.add(rb);

    group.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    return group;
  },

  andrewsCar() {
    const group = new THREE.Group();
    // Faded champagne — humble economy car
    const bodyMat   = new THREE.MeshStandardMaterial({ color: 0xbcaa82, roughness: 0.7, metalness: 0.1 });
    const dentMat   = new THREE.MeshStandardMaterial({ color: 0xa09060, roughness: 0.9, metalness: 0.05 });
    const glassMat  = new THREE.MeshStandardMaterial({ color: 0x8899aa, roughness: 0.2, transparent: true, opacity: 0.5 });
    const wheelMat  = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
    const rimMat    = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.5, metalness: 0.5 });
    const bumperMat = new THREE.MeshStandardMaterial({ color: 0x888880, roughness: 0.95 });

    // Compact body — slightly smaller than sedan
    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.26, 1.70), bodyMat);
    lowerBody.position.y = 0.26;
    group.add(lowerBody);

    // Hatchback cabin — tall and short
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.30, 0.88), bodyMat);
    cabin.position.set(0, 0.52, -0.12);
    group.add(cabin);

    // Dent on front-left fender
    const dent = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.10, 0.18), dentMat);
    dent.position.set(-0.41, 0.32, 0.55);
    group.add(dent);

    // Windshield
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.24, 0.04), glassMat);
    windshield.position.set(0, 0.52, 0.33);
    group.add(windshield);
    // Hatchback rear glass (large)
    const rearWindow = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.24, 0.04), glassMat);
    rearWindow.position.set(0, 0.52, -0.56);
    group.add(rearWindow);
    for (const sx of [-0.38, 0.38]) {
      const sw = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.54), glassMat);
      sw.position.set(sx, 0.53, -0.10);
      group.add(sw);
    }

    // Mismatched rear bumper (grey plastic, slightly crooked)
    const rearBumperOff = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.10, 0.06), bumperMat);
    rearBumperOff.position.set(0.02, 0.14, -0.88);
    rearBumperOff.rotation.y = 0.04;
    group.add(rearBumperOff);
    const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.10, 0.06), bumperMat);
    frontBumper.position.set(0, 0.14, 0.88);
    group.add(frontBumper);

    // Wheels (slightly smaller)
    for (const [wx, wz] of [[-0.44, 0.58], [0.44, 0.58], [-0.44, -0.58], [0.44, -0.58]]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.11, 12), wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.14, wz);
      group.add(wheel);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 8), rimMat);
      rim.rotation.z = Math.PI / 2;
      rim.position.set(wx, 0.14, wz);
      group.add(rim);
    }

    const hlMat = new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffffcc, emissiveIntensity: 0.25 });
    const tlMat = new THREE.MeshStandardMaterial({ color: 0xcc1111, emissive: 0xcc1111, emissiveIntensity: 0.3 });
    for (const lx of [-0.26, 0.26]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.03), hlMat);
      hl.position.set(lx, 0.28, 0.88);
      group.add(hl);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.03), tlMat);
      tl.position.set(lx, 0.28, -0.88);
      group.add(tl);
    }

    group.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    return group;
  },

  elevatorDoors() {
    const group = new THREE.Group();
    const doorMat = Materials.metal();
    const leftDoor = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 2.2, 0.04),
      doorMat
    );
    leftDoor.position.set(-0.26, 1.1, 0);
    group.add(leftDoor);
    const rightDoor = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 2.2, 0.04),
      doorMat
    );
    rightDoor.position.set(0.26, 1.1, 0);
    group.add(rightDoor);
    // Frame
    const frameGeo = new THREE.BoxGeometry(1.2, 2.4, 0.06);
    const frame = new THREE.Mesh(frameGeo, Materials.custom(0x666666));
    frame.position.set(0, 1.2, -0.02);
    group.add(frame);
    return group;
  },
};
