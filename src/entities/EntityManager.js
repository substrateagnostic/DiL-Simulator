import { NPC } from './NPC.js';
import { distance2D } from '../utils/math.js';
import { PLAYER } from '../utils/constants.js';

export class EntityManager {
  constructor() {
    this.npcs = [];
  }

  addNPC(npc) {
    this.npcs.push(npc);
    return npc;
  }

  removeNPC(id) {
    const idx = this.npcs.findIndex(n => n.id === id);
    if (idx !== -1) {
      const npc = this.npcs[idx];
      this.npcs.splice(idx, 1);
      return npc;
    }
    return null;
  }

  getNPC(id) {
    return this.npcs.find(n => n.id === id) || null;
  }

  // Get nearest interactable NPC to player
  getNearestInteractable(playerX, playerZ) {
    let nearest = null;
    let nearestDist = Infinity;

    for (const npc of this.npcs) {
      if (!npc.visible || !npc.interactable) continue;
      const dist = distance2D(npc.position.x, npc.position.z, playerX, playerZ);
      if (dist < PLAYER.INTERACT_RANGE && dist < nearestDist) {
        nearest = npc;
        nearestDist = dist;
      }
    }
    return nearest;
  }

  update(dt, flags) {
    for (const npc of this.npcs) {
      // Check condition function
      if (npc.conditionFn) {
        const shouldShow = npc.conditionFn(flags);
        if (shouldShow && !npc.visible) npc.show();
        if (!shouldShow && npc.visible) npc.hide();
      }
      if (npc.visible) {
        npc.update(dt);
      }
    }
  }

  // Add all NPC meshes to scene
  addToScene(scene) {
    for (const npc of this.npcs) {
      scene.add(npc.mesh);
    }
  }

  // Remove all NPC meshes from scene
  removeFromScene(scene) {
    for (const npc of this.npcs) {
      scene.remove(npc.mesh);
    }
  }

  clear() {
    this.npcs = [];
  }
}
