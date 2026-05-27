import { BIOMES } from "./data.js";
import { generateCreatureSpec } from "./creatures.js";
import { choose, maybe, randRange, seeded, valueNoise } from "./random.js";

export const CHUNK_SIZE = 640;
export const VIEW_RADIUS = 2;

const BIOME_IDS = ["wildlands", "mushroom", "desert"];

export class World {
  constructor(seed = "offlands-001") {
    this.seed = seed;
    this.chunks = new Map();
  }

  key(cx, cy) {
    return `${cx},${cy}`;
  }

  chunkCoords(x, y) {
    return {
      cx: Math.floor(x / CHUNK_SIZE),
      cy: Math.floor(y / CHUNK_SIZE)
    };
  }

  getChunk(cx, cy) {
    const key = this.key(cx, cy);
    if (!this.chunks.has(key)) {
      this.chunks.set(key, this.generateChunk(cx, cy));
    }
    return this.chunks.get(key);
  }

  getBiomeAt(x, y) {
    const { cx, cy } = this.chunkCoords(x, y);
    return BIOMES[this.getChunk(cx, cy).biomeId];
  }

  nearbyChunks(x, y, radius = VIEW_RADIUS) {
    const { cx, cy } = this.chunkCoords(x, y);
    const chunks = [];
    for (let yOff = -radius; yOff <= radius; yOff += 1) {
      for (let xOff = -radius; xOff <= radius; xOff += 1) {
        chunks.push(this.getChunk(cx + xOff, cy + yOff));
      }
    }
    return chunks;
  }

  generateChunk(cx, cy) {
    const rng = seeded(`${this.seed}:chunk:${cx}:${cy}`);
    const biomeId = this.biomeFor(cx, cy);
    const biome = BIOMES[biomeId];
    const originX = cx * CHUNK_SIZE;
    const originY = cy * CHUNK_SIZE;
    const props = [];
    const resources = [];
    const chests = [];
    const creatures = [];
    const hazards = [];

    const propCount = 18 + Math.floor(rng() * 18);
    for (let index = 0; index < propCount; index += 1) {
      const type = choose(rng, biome.props);
      props.push({
        id: `${cx}:${cy}:prop:${index}`,
        type,
        x: originX + randRange(rng, 34, CHUNK_SIZE - 34),
        y: originY + randRange(rng, 34, CHUNK_SIZE - 34),
        size: randRange(rng, 0.7, 1.35),
        allowRotation: allowsPropRotation(type),
        spin: allowsPropRotation(type) ? randRange(rng, -0.18, 0.18) : 0,
        flip: rng() < 0.5 ? -1 : 1
      });
    }

    const resourceCount = 8 + Math.floor(rng() * 9);
    for (let index = 0; index < resourceCount; index += 1) {
      resources.push({
        id: `${cx}:${cy}:res:${index}`,
        type: choose(rng, biome.resources),
        x: originX + randRange(rng, 42, CHUNK_SIZE - 42),
        y: originY + randRange(rng, 42, CHUNK_SIZE - 42),
        amount: 1 + Math.floor(rng() * 3),
        collected: false
      });
    }

    if (maybe(rng, 0.45)) {
      chests.push({
        id: `${cx}:${cy}:chest:0`,
        biomeId,
        x: originX + randRange(rng, 82, CHUNK_SIZE - 82),
        y: originY + randRange(rng, 82, CHUNK_SIZE - 82),
        opened: false
      });
    }

    const creatureCount = cx === 0 && cy === 0 ? 1 : 2 + Math.floor(rng() * 4);
    for (let index = 0; index < creatureCount; index += 1) {
      let creatureX = originX + randRange(rng, 70, CHUNK_SIZE - 70);
      let creatureY = originY + randRange(rng, 70, CHUNK_SIZE - 70);
      if (cx === 0 && cy === 0 && Math.hypot(creatureX - 320, creatureY - 320) < 230) {
        creatureX = originX + CHUNK_SIZE - 95;
        creatureY = originY + CHUNK_SIZE - 95;
      }
      creatures.push(
        generateCreatureSpec(
          rng,
          biomeId,
          `${cx}:${cy}:creature:${index}`,
          creatureX,
          creatureY
        )
      );
    }

    if (biomeId === "mushroom") {
      for (let index = 0; index < 3; index += 1) {
        hazards.push({
          id: `${cx}:${cy}:slime:${index}`,
          type: "slime",
          x: originX + randRange(rng, 80, CHUNK_SIZE - 80),
          y: originY + randRange(rng, 80, CHUNK_SIZE - 80),
          radius: randRange(rng, 26, 48)
        });
      }
    }

    return { cx, cy, x: originX, y: originY, biomeId, props, resources, chests, creatures, hazards };
  }

  biomeFor(cx, cy) {
    if (cx === 0 && cy === 0) return "wildlands";
    const broad = valueNoise(this.seed, cx / 3.2, cy / 3.2);
    const detail = valueNoise(`${this.seed}:detail`, cx / 1.4, cy / 1.4) * 0.22;
    const value = broad * 0.78 + detail;
    if (value < 0.36) return BIOME_IDS[0];
    if (value < 0.67) return BIOME_IDS[1];
    return BIOME_IDS[2];
  }
}

function allowsPropRotation(type) {
  return ["rock", "crackedRock"].includes(type);
}
