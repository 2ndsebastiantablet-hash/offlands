import { BIOME_PARTS } from "./data.js";
import { generateCreatureSpec } from "./creatures.js";
import { choose, maybe, randRange, seeded, valueNoise } from "./random.js";

export const CHUNK_SIZE = 640;
export const VIEW_RADIUS = 2;

const CATEGORY_ORDER = [
  "terrainBase",
  "climate",
  "gravity",
  "lifeDensity",
  "hazardStyle",
  "creatureBias",
  "resourceBias",
  "lightingMood"
];

const PROP_ROTATION = new Set(["rock", "crackedRock", "snowRock", "ashPile", "lavaCrack"]);

export class World {
  constructor(seed = "offlands-001") {
    this.seed = seed;
    this.chunks = new Map();
    this.biomeProfiles = new Map();
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
    return this.getChunk(cx, cy).biomeProfile;
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

  getBiomeProfile(cx, cy) {
    const key = this.key(cx, cy);
    if (!this.biomeProfiles.has(key)) {
      this.biomeProfiles.set(key, this.generateBiomeProfile(cx, cy));
    }
    return this.biomeProfiles.get(key);
  }

  generateChunk(cx, cy) {
    const rng = seeded(`${this.seed}:chunk:${cx}:${cy}`);
    const biomeProfile = this.getBiomeProfile(cx, cy);
    const biomeId = biomeProfile.legacyId;
    const originX = cx * CHUNK_SIZE;
    const originY = cy * CHUNK_SIZE;
    const props = [];
    const resources = [];
    const chests = [];
    const creatures = [];
    const hazards = [];

    const propCount = Math.max(1, Math.round((12 + rng() * 18) * biomeProfile.plantDensity));
    for (let index = 0; index < propCount; index += 1) {
      const type = choose(rng, biomeProfile.props);
      const allowRotation = allowsPropRotation(type);
      props.push({
        id: `${cx}:${cy}:prop:${index}`,
        type,
        x: originX + randRange(rng, 34, CHUNK_SIZE - 34),
        y: originY + randRange(rng, 34, CHUNK_SIZE - 34),
        size: randRange(rng, 0.7, 1.35),
        allowRotation,
        spin: allowRotation ? randRange(rng, -0.22, 0.22) : 0,
        flip: rng() < 0.5 ? -1 : 1
      });
    }

    const resourceCount = Math.max(1, Math.round((6 + rng() * 10) * biomeProfile.resourceDensity));
    for (let index = 0; index < resourceCount; index += 1) {
      resources.push({
        id: `${cx}:${cy}:res:${index}`,
        type: choose(rng, biomeProfile.resources),
        x: originX + randRange(rng, 42, CHUNK_SIZE - 42),
        y: originY + randRange(rng, 42, CHUNK_SIZE - 42),
        amount: 1 + Math.floor(rng() * 3),
        collected: false
      });
    }

    if (maybe(rng, biomeProfile.chestChance)) {
      chests.push({
        id: `${cx}:${cy}:chest:0`,
        biomeId,
        biomeName: biomeProfile.name,
        x: originX + randRange(rng, 82, CHUNK_SIZE - 82),
        y: originY + randRange(rng, 82, CHUNK_SIZE - 82),
        opened: false
      });
    }

    const baseCreatureCount = cx === 0 && cy === 0 ? 1 : 1 + Math.floor(rng() * 4);
    const creatureCount = Math.max(0, Math.min(9, Math.round(baseCreatureCount * biomeProfile.creatureDensity)));
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
          biomeProfile,
          `${cx}:${cy}:creature:${index}`,
          creatureX,
          creatureY
        )
      );
    }

    let hazardIndex = 0;
    for (const type of biomeProfile.hazards) {
      const count = Math.max(1, Math.round((1 + rng() * 2) * biomeProfile.hazardDensity));
      for (let localIndex = 0; localIndex < count; localIndex += 1) {
        hazards.push(createHazard(type, `${cx}:${cy}:hazard:${hazardIndex}`, originX, originY, rng));
        hazardIndex += 1;
      }
    }

    return {
      cx,
      cy,
      x: originX,
      y: originY,
      biomeId,
      biomeProfile,
      props,
      resources,
      chests,
      creatures,
      hazards
    };
  }

  generateBiomeProfile(cx, cy) {
    const parts = {};

    if (cx === 0 && cy === 0) {
      parts.terrainBase = findPart("terrainBase", "grassland");
      parts.climate = findPart("climate", "calm");
      parts.gravity = findPart("gravity", "normalGravity");
      parts.lifeDensity = findPart("lifeDensity", "normal");
      parts.hazardStyle = findPart("hazardStyle", "none");
      parts.creatureBias = findPart("creatureBias", "peacefulSparse");
      parts.resourceBias = findPart("resourceBias", "woodLeaves");
      parts.lightingMood = findPart("lightingMood", "bright");
    } else {
      for (const category of CATEGORY_ORDER) {
        parts[category] = chooseRegionalPart(this.seed, category, cx, cy);
      }
    }

    const terrain = parts.terrainBase;
    const lighting = parts.lightingMood;
    const windAngle = valueNoise(`${this.seed}:wind-angle`, cx / 4.2, cy / 4.2) * Math.PI * 2;
    const windStrength = (parts.climate.windStrength || 0) * (parts.hazardStyle.movement?.playerWind || 1);
    const rawHazards = unique([...(terrain.hazards || []), ...(parts.hazardStyle.hazards || [])]);

    const profile = {
      id: CATEGORY_ORDER.map((category) => parts[category].id).join("-"),
      name: nameBiome(parts),
      legacyId: terrain.legacyId || "wildlands",
      parts,
      partLabels: CATEGORY_ORDER.map((category) => parts[category].label),
      ground: terrain.ground,
      groundAlt: terrain.groundAlt,
      accent: terrain.accent,
      colors: {
        ground: terrain.ground,
        groundAlt: terrain.groundAlt,
        accent: terrain.accent
      },
      terrainType: terrain.label,
      temperature: terrain.temperature || "strange",
      climate: parts.climate.label,
      weather: parts.climate.weather || "calm",
      lightingMood: lighting.label,
      props: unique([...(terrain.props || []), ...(parts.lifeDensity.props || [])]),
      resources: unique([...(terrain.resources || []), ...(parts.resourceBias.resources || [])]),
      lootResources: unique([...(terrain.lootResources || []), ...(parts.resourceBias.lootResources || [])]),
      lootWeapons: terrain.lootWeapons || ["stickSword"],
      chestName: `${parts.terrainBase.label} Cache`,
      hazards: rawHazards.filter((type) => type !== "none"),
      hazardDensity: rawHazards.length ? 1 : 0,
      plantDensity: clampDensity(
        (terrain.plantDensity || 1) *
          (parts.climate.plantDensity || 1) *
          (parts.lifeDensity.plantDensity || 1)
      ),
      creatureDensity: clampDensity(
        (terrain.creatureDensity || 1) *
          (parts.climate.creatureDensity || 1) *
          (parts.lifeDensity.creatureDensity || 1) *
          (parts.creatureBias.creatureDensity || 1)
      ),
      resourceDensity: clampDensity(
        (terrain.resourceDensity || 1) *
          (parts.climate.resourceDensity || 1) *
          (parts.lifeDensity.resourceDensity || 1) *
          (parts.resourceBias.resourceDensity || 1)
      ),
      chestChance: clamp(
        0.45 *
          (terrain.chestChance || 1) *
          (parts.lifeDensity.chestChance || 1) *
          (parts.hazardStyle.chestChance || 1),
        0.05,
        0.82
      ),
      wind: {
        strength: windStrength,
        x: Math.cos(windAngle),
        y: Math.sin(windAngle)
      },
      gravity: {
        id: parts.gravity.id,
        label: parts.gravity.label,
        level: parts.gravity.gravityLevel
      },
      movementEffect: parts.gravity.movementEffect,
      projectileEffect: terrain.projectile || {},
      lighting: {
        tint: lighting.tint,
        playerLight: lighting.lightColor,
        glow: lighting.glow,
        visibility: parts.climate.visibility || 1
      },
      gameplayModifiers: {
        playerSpeed: clamp(
          (parts.gravity.playerSpeed || 1) *
            (terrain.movement?.playerSpeed || 1) *
            (parts.climate.movement?.playerSpeed || 1),
          0.72,
          1.18
        ),
        inertia: clamp(
          (parts.gravity.inertia || 0) + (parts.hazardStyle.movement?.inertia || 0),
          0,
          0.96
        ),
        windPush: windStrength,
        projectileWind: parts.climate.movement?.projectileWind || parts.hazardStyle.movement?.projectileWind || 0,
        projectileRange: (parts.gravity.projectileRange || 1) * (terrain.projectile?.range || 1),
        projectileSpeed: parts.gravity.projectileSpeed || 1,
        knockback: parts.gravity.knockback || 1,
        visibility: parts.climate.visibility || 1
      },
      creatureRules: {
        bias: mergeBiases(
          terrain.creatureBias,
          parts.climate.creatureBias,
          parts.gravity.creatureBias,
          parts.lifeDensity.creatureBias,
          parts.hazardStyle.creatureBias,
          parts.creatureBias.creatureBias
        ),
        density: 1,
        aggressionMod: parts.creatureBias.creatureBias?.aggressive || 1,
        damageMod: parts.hazardStyle.id === "poisonGas" ? 1.08 : 1,
        speedMod: parts.creatureBias.id === "fastCreatures" ? 1.12 : 1,
        detectionMod: parts.creatureBias.id === "laserCreatures" ? 1.1 : 1,
        drift: parts.gravity.id.includes("Gravity") ? parts.gravity.inertia || 0 : 0
      }
    };

    if (profile.hazards.includes("poisonGas")) profile.hazardDensity += 0.5;
    if (profile.hazards.includes("windStream")) profile.hazardDensity += 0.35;
    if (profile.hazards.includes("lavaCrack")) profile.hazardDensity += 0.2;

    return profile;
  }
}

