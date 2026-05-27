import { clamp } from "./utils.js";

function number(value, fallback = 0, min = -100000, max = 100000) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? clamp(parsed, min, max) : fallback;
}

function text(value, fallback, maxLength = 64) {
  return String(value || fallback).trim().slice(0, maxLength) || fallback;
}

function color(value, fallback) {
  const candidate = String(value || fallback).trim();
  return /^#[0-9a-fA-F]{6}$/.test(candidate) ? candidate : fallback;
}

export const defaultAuthority = {
  createInitialPlayerState() {
    return {
      x: 320,
      y: 320,
      aimX: 1,
      aimY: 0,
      hp: 100,
      maxHp: 100,
      weaponId: "stickSword",
      level: 1,
      attackSeq: 0,
      worldSeed: "offlands-shared-seed-001"
    };
  },

  filterClientStateUpdate({ proposedState, proposedMeta }) {
    const state = typeof proposedState === "object" && proposedState ? proposedState : {};
    const meta = typeof proposedMeta === "object" && proposedMeta ? proposedMeta : {};

    return {
      state: {
        x: number(state.x, 320),
        y: number(state.y, 320),
        aimX: number(state.aimX, 1, -1, 1),
        aimY: number(state.aimY, 0, -1, 1),
        hp: number(state.hp, 100, 0, 999),
        maxHp: number(state.maxHp, 100, 1, 999),
        weaponId: text(state.weaponId, "stickSword", 32),
        level: number(state.level, 1, 1, 99),
        attackSeq: number(state.attackSeq, 0, 0, 1000000),
        worldSeed: text(state.worldSeed, "offlands-shared-seed-001", 80)
      },
      meta: {
        color: color(meta.color, "#6bd4ff"),
        accent: color(meta.accent, "#ffdf6e")
      }
    };
  },

  onPlayerJoin() {},

  onPlayerLeave() {},

  onLobbyEmpty() {},

  onBeforeBroadcast({ snapshot, worldState }) {
    return {
      ...snapshot,
      worldState: worldState || { openedChests: {}, deadCreatures: {} }
    };
  },

  onCustomMessage() {
    return { handled: false };
  }
};
