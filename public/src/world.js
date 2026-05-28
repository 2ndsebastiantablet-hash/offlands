import { BIOME_PARTS, BOSS_TYPES, STRUCTURE_TYPES } from "./data.js";
import { generateCreatureSpec } from "./creatures.js";
import { choose, maybe, randRange, seeded, valueNoise } from "./random.js";

export const CHUNK_SIZE = 640;
export const VIEW_RADIUS = 2;
export const WORLD_CHUNKS_WIDE = 12;
export const WORLD_CHUNKS_TALL = 12;

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
  constructor(seed = "offlands-001", widthChunks = WORLD_CHUNKS_WIDE, heightChunks = WORLD_CHUNKS_TALL) {
    this.seed = seed;
    this.widthChunks = widthChunks;
    this.heightChunks = heightChunks;
    this.minChunkX = -Math.floor(widthChunks / 2);
    this.minChunkY = -Math.floor(heightChunks / 2);
    this.maxChunkX = this.minChunkX + widthChunks - 1;
    this.maxChunkY = this.minChunkY + heightChunks - 1;
    this.bounds = {
      minX: this.minChunkX * CHUNK_SIZE,
      minY: this.minChunkY * CHUNK_SIZE,
      maxX: (this.maxChunkX + 1) * CHUNK_SIZE,
      maxY: (this.maxChunkY + 1) * CHUNK_SIZE,
      width: widthChunks * CHUNK_SIZE,
      height: heightChunks * CHUNK_SIZE
    };
    this.chunks = new Map();
    this.biomeProfiles = new Map();
    this.generateWorld();
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

  isChunkInside(cx, cy) {
    return cx >= this.minChunkX && cx <= this.maxChunkX && cy >= this.minChunkY && cy <= this.maxChunkY;
  }

  clampChunkCoords(cx, cy) {
    return {
      cx: clamp(cx, this.minChunkX, this.maxChunkX),
      cy: clamp(cy, this.minChunkY, this.maxChunkY)
    };
  }

  clampPosition(x, y, padding = 0) {
    return {
      x: clamp(x, this.bounds.minX + padding, this.bounds.maxX - padding),
      y: clamp(y, this.bounds.minY + padding, this.bounds.maxY - padding)
    };
  }

  generateWorld() {
    for (let cy = this.minChunkY; cy <= this.maxChunkY; cy += 1) {
      for (let cx = this.minChunkX; cx <= this.maxChunkX; cx += 1) {
        const key = this.key(cx, cy);
        this.chunks.set(key, this.generateChunk(cx, cy));
      }
    }
  }

  allChunks() {
    return [...this.chunks.values()];
  }

  getChunk(cx, cy) {
    const clamped = this.clampChunkCoords(cx, cy);
    const key = this.key(clamped.cx, clamped.cy);
    return this.chunks.get(key);
  }

  getBiomeAt(x, y) {
    const pos = this.clampPosition(x, y, 1);
    const { cx, cy } = this.chunkCoords(pos.x, pos.y);
    return this.getChunk(cx, cy).biomeProfile;
  }

  nearbyChunks(x, y, radius = VIEW_RADIUS) {
    const { cx, cy } = this.chunkCoords(x, y);
    const chunks = [];
    for (let yOff = -radius; yOff <= radius; yOff += 1) {
      for (let xOff = -radius; xOff <= radius; xOff += 1) {
        const nextCx = cx + xOff;
        const nextCy = cy + yOff;
        if (this.isChunkInside(nextCx, nextCy)) chunks.push(this.getChunk(nextCx, nextCy));
      }
    }
    return chunks;
  }

  getBiomeProfile(cx, cy) {
    const clamped = this.clampChunkCoords(cx, cy);
    cx = clamped.cx;
    cy = clamped.cy;
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
    const structures = [];

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
      const chestId = `${cx}:${cy}:chest:0`;
      chests.push({
        id: chestId,
        biomeId,
        biomeName: biomeProfile.name,
        x: originX + randRange(rng, 82, CHUNK_SIZE - 82),
        y: originY + randRange(rng, 82, CHUNK_SIZE - 82),
        opened: false,
        loot: createChestLoot(this.seed, chestId, biomeProfile)
      });
    }

    const forcedCatStatue = cx === this.maxChunkX - 2 && cy === this.maxChunkY - 2;
    if (forcedCatStatue || shouldGenerateStructure(cx, cy, biomeProfile, rng)) {
      structures.push(createStructure(this.seed, cx, cy, biomeProfile, rng, forcedCatStatue ? "brokenCatStatue" : null));
    }

    const creatureCount = creatureCountForChunk(cx, cy, biomeProfile, rng);
    for (let index = 0; index < creatureCount; index += 1) {
      let creatureX = originX + randRange(rng, 70, CHUNK_SIZE - 70);
      let creatureY = originY + randRange(rng, 70, CHUNK_SIZE - 70);
      const isFirstDiscoveryCreature = cx === 0 && cy === 0 && index === 0;
      if (isFirstDiscoveryCreature) {
        creatureX = originX + 430;
        creatureY = originY + 360;
      } else if (cx === 0 && cy === 0 && Math.hypot(creatureX - 320, creatureY - 320) < 230) {
        creatureX = originX + CHUNK_SIZE - 95;
        creatureY = originY + CHUNK_SIZE - 95;
      }
      const creature = generateCreatureSpec(
        rng,
        biomeProfile,
        `${cx}:${cy}:creature:${index}`,
        creatureX,
        creatureY
      );
      if (isFirstDiscoveryCreature) {
        creature.profile.isFriendly = true;
        creature.profile.behaviorType = "neutral";
        creature.profile.temperament = "Curious";
        creature.profile.canLeaveOriginBiome = false;
        creature.profile.prefersOriginBiome = true;
        creature.damage = Math.max(1, Math.round(creature.damage * 0.45));
        creature.detection *= 0.55;
        creature.chaseRange *= 0.45;
      }
      creatures.push(creature);
    }

    for (const structure of structures) {
      if (!structure.bossId) continue;
      const boss = BOSS_TYPES[structure.bossId];
      if (!boss) continue;
      creatures.push(createBossCreature(rng, biomeProfile, `${structure.id}:boss:${boss.id}`, structure.x + 22, structure.y + 28, boss));
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
      structures,
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

function creatureCountForChunk(cx, cy, biome, rng) {
  if (cx === 0 && cy === 0) return 1;
  const lifeId = biome.parts?.lifeDensity?.id || "normal";
  const density = biome.creatureDensity || 1;
  const dangerous = lifeId === "infested" || biome.parts?.creatureBias?.id === "aggressiveCreatures" || biome.hazards.length > 1;
  let min = 1;
  let max = 3;

  if (lifeId === "empty" || density < 0.36) {
    min = 0;
    max = 1;
  } else if (lifeId === "sparse" || density < 0.74) {
    min = 0;
    max = 1;
  } else if (dangerous || density > 1.35) {
    min = 2;
    max = 5;
  }

  if (biome.weather === "snowstorm" || biome.weather === "dust storm" || biome.temperature === "freezing") {
    max = Math.max(min, max - 1);
  }

  if (min === 0 && rng() > Math.min(0.76, density * 0.9)) return 0;
  const count = min + Math.floor(rng() * (max - min + 1));
  return clamp(count, 0, max);
}

function shouldGenerateStructure(cx, cy, biome, rng) {
  if (Math.abs(cx) <= 1 && Math.abs(cy) <= 1) return false;
  const baseChance = biome.parts?.lifeDensity?.id === "empty" ? 0.025 : 0.055;
  const structureChance = baseChance + Math.min(0.035, (biome.chestChance || 0.4) * 0.03);
  return rng() < structureChance;
}

function createStructure(seed, cx, cy, biome, rng, forcedTypeId = null) {
  const terrainId = biome.parts?.terrainBase?.id || biome.legacyId;
  const candidates = STRUCTURE_TYPES.filter((type) => type.biomes.includes(terrainId));
  const type = forcedTypeId
    ? STRUCTURE_TYPES.find((entry) => entry.id === forcedTypeId) || STRUCTURE_TYPES[0]
    : choose(rng, candidates.length ? candidates : STRUCTURE_TYPES);
  const id = `${cx}:${cy}:structure:${type.id}`;
  const itemCount = 1 + Math.floor(rng() * 2);
  const itemSpawns = [];
  for (let index = 0; index < itemCount; index += 1) {
    itemSpawns.push({
      id: choose(rng, type.itemSpawns || type.lootTable || ["apple"]),
      quantity: 1,
      offsetX: randRange(rng, -34, 34),
      offsetY: randRange(rng, 34, 76)
    });
  }
  const hasBoss = Boolean(type.boss && (forcedTypeId === type.id || rng() < 0.08));
  return {
    id,
    type: type.id,
    name: type.name,
    x: cx * CHUNK_SIZE + randRange(rng, 120, CHUNK_SIZE - 120),
    y: cy * CHUNK_SIZE + randRange(rng, 120, CHUNK_SIZE - 120),
    color: type.color,
    biomeId: biome.id,
    lootTable: type.lootTable || [],
    itemSpawns,
    bossId: hasBoss ? type.boss : null,
    discovered: false
  };
}

function createBossCreature(rng, biome, id, x, y, boss) {
  const creature = generateCreatureSpec(rng, biome, id, x, y);
  creature.name = boss.name;
  creature.profile.name = boss.name;
  creature.profile.isBoss = true;
  creature.profile.isFriendly = false;
  creature.profile.isTameable = false;
  creature.profile.behaviorType = "hostile";
  creature.profile.temperament = "Boss";
  creature.profile.canLeaveOriginBiome = false;
  creature.profile.prefersOriginBiome = true;
  creature.profile.bossId = boss.id;
  creature.profile.bossPhases = boss.phases;
  creature.profile.specialTraits = unique([...(creature.profile.specialTraits || []), "boss", "darkAura"]);
  creature.profile.lootTable = {
    drops: boss.drops,
    knownDrops: boss.drops.map((drop) => drop.itemId),
    resources: boss.drops.map((drop) => drop.itemId),
    min: 2,
    max: 5,
    rareWeaponChance: 0
  };
  creature.maxHp = boss.health;
  creature.hp = boss.health;
  creature.damage = Math.round(creature.damage * 1.7);
  creature.defense = Math.max(creature.defense || 0, 0.18);
  creature.speed = Math.max(34, Math.round(creature.speed * 0.75));
  creature.bodyRadius = Math.max(54, Math.round((creature.bodyRadius || 26) * 1.9));
  creature.attackRange = Math.max(creature.attackRange || 60, 115);
  creature.chaseRange = Math.max(creature.chaseRange || 260, 420);
  creature.detection = Math.max(creature.detection || 220, 360);
  creature.xp = 180;
  return creature;
}

function createChestLoot(seed, chestId, biome) {
  const rng = seeded(`${seed}:loot:${chestId}`);
  const resources = {};
  const rolls = 2 + Math.floor(rng() * 3);
  for (let index = 0; index < rolls; index += 1) {
    const resource = choose(rng, biome.lootResources);
    resources[resource] = (resources[resource] || 0) + 1 + Math.floor(rng() * 3);
  }
  const weaponId = rng() < 0.42 ? choose(rng, biome.lootWeapons) : null;
  const itemPool = chestItemPool(biome);
  const items = rng() < 0.38 ? [{ id: choose(rng, itemPool), quantity: 1 }] : [];
  const xp = 10 + Math.floor(rng() * 16);
  const summary = [
    ...Object.entries(resources).map(([name, amount]) => `${amount} ${name}`),
    ...items.map((item) => labelize(item.id)),
    weaponId ? labelize(weaponId) : null,
    `${xp} XP`
  ].filter(Boolean).join(", ");
  return { resources, items, weaponId, xp, summary };
}

function chestItemPool(biome) {
  const terrainId = biome.parts?.terrainBase?.id;
  if (terrainId === "crystalGround") return ["glowFruit", "lightBook", "gravityMarble", "crystalRifle"];
  if (terrainId === "mushroomSoil" || terrainId === "swamp") return ["strangeMushroom", "poisonBook", "tinySlimeBuddy", "toxicSlimeBomb"];
  if (terrainId === "boneField" || terrainId === "desert") return ["bonePistol", "shield", "bonePet", "deadCatTail"];
  if (terrainId === "ashland") return ["fireBook", "windJar", "invisibilityBlanket", "Fire Tooth Material"];
  return ["apple", "orange", "helmet", "littleMan", "swiftBoots"];
}

function labelize(value) {
  return String(value || "")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());
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
