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

  grandDesk() {
    const group = new THREE.Group();
    const W = 2.4, D = 1.0;

    const mahogany      = Materials.custom(0x2c1508);
    const mahoganyMid   = Materials.custom(0x3d1f0a);
    const mahoganyLight = Materials.custom(0x5a2e10);
    const gold          = Materials.custom(0xc8960a);

    // === Desktop surface (thick, overhanging) ===
    const topGeo = new THREE.BoxGeometry(W + 0.12, 0.06, D + 0.08);
    const top = new THREE.Mesh(topGeo, mahoganyLight);
    top.position.y = 0.78;
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);

    // Gold front edge trim
    const frontTrimGeo = new THREE.BoxGeometry(W + 0.12, 0.03, 0.03);
    const frontTrim = new THREE.Mesh(frontTrimGeo, gold);
    frontTrim.position.set(0, 0.765, (D + 0.08) / 2);
    group.add(frontTrim);

    // Gold left/right edge trim
    const sideTrimGeo = new THREE.BoxGeometry(0.03, 0.03, D + 0.08);
    [-1, 1].forEach(side => {
      const t = new THREE.Mesh(sideTrimGeo, gold);
      t.position.set(side * (W + 0.12) / 2, 0.765, 0);
      group.add(t);
    });

    // === Left pedestal ===
    const pedGeo = new THREE.BoxGeometry(0.52, 0.75, D - 0.06);
    const pedLeft = new THREE.Mesh(pedGeo, mahogany);
    pedLeft.position.set(-(W / 2 - 0.28), 0.375, 0);
    pedLeft.castShadow = true;
    pedLeft.receiveShadow = true;
    group.add(pedLeft);

    // === Right pedestal ===
    const pedRight = new THREE.Mesh(pedGeo, mahogany);
    pedRight.position.set((W / 2 - 0.28), 0.375, 0);
    pedRight.castShadow = true;
    pedRight.receiveShadow = true;
    group.add(pedRight);

    // Drawer facades on both pedestals (3 drawers each, facing front)
    const drawerFaceGeo = new THREE.BoxGeometry(0.44, 0.14, 0.025);
    const drawerHandleGeo = new THREE.BoxGeometry(0.14, 0.022, 0.03);
    [-(W / 2 - 0.28), (W / 2 - 0.28)].forEach(px => {
      for (let i = 0; i < 3; i++) {
        const face = new THREE.Mesh(drawerFaceGeo, mahoganyMid);
        face.position.set(px, 0.16 + i * 0.19, (D - 0.06) / 2 + 0.013);
        group.add(face);
        const handle = new THREE.Mesh(drawerHandleGeo, gold);
        handle.position.set(px, 0.16 + i * 0.19, (D - 0.06) / 2 + 0.03);
        group.add(handle);
      }
    });

    // === Center modesty panel (between pedestals) ===
    const modGeo = new THREE.BoxGeometry(W - 1.22, 0.6, 0.04);
    const mod = new THREE.Mesh(modGeo, mahogany);
    mod.position.set(0, 0.44, (D - 0.06) / 2 + 0.02);
    group.add(mod);

    // Gold trim along top of modesty panel
    const modTrimGeo = new THREE.BoxGeometry(W - 1.22, 0.025, 0.05);
    const modTrim = new THREE.Mesh(modTrimGeo, gold);
    modTrim.position.set(0, 0.745, (D - 0.06) / 2 + 0.025);
    group.add(modTrim);

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

  executiveChair() {
    const group = new THREE.Group();
    const leather   = Materials.custom(0x111118);
    const leatherMid = Materials.custom(0x1e1e28);
    const chrome    = Materials.custom(0xaaaaaa);

    // Seat — wide, padded
    const seatGeo = new THREE.BoxGeometry(0.58, 0.09, 0.52);
    const seat = new THREE.Mesh(seatGeo, leather);
    seat.position.y = 0.46;
    group.add(seat);

    // Seat cushion top (slightly lighter for depth)
    const cushGeo = new THREE.BoxGeometry(0.5, 0.03, 0.44);
    const cush = new THREE.Mesh(cushGeo, leatherMid);
    cush.position.set(0, 0.515, 0.02);
    group.add(cush);

    // High back
    const backGeo = new THREE.BoxGeometry(0.56, 0.88, 0.08);
    const back = new THREE.Mesh(backGeo, leather);
    back.position.set(0, 0.93, -0.23);
    group.add(back);

    // Back cushion panel (tufted look — slightly raised center)
    const backCushGeo = new THREE.BoxGeometry(0.46, 0.76, 0.04);
    const backCush = new THREE.Mesh(backCushGeo, leatherMid);
    backCush.position.set(0, 0.93, -0.19);
    group.add(backCush);

    // Headrest
    const headGeo = new THREE.BoxGeometry(0.4, 0.2, 0.09);
    const head = new THREE.Mesh(headGeo, leather);
    head.position.set(0, 1.42, -0.23);
    group.add(head);

    const headCushGeo = new THREE.BoxGeometry(0.32, 0.14, 0.04);
    const headCush = new THREE.Mesh(headCushGeo, leatherMid);
    headCush.position.set(0, 1.42, -0.19);
    group.add(headCush);

    // Armrests (left and right)
    const armPostGeo = new THREE.BoxGeometry(0.04, 0.28, 0.04);
    const armPadGeo  = new THREE.BoxGeometry(0.14, 0.04, 0.36);
    [-1, 1].forEach(side => {
      const armPost = new THREE.Mesh(armPostGeo, chrome);
      armPost.position.set(side * 0.29, 0.59, -0.04);
      group.add(armPost);
      const armPad = new THREE.Mesh(armPadGeo, leather);
      armPad.position.set(side * 0.29, 0.75, -0.04);
      group.add(armPad);
    });

    // Gas cylinder post
    const postGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.44, 8);
    const post = new THREE.Mesh(postGeo, chrome);
    post.position.y = 0.22;
    group.add(post);

    // 5-point star base (slightly larger than standard)
    const baseGeo = new THREE.CylinderGeometry(0.27, 0.27, 0.03, 5);
    const base = new THREE.Mesh(baseGeo, chrome);
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

  supplyShop() {
    const group = new THREE.Group();
    const wood = Materials.custom(0x8b6914);
    const woodLight = Materials.custom(0xb8860b);
    const signMat = Materials.custom(0xf5f0e8);
    const signStripe = Materials.custom(0x2a7a6a);

    // Counter base
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.82, 0.55),
      wood
    );
    base.position.set(0, 0.41, 0);
    group.add(base);

    // Counter top surface (slightly lighter)
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(0.82, 0.04, 0.57),
      woodLight
    );
    top.position.set(0, 0.84, 0);
    group.add(top);

    // Display shelf back panel
    const shelfBack = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.38, 0.04),
      wood
    );
    shelfBack.position.set(0, 1.1, -0.22);
    group.add(shelfBack);

    // Display shelf floor
    const shelfFloor = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.03, 0.26),
      woodLight
    );
    shelfFloor.position.set(0, 0.92, -0.09);
    group.add(shelfFloor);

    // Display shelf left side panel
    const shelfLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.38, 0.26),
      wood
    );
    shelfLeft.position.set(-0.345, 1.1, -0.09);
    group.add(shelfLeft);

    // Display shelf right side panel
    const shelfRight = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.38, 0.26),
      wood
    );
    shelfRight.position.set(0.345, 1.1, -0.09);
    group.add(shelfRight);

    // Shelf item: blue bottle (left)
    const bottle1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.18, 6),
      Materials.custom(0x2255cc)
    );
    bottle1.position.set(-0.18, 1.02, -0.09);
    group.add(bottle1);

    // Shelf item: red box (center)
    const box1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.14, 0.08),
      Materials.custom(0xcc3322)
    );
    box1.position.set(0, 1.01, -0.1);
    group.add(box1);

    // Shelf item: yellow canister (right)
    const can1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.15, 6),
      Materials.custom(0xddaa00)
    );
    can1.position.set(0.18, 1.0, -0.09);
    group.add(can1);

    // Front sign panel
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.1, 0.02),
      signMat
    );
    sign.position.set(0, 0.58, 0.285);
    group.add(sign);

    // Sign teal stripe
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.035, 0.022),
      signStripe
    );
    stripe.position.set(0, 0.565, 0.285);
    group.add(stripe);

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

  boardroomTable() {
    const group = new THREE.Group();
    // Geometry is left-edge aligned: local origin = front-left corner
    // so placement coord matches blockRect (which blocks in +x, +z direction)
    const W = 8.0, D = 2.0;
    const cx = W / 2, cz = D / 2;  // center offsets

    const mahogany     = Materials.custom(0x1e0700);
    const mahoganyMid  = Materials.custom(0x3a0e00);
    const mahoganyHi   = Materials.custom(0x52180a);
    const gold         = Materials.custom(0xc9a84c);
    const goldDark     = Materials.custom(0x8a6b1e);

    // ── Tabletop ──────────────────────────────────────────────
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(W, 0.09, D),
      mahogany
    );
    top.position.set(cx, 0.78, cz);
    group.add(top);

    // Polished highlight panel (lighter strip running length of table)
    const highlight = new THREE.Mesh(
      new THREE.BoxGeometry(W - 0.6, 0.005, D - 0.6),
      mahoganyHi
    );
    highlight.position.set(cx, 0.836, cz);
    group.add(highlight);

    // Central inlay panel (slightly lighter, recessed look)
    const inlay = new THREE.Mesh(
      new THREE.BoxGeometry(W - 1.4, 0.004, D - 1.0),
      mahoganyMid
    );
    inlay.position.set(cx, 0.837, cz);
    group.add(inlay);

    // ── Gold trim band around table edge (vertical side strip) ─
    const trimH = 0.055, trimT = 0.018;
    // Long north/south sides
    [[cz - D / 2 + trimT / 2], [cz + D / 2 - trimT / 2]].forEach(([z]) => {
      const t = new THREE.Mesh(new THREE.BoxGeometry(W, trimH, trimT), gold);
      t.position.set(cx, 0.752, z);
      group.add(t);
    });
    // Short west/east ends
    [[cx - W / 2 + trimT / 2], [cx + W / 2 - trimT / 2]].forEach(([x]) => {
      const t = new THREE.Mesh(new THREE.BoxGeometry(trimT, trimH, D), gold);
      t.position.set(x, 0.752, cz);
      group.add(t);
    });

    // Gold inlay line on top surface (border)
    const lineT = 0.03, lineH = 0.003;
    [[cz - D / 2 + lineT], [cz + D / 2 - lineT]].forEach(([z]) => {
      const l = new THREE.Mesh(new THREE.BoxGeometry(W - lineT * 2, lineH, lineT), gold);
      l.position.set(cx, 0.838, z);
      group.add(l);
    });
    [[cx - W / 2 + lineT], [cx + W / 2 - lineT]].forEach(([x]) => {
      const l = new THREE.Mesh(new THREE.BoxGeometry(lineT, lineH, D - lineT * 2), gold);
      l.position.set(x, 0.838, cz);
      group.add(l);
    });

    // ── Ornate column legs (4 pairs — 8 legs total) ───────────
    const legPositions = [
      [cx - 3.4, cz - 0.75], [cx - 3.4, cz + 0.75],
      [cx - 1.1, cz - 0.75], [cx - 1.1, cz + 0.75],
      [cx + 1.1, cz - 0.75], [cx + 1.1, cz + 0.75],
      [cx + 3.4, cz - 0.75], [cx + 3.4, cz + 0.75],
    ];
    legPositions.forEach(([x, z]) => {
      // Leg body (tapered top-to-bottom via two boxes)
      const upper = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.44, 0.16), mahogany);
      upper.position.set(x, 0.56, z);
      group.add(upper);
      const lower = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.30, 0.13), mahogany);
      lower.position.set(x, 0.15, z);
      group.add(lower);
      // Gold capital (top cap)
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.022, 0.21), gold);
      cap.position.set(x, 0.772, z);
      group.add(cap);
      // Gold base foot
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.018, 0.18), goldDark);
      foot.position.set(x, 0.009, z);
      group.add(foot);
    });

    // ── Stretcher rails connecting leg pairs ──────────────────
    [cz - 0.75, cz + 0.75].forEach(z => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(W - 0.8, 0.06, 0.07), mahogany);
      rail.position.set(cx, 0.22, z);
      group.add(rail);
    });
    // Cross-stretchers
    [cx - 3.4, cx - 1.1, cx + 1.1, cx + 3.4].forEach(x => {
      const xrail = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, D - 0.5), mahogany);
      xrail.position.set(x, 0.22, cz);
      group.add(xrail);
    });

    // ── Speakerphone centerpiece ──────────────────────────────
    const spkBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.16, 0.035, 6),
      Materials.custom(0x1a1a1a)
    );
    spkBase.position.set(cx, 0.843, cz);
    group.add(spkBase);
    const spkBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.10, 0.12, 0.028, 6),
      Materials.custom(0x2a2a2a)
    );
    spkBody.position.set(cx, 0.856, cz);
    group.add(spkBody);

    group.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
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

  staircase() {
    const group = new THREE.Group();
    const stepMat = Materials.custom(0x888888);
    const railMat = Materials.metal();
    // 3 visible steps going up
    for (let i = 0; i < 3; i++) {
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.12, 0.5),
        stepMat
      );
      step.position.set(0, 0.12 + i * 0.24, -i * 0.5);
      step.castShadow = true;
      step.receiveShadow = true;
      group.add(step);
    }
    // Side rails
    for (const sx of [-0.85, 0.85]) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 1.0, 1.6),
        railMat
      );
      rail.position.set(sx, 0.6, -0.5);
      rail.castShadow = true;
      group.add(rail);
    }
    group.traverse(c => { if (c.isMesh) c.castShadow = true; });
    return group;
  },

  // Full descending staircase flight for the stairwell room
  // Steps start raised (south/top) and descend to floor level (north/bottom)
  stairFlight(stepCount = 16, totalWidth = 3.2, totalDepth = 14, totalDescent = 0.7) {
    const group = new THREE.Group();
    const stepMat = Materials.custom(0x8a8a8a);
    const riseMat = Materials.custom(0x626262);
    const railMat = Materials.metal();
    const noseMat = Materials.custom(0xaaaaaa);

    const stepDepth = totalDepth / stepCount;
    const stepDrop = totalDescent / stepCount;
    const treadThick = 0.10;

    for (let i = 0; i < stepCount; i++) {
      const z = -i * stepDepth;
      // Start at totalDescent height and descend — all steps above floor
      const y = totalDescent - i * stepDrop;

      // Tread (horizontal surface)
      const tread = new THREE.Mesh(
        new THREE.BoxGeometry(totalWidth, treadThick, stepDepth * 0.92),
        stepMat
      );
      tread.position.set(0, y, z);
      tread.receiveShadow = true;
      tread.castShadow = true;
      group.add(tread);

      // Nose edge (light stripe at front of each step for visual separation)
      const nose = new THREE.Mesh(
        new THREE.BoxGeometry(totalWidth + 0.02, treadThick + 0.02, 0.05),
        noseMat
      );
      nose.position.set(0, y + 0.005, z + stepDepth * 0.45);
      group.add(nose);

      // Riser (vertical face between steps)
      if (i > 0) {
        const riser = new THREE.Mesh(
          new THREE.BoxGeometry(totalWidth, stepDrop + treadThick, 0.04),
          riseMat
        );
        riser.position.set(0, y + stepDrop * 0.5, z + stepDepth * 0.46);
        riser.castShadow = true;
        group.add(riser);
      }

      // Solid fill under each step (so you don't see through from below)
      const fill = new THREE.Mesh(
        new THREE.BoxGeometry(totalWidth, y + treadThick / 2, stepDepth * 0.92),
        riseMat
      );
      fill.position.set(0, (y + treadThick / 2) / 2 - treadThick / 2, z);
      group.add(fill);
    }

    // Side railings — posts + handrail
    const railHeight = 0.8;
    const postSpacing = 3; // post every N steps
    const postCount = Math.ceil(stepCount / postSpacing);
    for (const sx of [-totalWidth / 2 - 0.04, totalWidth / 2 + 0.04]) {
      // Angled top handrail following the descent
      const railLen = Math.sqrt(totalDepth * totalDepth + totalDescent * totalDescent);
      const railAngle = -Math.atan2(totalDescent, totalDepth);
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.06, railLen),
        railMat
      );
      rail.position.set(sx, totalDescent / 2 + railHeight, -totalDepth / 2);
      rail.rotation.x = railAngle;
      rail.castShadow = true;
      group.add(rail);

      // Vertical posts
      for (let p = 0; p <= postCount; p++) {
        const frac = p / postCount;
        const pz = -frac * totalDepth;
        const py = totalDescent * (1 - frac);
        const postHeight = railHeight + 0.1;
        const post = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, postHeight, 0.05),
          railMat
        );
        post.position.set(sx, py + postHeight * 0.5, pz);
        post.castShadow = true;
        group.add(post);
      }
    }

    return group;
  },

  cobweb() {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.25,
      roughness: 1.0,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    const geo = new THREE.PlaneGeometry(0.4, 0.4);
    const web = new THREE.Mesh(geo, mat);
    web.position.y = 2.2;
    web.rotation.x = -Math.PI / 4;
    group.add(web);
    return group;
  },

  safeDepositBox() {
    const group = new THREE.Group();
    const bodyMat = Materials.custom(0x777788);
    const handleMat = Materials.custom(0x999999);
    // Box body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.3, 0.5),
      bodyMat
    );
    body.position.y = 0.15;
    group.add(body);
    // Handle
    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.04, 0.02),
      handleMat
    );
    handle.position.set(0, 0.2, 0.26);
    group.add(handle);
    // Keyhole
    const keyhole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.02, 8),
      Materials.custom(0x333333)
    );
    keyhole.rotation.x = Math.PI / 2;
    keyhole.position.set(0, 0.12, 0.26);
    group.add(keyhole);
    group.traverse(c => { if (c.isMesh) c.castShadow = true; });
    return group;
  },

  grandPainting() {
    const group = new THREE.Group();

    const FW = 1.4,  FH = 1.1;   // outer frame dimensions
    const CW = 1.06, CH = 0.78;  // canvas inner dimensions
    const Y  = 1.80;             // center height on wall

    const fBacking = Materials.custom(0x2a1604);
    const fGold    = Materials.custom(0xa06c0c);
    const fLight   = Materials.custom(0xd4a030);
    const fLiner   = Materials.custom(0x080602);

    // Helper: add a box mesh at (x, y, z) with given size and material
    const add = (x, y, z, w, h, d, mat) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      mesh.position.set(x, y, z);
      group.add(mesh);
    };

    const BZ = 0.0175; // base z offset (half backing thickness)

    // ── Backing plate ────────────────────────────────────────
    add(0, Y, 0, FW, FH, 0.035, fBacking);

    // ── Raised border strips ─────────────────────────────────
    const BW = 0.135, BT = 0.068, BZc = BZ + BT / 2;
    add(0,            Y + FH/2 - BW/2, BZc, FW,        BW,        BT, fGold); // top
    add(0,            Y - FH/2 + BW/2, BZc, FW,        BW,        BT, fGold); // bottom
    add(-FW/2 + BW/2, Y,               BZc, BW, FH - BW*2,        BT, fGold); // left
    add( FW/2 - BW/2, Y,               BZc, BW, FH - BW*2,        BT, fGold); // right

    // ── Corner ornaments (slightly proud of border strips) ───
    const CRN = 0.148, CRNZ = BZc + 0.006;
    [[-FW/2 + BW/2, Y + FH/2 - BW/2],
     [ FW/2 - BW/2, Y + FH/2 - BW/2],
     [-FW/2 + BW/2, Y - FH/2 + BW/2],
     [ FW/2 - BW/2, Y - FH/2 + BW/2],
    ].forEach(([x, y]) => add(x, y, CRNZ, CRN, CRN, BT + 0.012, fLight));

    // ── Highlight line (bright thin edge inside border) ──────
    const HL = 0.018, HZ = BZc + BT / 2 + 0.001;
    const IW = CW + HL * 2 + 0.04, IH = CH + HL * 2 + 0.04;
    add(0,          Y + IH/2 - HL/2, HZ, IW,  HL, 0.003, fLight); // top
    add(0,          Y - IH/2 + HL/2, HZ, IW,  HL, 0.003, fLight); // bottom
    add(-IW/2 + HL/2, Y,             HZ, HL,  IH, 0.003, fLight); // left
    add( IW/2 - HL/2, Y,             HZ, HL,  IH, 0.003, fLight); // right

    // ── Dark liner strip (between frame and canvas) ──────────
    const LN = 0.016, LZ = HZ + 0.002;
    add(0,            Y + CH/2 + LN/2, LZ, CW + LN*2, LN, 0.002, fLiner);
    add(0,            Y - CH/2 - LN/2, LZ, CW + LN*2, LN, 0.002, fLiner);
    add(-CW/2 - LN/2, Y,               LZ, LN,        CH, 0.002, fLiner);
    add( CW/2 + LN/2, Y,               LZ, LN,        CH, 0.002, fLiner);

    // ── Canvas — layered landscape composition ───────────────
    const CZ = LZ + 0.003;
    const layers = [
      { h: 0.16, c: 0x120a02 },  // dark earth foreground
      { h: 0.17, c: 0x6a4214 },  // warm amber midground
      { h: 0.14, c: 0x3e682a },  // sunlit foliage
      { h: 0.12, c: 0x3a5870 },  // distant hills / haze
      { h: 0.11, c: 0xa05e28 },  // warm horizon glow
      { h: 0.10, c: 0x3a5080 },  // lower sky
      { h: 0.20, c: 0x1c2a58 },  // deep upper sky
    ];
    let yBot = Y - CH / 2;
    for (const layer of layers) {
      const lh = layer.h * CH;
      add(0, yBot + lh / 2, CZ, CW - 0.006, lh - 0.004, 0.003, Materials.custom(layer.c));
      yBot += lh;
    }

    group.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    return group;
  },

  oilPainting() {
    const group = new THREE.Group();
    // Thick gold frame
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.56, 0.04),
      Materials.custom(0xb8860b)
    );
    frame.position.y = 1.5;
    group.add(frame);
    // Dark canvas
    const canvasColors = [0x2a1a0a, 0x1a2a1a, 0x1a1a2a, 0x2a1a1a, 0x1a1a1a];
    const canvasColor = canvasColors[Math.floor(Math.random() * canvasColors.length)];
    const canvas = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.44, 0.005),
      Materials.custom(canvasColor)
    );
    canvas.position.set(0, 1.5, 0.022);
    group.add(canvas);
    // Inner gold trim
    const trimMat = Materials.custom(0xdaa520);
    const topTrim = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.02, 0.006), trimMat);
    topTrim.position.set(0, 1.73, 0.023);
    group.add(topTrim);
    const bottomTrim = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.02, 0.006), trimMat);
    bottomTrim.position.set(0, 1.27, 0.023);
    group.add(bottomTrim);
    return group;
  },

  abstractPainting() {
    // Modern abstract — steel frame, Rothko-style horizontal colour fields
    const group = new THREE.Group();
    const FW = 1.2, FH = 0.95, Y = 1.78, BZ = 0.012;
    const steel = new THREE.MeshStandardMaterial({ color: 0x888899, roughness: 0.3, metalness: 0.85 });
    const BW = 0.06, BT = 0.04, BZc = BZ + BT / 2;

    const add = (x, y, z, w, h, d, mat) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      group.add(m);
    };

    // Backing plate
    add(0, Y, 0, FW, FH, BZ * 2, Materials.custom(0x111111));
    // Thin steel frame strips
    add(0,             Y + FH/2 - BW/2, BZc, FW,       BW,         BT, steel);
    add(0,             Y - FH/2 + BW/2, BZc, FW,       BW,         BT, steel);
    add(-FW/2 + BW/2,  Y,               BZc, BW, FH - BW*2,        BT, steel);
    add( FW/2 - BW/2,  Y,               BZc, BW, FH - BW*2,        BT, steel);

    // Canvas — horizontal colour field bands
    const CW = FW - BW * 2 - 0.02;
    const CH = FH - BW * 2 - 0.02;
    const CZ = BZc + BT / 2 + 0.003;
    const bands = [
      { h: 0.30, c: 0x7a1515 },  // deep crimson
      { h: 0.07, c: 0x1c1208 },  // dark divider
      { h: 0.36, c: 0x111630 },  // deep indigo
      { h: 0.07, c: 0x0e0e0e },  // dark divider
      { h: 0.20, c: 0x3e2108 },  // burnt amber
    ];
    let yBot = Y - CH / 2;
    for (const b of bands) {
      const bh = b.h * CH;
      add(0, yBot + bh / 2, CZ, CW, bh - 0.003, 0.004, Materials.custom(b.c));
      yBot += bh;
    }

    group.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    return group;
  },

  portraitPainting() {
    // Formal executive portrait — ornate dark walnut frame, implied figure on canvas
    const group = new THREE.Group();
    const FW = 0.95, FH = 1.25, Y = 1.88, BZ = 0.018;
    const frameWood = Materials.custom(0x1a0e04);
    const gold      = Materials.custom(0xc8960a);
    const goldLight = Materials.custom(0xe0b030);
    const BW = 0.115, BT = 0.07, BZc = BZ + BT / 2;

    const add = (x, y, z, w, h, d, mat) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      group.add(m);
    };

    // Backing
    add(0, Y, 0, FW, FH, BZ * 2, frameWood);
    // Frame border strips
    add(0,            Y + FH/2 - BW/2, BZc, FW,        BW,       BT, frameWood);
    add(0,            Y - FH/2 + BW/2, BZc, FW,        BW,       BT, frameWood);
    add(-FW/2 + BW/2, Y,               BZc, BW, FH - BW*2,       BT, frameWood);
    add( FW/2 - BW/2, Y,               BZc, BW, FH - BW*2,       BT, frameWood);
    // Gold corner ornaments
    const COZ = BZc + 0.006;
    [[-FW/2+BW/2, Y+FH/2-BW/2], [FW/2-BW/2, Y+FH/2-BW/2],
     [-FW/2+BW/2, Y-FH/2+BW/2], [FW/2-BW/2, Y-FH/2+BW/2],
    ].forEach(([cx, cy]) => add(cx, cy, COZ, 0.125, 0.125, BT + 0.01, gold));
    // Gold inner highlight line
    const CW = FW - BW*2 - 0.01, CH = FH - BW*2 - 0.01;
    const HZ = BZc + BT/2 + 0.001, HL = 0.012;
    add(0, Y + CH/2 + HL/2, HZ, CW + HL*2, HL, 0.002, goldLight);
    add(0, Y - CH/2 - HL/2, HZ, CW + HL*2, HL, 0.002, goldLight);
    add(-CW/2 - HL/2, Y, HZ, HL, CH, 0.002, goldLight);
    add( CW/2 + HL/2, Y, HZ, HL, CH, 0.002, goldLight);
    // Portrait canvas — dark background, implied suited figure + face
    const CZ = HZ + 0.003;
    add(0, Y, CZ, CW, CH, 0.003, Materials.custom(0x0c0905));         // background
    add(0, Y - CH*0.12, CZ+0.002, CW*0.50, CH*0.58, 0.003, Materials.custom(0x171008)); // coat body
    add(0, Y + CH*0.24, CZ+0.002, CW*0.19, CH*0.22, 0.003, Materials.custom(0x523620)); // face highlight
    add(-CW*0.10, Y+CH*0.06, CZ+0.002, CW*0.13, CH*0.09, 0.003, Materials.custom(0x241a0e)); // shoulder L
    add( CW*0.10, Y+CH*0.06, CZ+0.002, CW*0.13, CH*0.09, 0.003, Materials.custom(0x241a0e)); // shoulder R

    group.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    return group;
  },

  chargingBull() {
    const group    = new THREE.Group();
    const bronze     = new THREE.MeshStandardMaterial({ color: 0x9b6a3e, roughness: 0.42, metalness: 0.85 });
    const darkBronze = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.55, metalness: 0.75 });
    const highlight  = new THREE.MeshStandardMaterial({ color: 0xc8874a, roughness: 0.3,  metalness: 0.9  });
    const yAxis      = new THREE.Vector3(0, 1, 0);

    // Helper: place a cylinder precisely between two 3-D anchor points.
    // setFromUnitVectors rotates the default Y-axis to the leg direction,
    // guaranteeing the cylinder end-caps land exactly on both anchors.
    function cylinder(rTop, rBot, from, to, mat) {
      const dir = new THREE.Vector3().subVectors(to, from).normalize();
      const len = from.distanceTo(to);
      const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
      const segs = Math.max(8, Math.round(rTop * 200));
      const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, len, segs), mat);
      m.quaternion.setFromUnitVectors(yAxis, dir);
      m.position.copy(mid);
      return m;
    }

    // ── Pedestal ──────────────────────────────────────────────────
    const pedestalBase = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.10, 0.72), darkBronze);
    pedestalBase.position.set(0, 0.05, 0);
    pedestalBase.receiveShadow = true;
    group.add(pedestalBase);
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.22, 0.60), darkBronze);
    plinth.position.set(0, 0.21, 0);
    group.add(plinth);

    // All anatomy is built in absolute world-space coordinates.
    // G  = plinth top surface (y = 0.32) — hooves rest here.
    // BY = body centre, set high enough so body-bottom clears G by ~0.5 units,
    //      leaving room for legs.  Body vertical radius = 0.44 × 0.88 = 0.387
    //      → body bottom ≈ BY − 0.387 = 0.813.  Leg hip anchors sit at
    //      BY − 0.30 = 0.90, which is 0.09 above the body bottom — visually
    //      embedded inside the lower torso with no gap.
    const G  = 0.32;
    const BY = 1.2;
    const hipY = BY - 0.30;   // 0.90 — leg-top anchor, inside lower body

    // ── Body ──────────────────────────────────────────────────────
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.44, 20, 14), bronze);
    body.scale.set(1.55, 0.88, 0.78);
    body.position.set(0, BY, 0);
    group.add(body);

    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), bronze);
    shoulder.scale.set(1.0, 0.9, 0.85);
    shoulder.position.set(0.36, BY + 0.08, 0);
    group.add(shoulder);

    const rump = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), bronze);
    rump.scale.set(0.85, 0.9, 0.88);
    rump.position.set(-0.48, BY - 0.06, 0);
    group.add(rump);

    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 10), bronze);
    belly.scale.set(1.3, 0.55, 0.7);
    belly.position.set(0, BY - 0.22, 0);
    group.add(belly);

    const hump = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), bronze);
    hump.scale.set(0.75, 1.25, 0.75);
    hump.position.set(-0.12, BY + 0.32, 0);
    group.add(hump);

    // ── Neck ──────────────────────────────────────────────────────
    // Anchor points → cylinder() does the math.
    group.add(cylinder(0.14, 0.20,
      new THREE.Vector3(0.44, BY + 0.18, 0),   // base (inside body)
      new THREE.Vector3(0.82, BY + 0.02, 0),   // tip  (near head)
      bronze));

    const dewlap = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), bronze);
    dewlap.scale.set(0.7, 1.4, 0.7);
    dewlap.position.set(0.60, BY - 0.04, 0);
    group.add(dewlap);

    // ── Head ──────────────────────────────────────────────────────
    const HX = 0.88, HY = BY + 0.08;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 14), bronze);
    head.scale.set(1.35, 0.92, 0.88);
    head.position.set(HX, HY, 0);
    group.add(head);

    const forehead = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), bronze);
    forehead.scale.set(0.9, 0.65, 1.1);
    forehead.position.set(HX + 0.06, HY + 0.14, 0);
    group.add(forehead);

    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.26), bronze);
    snout.position.set(HX + 0.22, HY - 0.05, 0);
    group.add(snout);

    const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.10, 12, 10), bronze);
    noseTip.scale.set(0.7, 0.65, 1.0);
    noseTip.position.set(HX + 0.32, HY - 0.05, 0);
    group.add(noseTip);

    const nostrilL = new THREE.Mesh(new THREE.SphereGeometry(0.034, 8, 6), darkBronze);
    nostrilL.position.set(HX + 0.35, HY - 0.03, -0.085);
    group.add(nostrilL);
    const nostrilR = nostrilL.clone();
    nostrilR.position.set(HX + 0.35, HY - 0.03,  0.085);
    group.add(nostrilR);

    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.040, 8, 8), darkBronze);
    eyeL.position.set(HX + 0.08, HY + 0.10, -0.19);
    group.add(eyeL);
    const eyeR = eyeL.clone();
    eyeR.position.set(HX + 0.08, HY + 0.10,  0.19);
    group.add(eyeR);

    // ── Horns ─────────────────────────────────────────────────────
    for (const zSign of [-1, 1]) {
      group.add(cylinder(0.014, 0.05,
        new THREE.Vector3(HX + 0.46, HY + 0.50, zSign * 0.30),  // tip (pointed end)
        new THREE.Vector3(HX + 0.10, HY + 0.22, zSign * 0.18),  // base (wide end)
        highlight));
    }

    const earL = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.18, 8), bronze);
    earL.rotation.z = -Math.PI / 6;
    earL.rotation.x =  Math.PI / 5;
    earL.position.set(HX - 0.04, HY + 0.19, -0.22);
    group.add(earL);
    const earR = earL.clone();
    earR.rotation.x = -Math.PI / 5;
    earR.position.set(HX - 0.04, HY + 0.19,  0.22);
    group.add(earR);

    // ── Legs ──────────────────────────────────────────────────────
    // Each leg is one cylinder drawn between two exact anchor points:
    //   foot anchor = centre of the hoof on the plinth (y = G + 0.06)
    //   hip  anchor = inside the lower-body geometry (y = hipY = 0.90)
    // The hoof box bottom face lands on the plinth: centre at G + 0.06,
    // box height 0.12, so bottom = G + 0.06 − 0.06 = G = 0.32 ✓
    function makeLeg(footX, footZ, hipX, hipZ, footYIn) {
      const fy   = (footYIn !== undefined) ? footYIn : (G + 0.06);
      const foot = new THREE.Vector3(footX, fy,   footZ);
      const hip  = new THREE.Vector3(hipX,  hipY, hipZ);
      // Hoof
      const hoofMesh = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.12, 0.18), darkBronze);
      hoofMesh.position.set(footX, fy, footZ);
      group.add(hoofMesh);
      // Leg cylinder — runs exactly from hoof centre to hip anchor
      group.add(cylinder(0.078, 0.095, foot, hip, bronze));
    }

    // Front-left  — lunging: hoof raised and thrust forward, 45° diagonal
    makeLeg( 0.58, -0.26,  0.28, -0.22, G + 0.28);
    // Front-right — planted: nearly vertical
    makeLeg( 0.30,  0.26,  0.22,  0.22);
    // Rear-left   — pushed back, powering the charge
    makeLeg(-0.52, -0.26, -0.28, -0.22);
    // Rear-right  — tucked slightly forward
    makeLeg(-0.28,  0.26, -0.20,  0.22);

    // ── Tail ──────────────────────────────────────────────────────
    const tailPts = [
      new THREE.Vector3(-0.68, BY + 0.02, 0),
      new THREE.Vector3(-0.90, BY + 0.34, 0),
      new THREE.Vector3(-1.06, BY + 0.58, 0),
    ];
    group.add(cylinder(0.038, 0.055, tailPts[0], tailPts[1], bronze));
    group.add(cylinder(0.024, 0.038, tailPts[1], tailPts[2], bronze));

    const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), bronze);
    tuft.scale.set(0.7, 1.3, 0.7);
    tuft.position.copy(tailPts[2]);
    group.add(tuft);

    group.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    return group;
  },

  sculpture() {
    const group = new THREE.Group();
    const matA = Materials.custom(0x888899);
    const matB = Materials.custom(0x667788);
    const matC = Materials.custom(0x998877);
    // Base cylinder
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.18, 0.6, 12),
      matA
    );
    base.position.y = 0.3;
    group.add(base);
    // Middle box
    const mid = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.3, 0.22),
      matB
    );
    mid.position.y = 0.75;
    mid.rotation.y = Math.PI / 4;
    group.add(mid);
    // Top sphere
    const top = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 12, 10),
      matC
    );
    top.position.y = 1.05;
    group.add(top);
    group.traverse(c => { if (c.isMesh) c.castShadow = true; });
    return group;
  },

  puttingGreen() {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: 0x2d8a4e,
      roughness: 0.9,
      metalness: 0,
    });
    const geo = new THREE.BoxGeometry(2.8, 0.02, 1.6);
    const green = new THREE.Mesh(geo, mat);
    green.position.y = 0.01;
    green.receiveShadow = true;
    group.add(green);
    // Hole marker
    const hole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.005, 10),
      Materials.custom(0x111111)
    );
    hole.position.set(1.0, 0.025, 0);
    group.add(hole);
    // Flag stick
    const stick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.4, 6),
      Materials.custom(0xdddddd)
    );
    stick.position.set(1.0, 0.22, 0);
    group.add(stick);
    // Flag
    const flag = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.06, 0.005),
      Materials.custom(0xcc2222)
    );
    flag.position.set(1.06, 0.4, 0);
    group.add(flag);
    group.traverse(c => { if (c.isMesh) c.castShadow = true; });
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

  // ── Luxury kitchen furniture ────────────────────────────────────────────────

  // Tall stainless-steel double-door refrigerator
  luxuryFridge() {
    const group = new THREE.Group();
    const steel = Materials.custom(0xc8cdd0);
    const steelDark = Materials.custom(0x8a9198);
    const handleMat = Materials.custom(0xaab0b5);
    // Main body
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.9, 0.7), steel);
    body.position.y = 0.95;
    body.castShadow = true;
    group.add(body);
    // Center seam between doors
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.9, 0.02), steelDark);
    seam.position.set(0, 0.95, 0.36);
    group.add(seam);
    // Left door panel (subtle inset)
    const leftPanel = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.75, 0.02), steelDark);
    leftPanel.position.set(-0.42, 0.95, 0.36);
    group.add(leftPanel);
    // Right door panel
    const rightPanel = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.75, 0.02), steelDark);
    rightPanel.position.set(0.42, 0.95, 0.36);
    group.add(rightPanel);
    // Left handle
    const lHandle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), handleMat);
    lHandle.position.set(-0.1, 1.1, 0.42);
    group.add(lHandle);
    // Right handle
    const rHandle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), handleMat);
    rHandle.position.set(0.1, 1.1, 0.42);
    group.add(rHandle);
    // Top freezer strip
    const freezer = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.36, 0.7), steelDark);
    freezer.position.set(0, 1.72, 0);
    group.add(freezer);
    // Ice/water dispenser panel
    const dispenser = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.02),
      Materials.custom(0x334455, { emissive: 0x112233, emissiveIntensity: 0.3 }));
    dispenser.position.set(-0.42, 0.6, 0.37);
    group.add(dispenser);
    group.traverse(c => { if (c.isMesh) c.castShadow = true; });
    return group;
  },

  // Sleek quartz-top kitchen island with dark-gloss base
  kitchenIsland() {
    const group = new THREE.Group();
    const base = Materials.custom(0x1a1a1a);
    const quartz = Materials.custom(0xe8e4e0);
    const quartzVein = Materials.custom(0xc8c4c0);
    // Cabinet base (2 wide, 1 deep)
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.88, 0.88), base);
    body.position.y = 0.44;
    body.castShadow = true;
    group.add(body);
    // Quartz countertop — slightly overhangs
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.04, 1.0), quartz);
    top.position.y = 0.9;
    top.receiveShadow = true;
    group.add(top);
    // Quartz veining (decorative strip)
    const vein = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.042, 0.06), quartzVein);
    vein.position.set(0.1, 0.9, 0.2);
    group.add(vein);
    // Cabinet door lines (front face detail)
    const doorMat = Materials.custom(0x111111);
    for (let i = -1; i <= 1; i += 2) {
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.75, 0.02), doorMat);
      door.position.set(i * 0.5, 0.44, 0.46);
      group.add(door);
      // Recessed handle bar
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.04), Materials.custom(0xaab0b5));
      bar.position.set(i * 0.5, 0.62, 0.5);
      group.add(bar);
    }
    group.traverse(c => { if (c.isMesh) c.castShadow = true; });
    return group;
  },

  // Wall counter section — dark gloss cabinet base + quartz top + integrated sink or cooktop
  kitchenCounter(variant = 'plain') {
    const group = new THREE.Group();
    const cabinetMat = Materials.custom(0x111111);
    const quartzMat  = Materials.custom(0xe8e4e0);
    const steelMat   = Materials.custom(0xb0b8be);
    // Cabinet body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.88, 0.6), cabinetMat);
    body.position.y = 0.44;
    body.castShadow = true;
    group.add(body);
    // Upper wall cabinet
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.56, 0.3), Materials.custom(0x0d0d0d));
    upper.position.set(0, 1.58, -0.15);
    group.add(upper);
    // Upper cabinet door face
    const upperDoor = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.44, 0.02), Materials.custom(0x1a1a1a));
    upperDoor.position.set(0, 1.58, 0.01);
    group.add(upperDoor);
    // Upper cabinet handle — slim bar, lower third of door
    const upperHandle = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.04, 0.05), Materials.custom(0xc8cdd0));
    upperHandle.position.set(0, 1.36, 0.045);
    group.add(upperHandle);
    // Countertop
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.04, 0.64), quartzMat);
    top.position.y = 0.9;
    group.add(top);
    // Lower cabinet door
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.75, 0.02), Materials.custom(0x1a1a1a));
    door.position.set(0, 0.44, 0.31);
    group.add(door);
    // Lower cabinet handle — prominent bar, upper third of door
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.05, 0.06), Materials.custom(0xc8cdd0));
    handle.position.set(0, 0.68, 0.35);
    group.add(handle);
    if (variant === 'sink') {
      // Undermount sink basin
      const sink = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.06, 0.36), steelMat);
      sink.position.set(0, 0.88, 0.05);
      group.add(sink);
      // Faucet neck
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.22, 8), steelMat);
      neck.position.set(0, 1.04, -0.06);
      group.add(neck);
      const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 8), steelMat);
      spout.rotation.x = Math.PI / 2;
      spout.position.set(0, 1.14, 0.03);
      group.add(spout);
    } else if (variant === 'cooktop') {
      // Induction cooktop
      const cooktop = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.015, 0.44), Materials.custom(0x111111));
      cooktop.position.set(0, 0.915, 0.06);
      group.add(cooktop);
      // Burner rings
      const burnerMat = Materials.custom(0x222222);
      const glowMat   = Materials.custom(0xff6622, { emissive: 0xff4400, emissiveIntensity: 0.4 });
      [[-0.2, -0.08], [0.2, -0.08], [-0.2, 0.18], [0.2, 0.18]].forEach(([bx, bz]) => {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 6, 16), glowMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(bx, 0.925, bz);
        group.add(ring);
      });
    }
    group.traverse(c => { if (c.isMesh) c.castShadow = true; });
    return group;
  },

  // Glass-front wine refrigerator
  wineFridge() {
    const group = new THREE.Group();
    const bodyMat  = Materials.custom(0x0d0d0d);
    const glassMat = Materials.custom(0x223344, { stops: 4 });
    const steelMat = Materials.custom(0xaab0b5);
    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.2, 0.6), bodyMat);
    body.position.y = 0.6;
    group.add(body);
    // Glass door
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.58, 1.05, 0.02), glassMat);
    door.position.set(0, 0.62, 0.32);
    group.add(door);
    // Bottle shelves (dark horizontal bars visible through glass)
    for (let i = 0; i < 4; i++) {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.02, 0.4), Materials.custom(0x1a1a1a));
      shelf.position.set(0, 0.22 + i * 0.25, 0.1);
      group.add(shelf);
      // Bottle silhouettes
      for (let j = -1; j <= 1; j++) {
        const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 6), Materials.custom(0x112200));
        bottle.rotation.z = Math.PI / 2;
        bottle.position.set(j * 0.14, 0.3 + i * 0.25, 0.1);
        group.add(bottle);
      }
    }
    // Handle
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.28, 0.04), steelMat);
    handle.position.set(0.22, 0.7, 0.35);
    group.add(handle);
    // Blue interior glow
    const glow = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 0.01),
      new THREE.MeshBasicMaterial({ color: 0x001133, transparent: true, opacity: 0.25 }));
    glow.position.set(0, 0.62, 0.31);
    group.add(glow);
    group.traverse(c => { if (c.isMesh) c.castShadow = true; });
    return group;
  },

  // Statement range hood — matte black with steel trim
  rangeHood() {
    const group = new THREE.Group();
    // Hood body — tapers downward
    const hood = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.4, 0.6), Materials.custom(0x1a1a1a));
    hood.position.y = 1.7;
    group.add(hood);
    // Flue (duct going up)
    const flue = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.5, 0.2), Materials.custom(0xaab0b5));
    flue.position.y = 2.05;
    group.add(flue);
    // Underside grille
    const grille = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.02, 0.56), Materials.custom(0x222222));
    grille.position.y = 1.5;
    group.add(grille);
    // LED strip under hood
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.02, 0.1),
      new THREE.MeshBasicMaterial({ color: 0xfff5e0, transparent: true, opacity: 0.8 }));
    led.position.set(0, 1.52, 0.2);
    group.add(led);
    // Steel trim edges
    const trim = Materials.custom(0xb0b8be);
    [[-0.44, 0], [0.44, 0]].forEach(([tx]) => {
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.4, 0.6), trim);
      t.position.set(tx, 1.7, 0);
      group.add(t);
    });
    group.traverse(c => { if (c.isMesh) c.castShadow = true; });
    return group;
  },

  credenza() {
    // Mahogany sideboard — 1×3 tile footprint, runs along Z axis, front faces +X (east)
    // Origin = left-front corner (min-x, min-z). Place against west wall at x:1.
    return _buildCredenza(+1);
  },

  credenzaEast() {
    // Mirror of credenza — front faces -X (west). Place against east wall at x:14.
    return _buildCredenza(-1);
  },

  globeStand() {
    // Executive globe on mahogany pedestal
    const group = new THREE.Group();
    const wood   = Materials.custom(0x3a1e08);
    const brass  = new THREE.MeshStandardMaterial({ color: 0xb5882a, roughness: 0.35, metalness: 0.75 });
    const ocean  = new THREE.MeshStandardMaterial({ color: 0x1a4a80, roughness: 0.55, metalness: 0.1 });
    const land   = Materials.custom(0x2a5c24);

    // Pedestal base plate
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.04, 0.30), wood);
    base.position.y = 0.02;
    group.add(base);
    // Column
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.055, 0.52, 8), wood);
    col.position.y = 0.28;
    group.add(col);
    // Brass cap on top of column
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.048, 0.04, 8), brass);
    cup.position.y = 0.56;
    group.add(cup);

    // Meridian ring (vertical)
    const meridian = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.011, 8, 28), brass);
    meridian.position.y = 0.80;
    group.add(meridian);
    // Equatorial ring (horizontal)
    const equator = new THREE.Mesh(new THREE.TorusGeometry(0.215, 0.008, 6, 28), brass);
    equator.position.y = 0.80;
    equator.rotation.x = Math.PI / 2;
    group.add(equator);

    // Globe sphere
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.20, 16, 12), ocean);
    globe.position.y = 0.80;
    group.add(globe);

    // Impressionistic land masses
    [[0.4, 0.9], [1.1, 1.1], [2.2, 0.8], [-0.6, 1.3], [3.5, 1.5], [1.8, 0.4]].forEach(([theta, phi]) => {
      const patch = new THREE.Mesh(new THREE.SphereGeometry(0.058, 4, 4), land);
      patch.position.set(
        0.196 * Math.sin(phi) * Math.cos(theta),
        0.80 + 0.196 * Math.cos(phi),
        0.196 * Math.sin(phi) * Math.sin(theta)
      );
      patch.scale.set(1.5, 0.22, 1.0);
      group.add(patch);
    });

    // Brass axis pins (north / south poles)
    [-1, 1].forEach(dir => {
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.055, 6), brass);
      pin.position.set(0, 0.80 + dir * 0.213, 0);
      group.add(pin);
    });

    group.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    return group;
  },

  cornerBar() {
    // Executive wet bar — 2×1 tile footprint, origin = left-front corner
    const group = new THREE.Group();
    const W = 1.82, H = 0.96, D = 0.60;
    const cx = W / 2, cz = D / 2;

    const darkWood  = Materials.custom(0x1a0e05);
    const midWood   = Materials.custom(0x2e1808);
    const counter   = Materials.custom(0xd0cac2);
    const gold      = Materials.custom(0xb8860b);
    const glassMat  = new THREE.MeshStandardMaterial({ color: 0x88aacc, roughness: 0.05, metalness: 0.05, transparent: true, opacity: 0.32 });
    const bottle1   = Materials.custom(0x1a3820);
    const bottle2   = Materials.custom(0x4a1a06);
    const wineGlass = new THREE.MeshStandardMaterial({ color: 0xddeeff, roughness: 0.05, transparent: true, opacity: 0.38 });

    const add = (x, y, z, w, h, d, mat) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      group.add(m);
    };

    // Cabinet body
    add(cx, H / 2, cz, W, H, D, darkWood);
    // Marble-style counter top
    add(cx, H + 0.016, cz, W + 0.06, 0.032, D + 0.06, counter);
    // Gold counter front trim
    add(cx, H + 0.004, cz + (D + 0.06) / 2 - 0.008, W + 0.06, 0.024, 0.016, gold);
    // Gold base strip
    add(cx, 0.018, cz, W + 0.02, 0.036, D + 0.02, gold);

    const lH = H * 0.40;               // lower solid cabinet height
    const fz = cz + D / 2 + 0.012;    // front face z

    // Lower solid door + handle
    add(cx, lH / 2,         fz,         W * 0.90, lH - 0.06, 0.020, midWood);
    add(cx, lH / 2,         fz + 0.013, 0.08,     0.013,     0.016, gold);

    // Upper glass door
    const uBot = lH + 0.02;
    const uH   = H - uBot - 0.02;
    add(cx, uBot + uH / 2, fz, W * 0.90, uH, 0.022, glassMat);

    // Glass door frame
    const fw = W * 0.90 + 0.04;
    add(cx,                  uBot,           fz - 0.002, fw,    0.020, 0.028, gold);
    add(cx,                  H - 0.01,       fz - 0.002, fw,    0.020, 0.028, gold);
    add(cx - fw / 2 + 0.012, uBot + uH / 2, fz - 0.002, 0.024, uH,   0.028, gold);
    add(cx + fw / 2 - 0.012, uBot + uH / 2, fz - 0.002, 0.024, uH,   0.028, gold);

    // Bottles visible through glass
    [cx - 0.32, cx, cx + 0.32].forEach((bx, i) => {
      const mat = i % 2 === 0 ? bottle1 : bottle2;
      const bH  = uH * 0.68;
      const bb  = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.044, bH, 6), mat);
      bb.position.set(bx, uBot + bH / 2 + 0.03, cz - 0.08);
      group.add(bb);
      const bn = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.032, bH * 0.28, 6), mat);
      bn.position.set(bx, uBot + bH + bH * 0.14 + 0.03, cz - 0.08);
      group.add(bn);
    });

    // Wine glasses on counter
    [cx - 0.38, cx, cx + 0.38].forEach(gx => {
      const gy = H + 0.032, gz = cz - 0.12;
      const gCup  = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.014, 0.09, 8), wineGlass);
      const gStem = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.065, 6), wineGlass);
      const gFoot = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.007, 8), wineGlass);
      gCup.position.set(gx,  gy + 0.045, gz);
      gStem.position.set(gx, gy,         gz);
      gFoot.position.set(gx, gy - 0.032, gz);
      [gCup, gStem, gFoot].forEach(m => group.add(m));
    });

    group.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    return group;
  },

  arcadeCabinet() {
    const group = new THREE.Group();
    // Main body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.7, 0.6),
      Materials.custom(0x1a1a2e)
    );
    body.position.y = 0.85;
    group.add(body);
    // Screen
    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.4, 0.02),
      Materials.custom(0x113311)
    );
    screen.position.set(0, 1.3, 0.32);
    group.add(screen);
    // Screen glow
    const glow = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.35, 0.01),
      new THREE.MeshBasicMaterial({ color: 0x33ff33, transparent: true, opacity: 0.3 })
    );
    glow.position.set(0, 1.3, 0.335);
    group.add(glow);
    // Control panel
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.15, 0.25),
      Materials.custom(0x222244)
    );
    panel.rotation.x = -0.3;
    panel.position.set(0, 0.95, 0.35);
    group.add(panel);
    // Joystick
    const stick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.12, 6),
      Materials.custom(0xff3333)
    );
    stick.position.set(-0.08, 1.05, 0.4);
    group.add(stick);
    // Button
    const btn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.02, 8),
      Materials.custom(0x33ff33)
    );
    btn.position.set(0.08, 1.0, 0.4);
    group.add(btn);
    // Marquee top
    const marquee = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.2, 0.1),
      Materials.custom(0xcc8833)
    );
    marquee.position.set(0, 1.8, 0.28);
    group.add(marquee);
    group.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    return group;
  },

  // ── Bank-vault lockbox wall unit — tall cabinet with 3×4 grid of individual box doors ──
  lockbox(width = 0.9) {
    const group = new THREE.Group();
    const steel      = Materials.custom(0x8a9198);
    const steelDark  = Materials.custom(0x4a5158);
    const steelLight = Materials.custom(0xb8bec4);
    const chrome     = Materials.custom(0xd4d8db);
    const dark       = Materials.custom(0x1a1a20);

    const W = width, H = 1.3, D = 0.28;

    // Cabinet body
    const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), steelDark);
    body.position.set(0, H / 2, 0);
    group.add(body);

    // Face plate
    const face = new THREE.Mesh(new THREE.BoxGeometry(W - 0.04, H - 0.04, 0.02), steel);
    face.position.set(0, H / 2, D / 2 + 0.005);
    group.add(face);

    // Scale columns with width: ~3 cols per 0.9 units
    const cols = width < 1.5 ? 3 : 4, rows = 4;
    const boxW = (W - 0.08) / cols;
    const boxH = (H - 0.08) / rows;
    const startX = -(W / 2) + 0.04 + boxW / 2;
    const startY = 0.04 + boxH / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const bx = startX + c * boxW;
        const by = startY + r * boxH;
        const bz = D / 2 + 0.015;

        // Door panel
        const door = new THREE.Mesh(new THREE.BoxGeometry(boxW - 0.02, boxH - 0.02, 0.015), steelLight);
        door.position.set(bx, by, bz);
        group.add(door);

        // Two keyholes (bank key + customer key)
        const kOff = boxW * 0.22;
        [-kOff, kOff].forEach(ox => {
          const keyhole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.02, 6), dark);
          keyhole.rotation.x = Math.PI / 2;
          keyhole.position.set(bx + ox, by, bz + 0.012);
          group.add(keyhole);
        });

        // Handle bar
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.015, 0.015), chrome);
        handle.position.set(bx, by - boxH / 2 + 0.04, bz + 0.012);
        group.add(handle);
      }
    }

    // Top cap
    const cap = new THREE.Mesh(new THREE.BoxGeometry(W + 0.04, 0.03, D + 0.04), steelDark);
    cap.position.set(0, H + 0.015, 0);
    group.add(cap);

    // Base plinth
    const base = new THREE.Mesh(new THREE.BoxGeometry(W + 0.04, 0.05, D + 0.04), steelDark);
    base.position.set(0, 0.025, 0);
    group.add(base);

    group.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    return group;
  },

  // ── Bank vault door — sits in east wall of Archive, player walks through exit tile ──
  vaultDoor() {
    const group = new THREE.Group();
    const steel      = Materials.custom(0x8a9198);
    const steelDark  = Materials.custom(0x4a5158);
    const steelLight = Materials.custom(0xb8bec4);
    const gold       = Materials.custom(0xc8960a);
    const chrome     = Materials.custom(0xd4d8db);

    const frameW = 2.0, frameH = 2.4, frameD = 0.15;

    // Wall surround
    const frame = new THREE.Mesh(new THREE.BoxGeometry(frameW, frameH, frameD), steelDark);
    frame.position.set(0, frameH / 2, 0);
    group.add(frame);

    // Circular door body
    const doorR = 0.82;
    const door = new THREE.Mesh(new THREE.CylinderGeometry(doorR, doorR, 0.14, 32), steel);
    door.rotation.x = Math.PI / 2;
    door.position.set(0, frameH / 2, frameD / 2 + 0.07);
    group.add(door);

    // Face plate (lighter shade)
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(doorR - 0.08, doorR - 0.08, 0.02, 32), steelLight);
    plate.rotation.x = Math.PI / 2;
    plate.position.set(0, frameH / 2, frameD / 2 + 0.15);
    group.add(plate);

    // 8 locking bolts around circumference
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const bx = Math.cos(angle) * (doorR - 0.12);
      const by = Math.sin(angle) * (doorR - 0.12);
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.18, 8), chrome);
      bolt.rotation.x = Math.PI / 2;
      bolt.position.set(bx, frameH / 2 + by, frameD / 2 + 0.16);
      group.add(bolt);
    }

    // Wheel ring
    const wheelRing = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.04, 8, 24), chrome);
    wheelRing.rotation.x = Math.PI / 2;
    wheelRing.position.set(0, frameH / 2, frameD / 2 + 0.20);
    group.add(wheelRing);

    // 6 wheel spokes
    for (let i = 0; i < 6; i++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.56, 0.04), chrome);
      spoke.rotation.z = (i / 6) * Math.PI * 2;
      spoke.position.set(0, frameH / 2, frameD / 2 + 0.20);
      group.add(spoke);
    }

    // Center hub
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 12), gold);
    hub.rotation.x = Math.PI / 2;
    hub.position.set(0, frameH / 2, frameD / 2 + 0.22);
    group.add(hub);

    // Hinge bar on left side
    const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.08), steelDark);
    hinge.position.set(-doorR + 0.04, frameH / 2, frameD / 2 + 0.10);
    group.add(hinge);

    // Gold plaque below wheel
    const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.02), gold);
    plaque.position.set(0, frameH / 2 - doorR + 0.22, frameD / 2 + 0.16);
    group.add(plaque);

    group.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    return group;
  },

  boosterMount() {
    const group = new THREE.Group();
    // Flat backing plate (dark charcoal, mounts flush to the wall)
    const plateMat = Materials.custom(0x1a1a2e);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.03), plateMat);
    plate.position.set(0, 1.4, 0);
    group.add(plate);

    // Orange triangle arrow pointing up — signals "place booster here"
    const arrowMat = Materials.custom(0xff6b00);
    const arrowGeo = new THREE.ConeGeometry(0.07, 0.14, 3);
    const arrow = new THREE.Mesh(arrowGeo, arrowMat);
    arrow.position.set(0, 1.42, 0.022);
    group.add(arrow);

    // Small pulsing-look LED dot (bright yellow-green)
    const ledMat = Materials.custom(0x39ff14);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), ledMat);
    led.position.set(0, 1.28, 0.022);
    group.add(led);

    group.traverse(c => { if (c.isMesh) { c.castShadow = false; c.receiveShadow = false; } });
    return group;
  },
};

