import * as THREE from 'three';
import { buildCharacter } from './CharacterBuilder.js';
import { CharacterAnimator } from './CharacterAnimator.js';
import { CHARACTER_CONFIGS } from '../data/characters.js';
import { PLAYER_BASE_STATS, PLAYER_ABILITIES, XP_TABLE, LEVEL_GROWTH } from '../data/stats.js';
import { STARTING_INVENTORY } from '../data/items.js';
import { PLAYER } from '../utils/constants.js';

export class Player {
  constructor() {
    this.mesh = buildCharacter(CHARACTER_CONFIGS.andrew);
    this.animator = new CharacterAnimator(this.mesh);
    this.stats = { ...PLAYER_BASE_STATS };
    this.inventory = STARTING_INVENTORY.map(i => ({ ...i }));
    this.flags = {}; // Story flags
    this.questStates = {}; // Quest progress
    this.position = { x: 0, z: 0 };
    this.currentRoom = 'cubicle_farm';
    this.actIndex = 0;
  }

  setPosition(x, z) {
    this.position.x = x;
    this.position.z = z;
    this.mesh.position.set(x, 0, z);
  }

  move(dx, dz, dt, tileMap) {
    const speed = PLAYER.SPEED * dt;
    const nx = this.position.x + dx * speed;
    const nz = this.position.z + dz * speed;

    const isMoving = dx !== 0 || dz !== 0;
    this.animator.setWalking(isMoving);

    if (isMoving) {
      this.animator.setFacing(Math.atan2(dx, dz));
    }

    // Check X and Z independently for wall sliding
    if (tileMap) {
      if (tileMap.canMove(nx, this.position.z)) {
        this.position.x = nx;
      }
      if (tileMap.canMove(this.position.x, nz)) {
        this.position.z = nz;
      }
    } else {
      this.position.x = nx;
      this.position.z = nz;
    }

    this.mesh.position.set(this.position.x, 0, this.position.z);
  }

  update(dt) {
    this.animator.update(dt);
  }

  // Get available abilities based on level
  getAbilities() {
    const abilities = [];
    for (const [id, ability] of Object.entries(PLAYER_ABILITIES)) {
      if (this.stats.level >= ability.unlockLevel) {
        abilities.push({ id, ...ability });
      }
    }
    return abilities;
  }

  // Gain XP and check for level up
  gainXP(amount) {
    this.stats.xp += amount;
    const results = [];
    while (this.stats.level < XP_TABLE.length && this.stats.xp >= XP_TABLE[this.stats.level]) {
      this.stats.level++;
      this.stats.maxHP += LEVEL_GROWTH.maxHP;
      this.stats.maxMP += LEVEL_GROWTH.maxMP;
      this.stats.atk += LEVEL_GROWTH.atk;
      this.stats.def += LEVEL_GROWTH.def;
      this.stats.spd += LEVEL_GROWTH.spd;
      this.stats.hp = this.stats.maxHP;
      this.stats.mp = this.stats.maxMP;
      results.push(this.stats.level);
    }
    return results; // Returns array of levels gained
  }

  // Full heal
  rest() {
    this.stats.hp = this.stats.maxHP;
    this.stats.mp = this.stats.maxMP;
  }

  // Add item to inventory
  addItem(id, quantity = 1) {
    const existing = this.inventory.find(i => i.id === id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      this.inventory.push({ id, quantity });
    }
  }

  // Use item
  useItem(id) {
    const idx = this.inventory.findIndex(i => i.id === id && i.quantity > 0);
    if (idx === -1) return false;
    this.inventory[idx].quantity--;
    if (this.inventory[idx].quantity <= 0) {
      this.inventory.splice(idx, 1);
    }
    return true;
  }

  // Set/get story flags
  setFlag(key, value = true) {
    this.flags[key] = value;
  }

  getFlag(key) {
    return this.flags[key] || false;
  }

  // Serialization for save
  serialize() {
    return {
      stats: { ...this.stats },
      inventory: this.inventory.map(i => ({ ...i })),
      flags: { ...this.flags },
      questStates: { ...this.questStates },
      position: { ...this.position },
      currentRoom: this.currentRoom,
      actIndex: this.actIndex,
    };
  }

  deserialize(data) {
    Object.assign(this.stats, data.stats);
    this.inventory = data.inventory.map(i => ({ ...i }));
    this.flags = { ...data.flags };
    this.questStates = { ...data.questStates };
    this.position = { ...data.position };
    this.currentRoom = data.currentRoom;
    this.actIndex = data.actIndex || 0;
    this.setPosition(this.position.x, this.position.z);
  }
}
