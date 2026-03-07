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

  cubicleWall(width = 1.5, height = 1.4) {
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
    const frameGeo = new THREE.BoxGeometry(0.6, 0.5, 0.02);
    const frame = new THREE.Mesh(frameGeo, Materials.custom(0x111111));
    frame.position.y = 1.5;
    group.add(frame);
    // Inner image (just a colored rectangle)
    const imgGeo = new THREE.BoxGeometry(0.52, 0.34, 0.005);
    const imgMat = Materials.custom(0x001133);
    const img = new THREE.Mesh(imgGeo, imgMat);
    img.position.set(0, 1.55, 0.013);
    group.add(img);
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
    top.position.y = 1.0;
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