// ── Shared builder for credenza / credenzaEast ───────────────────────────────
// facing = +1 → front face at +x (west-wall variant)
// facing = -1 → front face at -x (east-wall variant)
function _buildCredenza(facing) {
  const group = new THREE.Group();
  // Dimensions: W = depth (x), D = length along wall (z)
  const W = 0.58, H = 0.72, D = 2.8;
  const cx = W / 2;        // 0.29 — body centre x
  const cz = D / 2;        // 1.4  — body centre z

  const mahogany      = Materials.custom(0x2c1508);
  const mahoganyMid   = Materials.custom(0x3d1f0a);
  const mahoganyLight = Materials.custom(0x5a2e10);
  const gold          = Materials.custom(0xc8960a);

  const add = (x, y, z, w, h, d, mat) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    group.add(m);
  };

  // Cabinet body
  add(cx, H / 2, cz, W, H, D, mahogany);
  // Top slab (slightly overhanging)
  add(cx, H + 0.022, cz, W + 0.06, 0.044, D + 0.10, mahoganyLight);
  // Gold base strip
  add(cx, 0.02, cz, W + 0.04, 0.04, D + 0.04, gold);

  // Gold top front-edge trim (follows facing direction)
  const trimX = facing > 0
    ? cx + (W + 0.06) / 2 - 0.012   // +x face
    : cx - (W + 0.06) / 2 + 0.012;  // -x face
  add(trimX, H + 0.036, cz, 0.024, 0.015, D + 0.10, gold);

  // Section dividers (3 equal sections along z)
  const sD = D / 3;  // 0.933 per section
  [sD, sD * 2].forEach(z => add(cx, H / 2, z, W, H + 0.01, 0.025, mahoganyMid));

  // Doors + handles (2 per section, on the facing side)
  const fx = facing > 0
    ? cx + W / 2 + 0.012    // doors proud of +x face
    : cx - W / 2 - 0.012;   // doors proud of -x face
  const hx = facing > 0 ? fx + 0.013 : fx - 0.013;

  for (let i = 0; i < 3; i++) {
    const sz = i * sD + sD / 2;
    [-0.22, 0.22].forEach(oz => {
      add(fx, H / 2, sz + oz,         0.020, H - 0.10, sD * 0.43, mahoganyMid);
      add(hx, H / 2, sz + oz * 0.46,  0.017, 0.013,    0.05,       gold);
    });
  }

  // Decorative vase on top (offset slightly away from front face)
  const vx = facing > 0 ? cx - 0.06 : cx + 0.06;
  const vaseMat = Materials.custom(0x1e3f6e);
  const vBody = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.068, 0.20, 8), vaseMat);
  vBody.position.set(vx, H + 0.044 + 0.10, cz);
  group.add(vBody);
  const vNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.030, 0.052, 0.08, 8), vaseMat);
  vNeck.position.set(vx, H + 0.044 + 0.24, cz);
  group.add(vNeck);

  group.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
  return group;
}
