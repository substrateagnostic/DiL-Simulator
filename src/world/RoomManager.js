import * as THREE from 'three';
import { Room } from './Room.js';
import { ROOMS } from '../data/rooms/index.js';
import { NPC } from '../entities/NPC.js';
import { EntityManager } from '../entities/EntityManager.js';
import { TransitionOverlay } from '../ui/TransitionOverlay.js';
import { EventBus } from '../core/EventBus.js';

export class RoomManager {
  constructor(scene) {
    this.mainScene = scene;
    this.currentRoomId = null;
    this.currentRoom = null;
    this.rooms = {};
    this.entityManager = new EntityManager();
    this.transition = new TransitionOverlay();
    this.roomGroup = null; // The THREE.Group for current room
  }

  // Build a room from data
  _buildRoom(roomId) {
    const data = ROOMS[roomId];
    if (!data) {
      console.error(`Room not found: ${roomId}`);
      return null;
    }
    const room = new Room(data);
    room.build();
    return room;
  }

  // Load initial room (no transition)
  loadRoom(roomId, spawnX, spawnZ) {
    this._clearCurrentRoom();

    const room = this._buildRoom(roomId);
    if (!room) return null;

    this.currentRoomId = roomId;
    this.currentRoom = room;
    this.rooms[roomId] = room;

    // Add room geometry to scene
    this.roomGroup = room.group;
    this.mainScene.add(this.roomGroup);

    // Set up NPCs
    this.entityManager.clear();
    const npcData = room.getNPCData();
    for (const npc of npcData) {
      // Build conditionFn from data-driven condition object
      let conditionFn = npc.conditionFn || null;
      if (npc.condition) {
        const cond = npc.condition;
        conditionFn = (flags) => {
          if (cond.flag && !flags[cond.flag]) return false;
          if (cond.notFlag && flags[cond.notFlag]) return false;
          return true;
        };
      }
      const npcEntity = new NPC(npc.id, npc.x, npc.z, {
        facing: npc.facing || 0,
        dialogId: npc.dialogId || npc.id,
        visible: npc.visible !== false,
        conditionFn,
      });
      this.entityManager.addNPC(npcEntity);
      this.mainScene.add(npcEntity.mesh);
    }

    EventBus.emit('room-entered', roomId);
    return { tileMap: room.tileMap, spawnX: spawnX ?? room.data.playerSpawn?.x ?? 5, spawnZ: spawnZ ?? room.data.playerSpawn?.z ?? 5 };
  }

  // Transition to a new room
  async changeRoom(targetRoomId, spawnX, spawnZ) {
    await this.transition.fadeOut(0.3);

    const result = this.loadRoom(targetRoomId, spawnX, spawnZ);

    await this.transition.fadeIn(0.3);

    return result;
  }

  _clearCurrentRoom() {
    if (this.roomGroup) {
      this.mainScene.remove(this.roomGroup);
      this.roomGroup = null;
    }
    // Remove NPC meshes
    this.entityManager.removeFromScene(this.mainScene);
    this.entityManager.clear();
    this.currentRoom = null;
  }

  getCurrentTileMap() {
    return this.currentRoom ? this.currentRoom.tileMap : null;
  }

  getRoomData(roomId) {
    return ROOMS[roomId] || null;
  }

  update(dt, flags) {
    this.entityManager.update(dt, flags);
  }
}