function chooseRegionalPart(seed, category, cx, cy) {
  const parts = BIOME_PARTS[category];
  const broad = valueNoise(`${seed}:${category}:broad`, cx / 4.2, cy / 4.2);
  const detail = valueNoise(`${seed}:${category}:detail`, cx / 1.75, cy / 1.75) * 0.18;
  const value = Math.min(0.999, broad * 0.82 + detail);
  return parts[Math.floor(value * parts.length)];
}

function findPart(category, id) {
  return BIOME_PARTS[category].find((part) => part.id === id) || BIOME_PARTS[category][0];
}

function nameBiome(parts) {
  const words = [
    parts.lifeDensity.nameWord,
    parts.gravity.nameWord,
    parts.climate.nameWord,
    parts.terrainBase.nameWord
  ].filter(Boolean);
  const uniqueWords = [];
  for (const word of words) {
    if (!uniqueWords.includes(word)) uniqueWords.push(word);
  }
  uniqueWords.push(parts.terrainBase.noun);
  return uniqueWords.join(" ");
}

function mergeBiases(...biases) {
  const result = {};
  for (const bias of biases) {
    if (!bias) continue;
    for (const [key, value] of Object.entries(bias)) {
      result[key] = (result[key] || 1) * value;
    }
  }
  return result;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function clampDensity(value) {
  return clamp(value, 0.08, 2.4);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function allowsPropRotation(type) {
  return PROP_ROTATION.has(type);
}

function createHazard(type, id, originX, originY, rng) {
  const base = {
    id,
    type,
    x: originX + randRange(rng, 80, CHUNK_SIZE - 80),
    y: originY + randRange(rng, 80, CHUNK_SIZE - 80)
  };
  if (type === "ice") return { ...base, radius: randRange(rng, 34, 58), slow: 0.82, slide: 1.5 };
  if (type === "poisonGas") return { ...base, radius: randRange(rng, 38, 70), damage: 5 };
  if (type === "lavaCrack") return { ...base, radius: randRange(rng, 32, 52), damage: 9 };
  if (type === "spikes") return { ...base, radius: randRange(rng, 24, 42), damage: 7 };
  if (type === "windStream") {
    const angle = rng() * Math.PI * 2;
    return {
      ...base,
      radius: randRange(rng, 48, 86),
      push: 82,
      windX: Math.cos(angle),
      windY: Math.sin(angle)
    };
  }
  return { ...base, radius: randRange(rng, 28, 52), slow: 0.65 };
}
