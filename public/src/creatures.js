import { BIOMES, CREATURE_PARTS } from "./data.js";
import { maybe } from "./random.js";

const OPTIONAL_CHANCE = {
  head: 0.72,
  eye: 0.68,
  arms: 0.58,
  movement: 0.5,
  skin: 0.38
};

const BODY_TYPES = [
  {
    id: "caterpillar",
    label: "Caterpillar Body",
    nameWord: "Caterpillar",
    shape: "segmented",
    biomes: ["grassland", "swamp", "mushroomSoil"],
    size: 1,
    health: 42,
    speed: 48,
    damage: 8,
    defense: 0.02,
    movementStyles: ["crawling"],
    attacks: ["bite", "poisonSpit", "charge"],
    details: ["poisonSacs", "mushrooms", "spikes"],
    tameItem: "Leaves",
    color: ["#7dc965", "#ffe47a", "#3e6b3b"]
  },
  {
    id: "bat",
    label: "Bat Body",
    nameWord: "Bat",
    shape: "winged",
    biomes: ["mushroomSoil", "crystalGround", "ashland"],
    size: 0.72,
    health: 20,
    speed: 112,
    damage: 6,
    defense: 0,
    canFly: true,
    movementStyles: ["flying", "swooping"],
    attacks: ["swoop", "bite"],
    details: ["wings", "fur", "glowingVeins"],
    tameItem: "Glow Spores",
    color: ["#6e5c94", "#d5d2ff", "#2f2948"]
  },
  {
    id: "crocodile",
    label: "Crocodile Body",
    nameWord: "Crocodile",
    shape: "longJaw",
    biomes: ["swamp", "mushroomSoil"],
    size: 1.25,
    health: 78,
    speed: 58,
    damage: 18,
    defense: 0.16,
    movementStyles: ["walking", "sliding"],
    attacks: ["bite", "charge"],
    details: ["scales", "tail", "armorPlates"],
    tameItem: "Slime",
    color: ["#346e57", "#92d36d", "#1c382e"]
  },
  {
    id: "slime",
    label: "Slime Body",
    nameWord: "Slime",
    shape: "blob",
    biomes: ["mushroomSoil", "swamp"],
    size: 0.95,
    health: 38,
    speed: 54,
    damage: 8,
    defense: 0.08,
    movementStyles: ["sliding", "jumping"],
    attacks: ["poisonSpit", "jumpSlam"],
    details: ["slimeCoating", "poisonSacs", "glowingVeins"],
    tameItem: "Slime",
    color: ["#5be681", "#b8ffcf", "#2f8f55"]
  },
  {
    id: "spider",
    label: "Spider Body",
    nameWord: "Spider",
    shape: "manyLegs",
    biomes: ["boneField", "ashland", "swamp"],
    size: 0.94,
    health: 34,
    speed: 86,
    damage: 10,
    defense: 0.05,
    movementStyles: ["crawling", "ambushing"],
    attacks: ["clawSlash", "spikeShot", "swarmCall"],
    details: ["spikes", "stinger", "longArms"],
    color: ["#403946", "#d35e6b", "#17141d"]
  },
  {
    id: "worm",
    label: "Worm Body",
    nameWord: "Worm",
    shape: "worm",
    biomes: ["ashland", "boneField", "desert", "snowfield"],
    size: 1.08,
    health: 50,
    speed: 68,
    damage: 12,
    defense: 0.08,
    movementStyles: ["burrowing", "crawling"],
    attacks: ["burrowAmbush", "tailStab"],
    details: ["stinger", "bones", "poisonSacs"],
    color: ["#b87d65", "#ffd2a5", "#5d3b31"]
  },
  {
    id: "bird",
    label: "Bird Body",
    nameWord: "Bird",
    shape: "bird",
    biomes: ["grassland", "snowfield", "crystalGround"],
    size: 0.86,
    health: 26,
    speed: 96,
    damage: 7,
    defense: 0.02,
    canFly: true,
    movementStyles: ["flying", "jumping"],
    attacks: ["swoop", "tailStab"],
    details: ["wings", "tail", "fur"],
    tameItem: "Leaves",
    color: ["#71b9d9", "#fff6b8", "#2b5c7b"]
  },
  {
    id: "frog",
    label: "Frog Body",
    nameWord: "Frog",
    shape: "frog",
    biomes: ["grassland", "swamp"],
    size: 0.92,
    health: 32,
    speed: 62,
    damage: 9,
    defense: 0.02,
    canJump: true,
    movementStyles: ["jumping", "sliding"],
    attacks: ["jumpSlam", "poisonSpit"],
    details: ["poisonSacs", "slimeCoating"],
    tameItem: "Leaves",
    color: ["#62b95a", "#f3ea75", "#244f34"]
  },
  {
    id: "skull",
    label: "Skull Body",
    nameWord: "Skull",
    shape: "skull",
    biomes: ["boneField", "desert", "ashland"],
    size: 0.92,
    health: 40,
    speed: 72,
    damage: 13,
    defense: 0.1,
    movementStyles: ["walking", "floating"],
    attacks: ["bite", "fireBreath", "hiveSignal"],
    details: ["bones", "glowingVeins", "spikes"],
    color: ["#f0dfbd", "#ff8b4c", "#3b3028"]
  },
  {
    id: "plant",
    label: "Plant Body",
    nameWord: "Plant",
    shape: "plant",
    biomes: ["grassland", "swamp", "mushroomSoil"],
    size: 1.05,
    health: 46,
    speed: 38,
    damage: 10,
    defense: 0.08,
    movementStyles: ["rooted", "walking"],
    attacks: ["longArmSwipe", "sporeBurst", "toxicGas"],
    details: ["mushrooms", "poisonSacs", "longArms"],
    tameItem: "Leaves",
    color: ["#4ca35a", "#e679dd", "#2d5d38"]
  },
  {
    id: "crystal",
    label: "Crystal Body",
    nameWord: "Crystal",
    shape: "crystal",
    biomes: ["crystalGround", "snowfield"],
    size: 1.02,
    health: 54,
    speed: 46,
    damage: 14,
    defense: 0.26,
    movementStyles: ["floating", "walking"],
    attacks: ["laserBeam", "spikeShot"],
    details: ["crystals", "armorPlates", "glowingVeins"],
    color: ["#8bdcff", "#d7b8ff", "#34417e"]
  },
  {
    id: "boneBeast",
    label: "Bone Beast Body",
    nameWord: "Bone Beast",
    shape: "beast",
    biomes: ["boneField", "desert", "ashland"],
    size: 1.25,
    health: 84,
    speed: 52,
    damage: 20,
    defense: 0.18,
    movementStyles: ["slowStomping", "charging"],
    attacks: ["charge", "clawSlash", "tailStab"],
    details: ["bones", "armorPlates", "spikes"],
    color: ["#e8d5b5", "#b96040", "#4a3429"]
  },
  {
    id: "floatingOrb",
    label: "Floating Orb Body",
    nameWord: "Orb",
    shape: "orb",
    biomes: ["crystalGround", "mushroomSoil", "snowfield"],
    size: 0.88,
    health: 34,
    speed: 74,
    damage: 12,
    defense: 0.12,
    canFly: true,
    movementStyles: ["floating", "teleporting"],
    attacks: ["laserBeam", "rangedProjectile"],
    details: ["glowingVeins", "crystals"],
    tameItem: "Glow Spores",
    color: ["#79f4ff", "#ff8df1", "#2f386d"]
  },
  {
    id: "tinyBug",
    label: "Tiny Bug Body",
    nameWord: "Tiny Bug",
    shape: "tinyBug",
    biomes: ["grassland", "swamp", "mushroomSoil"],
    size: 0.58,
    health: 14,
    speed: 126,
    damage: 5,
    defense: 0,
    movementStyles: ["walking", "crawling"],
    attacks: ["bite", "swarmCall"],
    details: ["wings", "stinger", "spikes"],
    tameItem: "Leaves",
    color: ["#91e274", "#ffd850", "#1c3323"]
  },
  {
    id: "giantHeavy",
    label: "Giant Heavy Body",
    nameWord: "Giant",
    shape: "giant",
    biomes: ["boneField", "ashland", "desert", "crystalGround"],
    size: 1.65,
    health: 130,
    speed: 28,
    damage: 26,
    defense: 0.26,
    movementStyles: ["slowStomping", "charging"],
    attacks: ["jumpSlam", "charge", "clawSlash"],
    details: ["armorPlates", "spikes", "bones"],
    color: ["#8c8884", "#f0d58f", "#2f3035"]
  }
];

const HEAD_TYPES = [
  { id: "noHead", label: "No Head", hasHead: false, weight: 0.12 },
  { id: "oneHead", label: "One Head", hasHead: true, weight: 1 },
  { id: "multipleHeads", label: "Multiple Heads", hasHead: true, health: 12, detect: 40, weight: 0.16 },
  { id: "skullHead", label: "Skull Head", hasHead: true, damage: 5, aggression: 1.2, tags: ["boneField", "desert", "ashland"], weight: 0.35 },
  { id: "mushroomHead", label: "Mushroom Head", hasHead: true, spore: true, tags: ["mushroomSoil", "swamp"], weight: 0.35 },
  { id: "crocodileHead", label: "Crocodile Head", hasHead: true, damage: 7, attacks: ["bite"], tags: ["swamp"], weight: 0.22 },
  { id: "birdBeak", label: "Bird Beak", hasHead: true, damage: 3, attacks: ["swoop"], tags: ["grassland", "snowfield"], weight: 0.24 },
  { id: "crystalCrown", label: "Crystal Crown", hasHead: true, defense: 0.08, attacks: ["laserBeam"], tags: ["crystalGround"], weight: 0.22 }
];

const FACE_TYPES = [
  { id: "blankFace", label: "Blank Face", hasFace: true, weight: 0.5 },
  { id: "oneEye", label: "One Eye", hasFace: true, laser: true, detect: 55, attacks: ["laserBeam"], weight: 0.42 },
  { id: "threeEyes", label: "Three Eyes", hasFace: true, detect: 120, weight: 0.34 },
  { id: "noEyes", label: "No Eyes", hasFace: true, detect: -45, weight: 0.16 },
  { id: "giantMouth", label: "Giant Mouth", hasFace: true, damage: 6, attacks: ["bite"], weight: 0.28 },
  { id: "maskFace", label: "Mask Face", hasFace: true, defense: 0.07, weight: 0.2 },
  { id: "glowingFace", label: "Glowing Face", hasFace: true, detect: 50, glow: true, attacks: ["rangedProjectile"], weight: 0.22 },
  { id: "noFace", label: "No Face", hasFace: false, detect: -25, weight: 0.12 }
];

const DETAILS = [
  { id: "spikes", label: "Spikes", defense: 0.05, damage: 4, attacks: ["spikeShot"], tags: ["boneField", "ashland"] },
  { id: "mushrooms", label: "Mushrooms", health: 8, attacks: ["sporeBurst"], tags: ["mushroomSoil", "swamp"] },
  { id: "crystals", label: "Crystals", defense: 0.12, attacks: ["laserBeam", "spikeShot"], tags: ["crystalGround", "snowfield"] },
  { id: "bones", label: "Bones", defense: 0.08, damage: 2, tags: ["boneField", "desert", "ashland"] },
  { id: "slimeCoating", label: "Slime Coating", defense: 0.05, movement: "sliding", tags: ["swamp", "mushroomSoil"] },
  { id: "fur", label: "Fur", health: 6, tags: ["grassland", "snowfield"] },
  { id: "scales", label: "Scales", defense: 0.1, tags: ["swamp", "desert"] },
  { id: "armorPlates", label: "Armor Plates", defense: 0.18, speed: -8, health: 16, tags: ["crystalGround", "boneField", "ashland"] },
  { id: "glowingVeins", label: "Glowing Veins", detect: 35, glow: true, attacks: ["rangedProjectile"], tags: ["crystalGround", "mushroomSoil"] },
  { id: "poisonSacs", label: "Poison Sacs", damage: 2, attacks: ["toxicGas", "poisonSpit"], tags: ["swamp", "mushroomSoil"] },
  { id: "wings", label: "Wings", speed: 18, canFly: true, movement: "flying", tags: ["grassland", "mushroomSoil", "crystalGround"] },
  { id: "tail", label: "Tail", damage: 3, attacks: ["tailStab"], tags: ["swamp", "desert"] },
  { id: "stinger", label: "Stinger", damage: 5, attacks: ["tailStab", "poisonSpit"], tags: ["swamp", "boneField"] },
  { id: "longArms", label: "Long Arms", damage: 4, armLength: 1.75, attacks: ["longArmSwipe"], tags: ["plant", "boneField", "ashland"] }
];

const TEMPERAMENTS = [
  { id: "hostile", label: "Hostile", aggression: 1.25, friendly: false, tameable: false },
  { id: "territorial", label: "Territorial", aggression: 1, friendly: false, tameable: false },
  { id: "neutral", label: "Neutral", aggression: 0.7, friendly: false, tameable: true },
  { id: "friendly", label: "Friendly", aggression: 0.25, friendly: true, tameable: true },
  { id: "scared", label: "Scared", aggression: 0.2, friendly: true, tameable: true, flees: true },
  { id: "hive", label: "Hive", aggression: 1.15, friendly: false, tameable: false, hive: true },
  { id: "ambusher", label: "Ambusher", aggression: 1.35, friendly: false, tameable: false }
];

const HEALTH_TIERS = [
  { id: "tiny", label: "Tiny/Weak", hp: 0.66, speed: 1.18, damage: 0.78, size: 0.82, chance: 0.24 },
  { id: "normal", label: "Normal", hp: 1, speed: 1, damage: 1, size: 1, chance: 0.61 },
  { id: "tough", label: "Tough", hp: 1.45, speed: 0.9, damage: 1.16, size: 1.12, chance: 0.12 },
  { id: "giant", label: "Giant", hp: 2.1, speed: 0.72, damage: 1.4, size: 1.45, chance: 0.027 },
  { id: "nearInvincible", label: "Nearly Invincible", hp: 12, speed: 0.42, damage: 1.1, size: 1.25, chance: 0.003 }
];

export function generateCreatureSpec(rng, biomeProfileOrId, id, x, y) {
  const biome = normalizeBiome(biomeProfileOrId);
  const bodyType = pickBodyType(rng, biome);
  const parts = generateLegacyParts(rng, biome, bodyType);
  const profile = generateProfile(rng, biome, bodyType, parts, id, x, y);
  const stats = calculateProfileStats(profile, parts, biome);

  return {
    id,
    x,
    y,
    spawnX: x,
    spawnY: y,
    vx: 0,
    vy: 0,
    wanderAngle: rng() * Math.PI * 2,
    wanderTimer: 0,
    attackTimer: 0,
    specialTimer: 600 + rng() * 1500,
    laserTimer: 500 + rng() * 1200,
    sporeTimer: 900 + rng() * 1600,
    jumpTimer: 300 + rng() * 1300,
    teleportTimer: 2500 + rng() * 2800,
    hiveAlertTimer: 0,
    burrowTimer: 0,
    burnTimer: 0,
    slowTimer: 0,
    hurtTimer: 0,
    tamePulse: 0,
    dead: false,
    name: profile.name,
    parts,
    profile,
    biomeId: biome.legacyId,
    biomeName: biome.name,
    biomeProfileId: biome.id,
    ...stats,
    hp: stats.maxHp
  };
}

function generateProfile(rng, biome, bodyType, parts, id, x, y) {
  const headType = pickHeadType(rng, biome, bodyType);
  const faceType = headType.hasHead === false ? findById(FACE_TYPES, "noFace") : pickFaceType(rng, biome, bodyType, parts);
  const details = pickDetails(rng, biome, bodyType, parts);
  const tier = pickTier(rng, x, y, bodyType);
  const temperament = pickTemperament(rng, biome, bodyType, tier);
  const movementStyle = pickMovementStyle(rng, biome, bodyType, details, parts);
  const attackStyle = pickAttackStyle(rng, biome, bodyType, headType, faceType, details, parts, temperament);
  const hasWings = detailIds(details).includes("wings") || parts.movement?.id === "wings" || bodyType.canFly;
  const hasLongArms = detailIds(details).includes("longArms");
  const hiveMindId = temperament.hive || bodyType.attacks.includes("swarmCall") || attackStyle === "hiveSignal"
    ? `hive-${biome.id}-${Math.floor((x + y) / 520)}`
    : null;
  const canLeaveOriginBiome = hasWings || ["bat", "bird", "floatingOrb"].includes(bodyType.id) || temperament.id === "hostile" || temperament.id === "hive";
  const isFriendly = temperament.friendly && !hiveMindId;
  const isTameable = Boolean(temperament.tameable && bodyType.tameItem && !tier.id.includes("Invincible") && !hiveMindId);
  const colorPalette = makePalette(bodyType, biome, details, temperament, tier);
  const name = nameCreatureProfile(bodyType, headType, faceType, details, temperament, tier);

  return {
    name,
    originBiomeId: biome.id,
    originBiomeName: biome.name,
    canLeaveOriginBiome,
    prefersOriginBiome: true,
    colorPalette,
    bodyType: bodyType.id,
    bodyTypeLabel: bodyType.label,
    bodyShape: bodyType.shape,
    headType: headType.id,
    headLabel: headType.label,
    faceType: faceType.id,
    faceLabel: faceType.label,
    hasFace: faceType.hasFace !== false,
    hasHead: headType.hasHead !== false,
    arms: hasLongArms ? "long" : parts.arms ? "claws" : rng() < 0.28 ? "small" : "none",
    armLength: hasLongArms ? 1.75 : parts.arms ? 1.1 : 0,
    legs: legsForBody(bodyType, movementStyle),
    movementStyle,
    attackStyle,
    behaviorType: temperament.id,
    temperament: temperament.label,
    isFriendly,
    isTameable,
    isTamed: false,
    followsPlayer: false,
    fightsForPlayer: false,
    hiveMindId,
    canFly: hasWings || movementStyle === "flying" || movementStyle === "floating",
    canJump: Boolean(bodyType.canJump || movementStyle === "jumping"),
    speedTier: tier.id,
    healthTier: tier.id,
    isInvincible: tier.id === "nearInvincible",
    specialTraits: unique([
      bodyType.shape,
      ...detailIds(details),
      parts.eye?.laser ? "laserEye" : null,
      parts.head?.spore ? "sporeHead" : null,
      parts.skin?.id === "armorSkin" ? "armorSkin" : null,
      temperament.hive ? "hiveMind" : null,
      tier.id === "nearInvincible" ? "darkAura" : null
    ]),
    bodyDetails: details.map((detail) => detail.id),
    bodyDetailLabels: details.map((detail) => detail.label),
    tameItem: bodyType.tameItem || null,
    lootTable: buildLootTable(bodyType, biome, details, tier),
    originX: x,
    originY: y
  };
}

function generateLegacyParts(rng, biome, bodyType) {
  const bodyBias = { ...(biome.creatureRules?.bias || {}) };
  if (["bat", "tinyBug", "spider"].includes(bodyType.id)) bodyBias.bugBody = (bodyBias.bugBody || 1) * 1.6;
  if (["slime", "frog", "floatingOrb"].includes(bodyType.id)) bodyBias.blobBody = (bodyBias.blobBody || 1) * 1.5;
  const parts = {
    body: weightedPick(rng, CREATURE_PARTS.body, bodyBias)
  };

  for (const category of ["head", "eye", "arms", "movement", "skin"]) {
    if (maybe(rng, optionalChance(category, biome, bodyType))) {
      parts[category] = weightedPick(rng, CREATURE_PARTS[category], bodyBias);
    }
  }
  return parts;
}

function normalizeBiome(biomeProfileOrId) {
  if (typeof biomeProfileOrId === "object" && biomeProfileOrId?.creatureRules) return biomeProfileOrId;
  const legacy = BIOMES[biomeProfileOrId] || BIOMES.wildlands;
  return {
    ...legacy,
    id: legacy.id,
    legacyId: legacy.id,
    terrainType: legacy.name,
    resources: legacy.resources,
    creatureRules: { bias: {}, aggressionMod: legacy.id === "desert" ? 1.15 : 1, damageMod: 1, speedMod: 1, detectionMod: 1 },
    lighting: { glow: 1 }
  };
}

function optionalChance(category, biome, bodyType) {
  const bias = biome.creatureRules.bias || {};
  let chance = OPTIONAL_CHANCE[category];
  if (category === "arms") chance *= bias.claws || 1;
  if (category === "eye") chance *= Math.max(bias.oneEye || 1, bias.threeEyes || 1);
  if (category === "movement") chance *= Math.max(bias.wings || 1, bias.threeFeet || 1);
  if (category === "skin") chance *= bias.armorSkin || (bodyType.id === "crystal" ? 1.5 : 1);
  if (category === "head") chance *= Math.max(bias.skullHead || 1, bias.mushroomHead || 1);
  if (bias.peaceful) chance *= 0.82;
  if (bodyType.canFly && category === "movement") chance *= 1.35;
  return Math.max(0.08, Math.min(0.96, chance));
}

function pickBodyType(rng, biome) {
  return weightedPick(rng, BODY_TYPES, bodyTypeWeight(biome));
}

function bodyTypeWeight(biome) {
  return Object.fromEntries(
    BODY_TYPES.map((body) => {
      let weight = 1;
      if (body.id === "giantHeavy") weight *= 0.18;
      const terrainId = biome.parts?.terrainBase?.id || biome.legacyId;
      if (body.biomes.includes(terrainId)) weight *= 2.8;
      if (biome.creatureRules?.bias?.wings && body.canFly) weight *= biome.creatureRules.bias.wings;
      if (biome.creatureRules?.bias?.oneEye && ["crystal", "floatingOrb"].includes(body.id)) weight *= biome.creatureRules.bias.oneEye;
      if (biome.creatureRules?.bias?.armorSkin && ["crystal", "boneBeast", "giantHeavy"].includes(body.id)) weight *= biome.creatureRules.bias.armorSkin;
      if (biome.creatureRules?.bias?.mushroomHead && ["slime", "plant", "caterpillar"].includes(body.id)) weight *= biome.creatureRules.bias.mushroomHead;
      if (biome.creatureRules?.bias?.threeFeet && ["tinyBug", "bat", "spider"].includes(body.id)) weight *= biome.creatureRules.bias.threeFeet;
      if (terrainId === "snowfield" && ["crocodile", "frog"].includes(body.id)) weight *= 0.25;
      return [body.id, weight];
    })
  );
}

function pickHeadType(rng, biome, bodyType) {
  const weights = {};
  for (const head of HEAD_TYPES) {
    let weight = head.weight || 1;
    if (head.tags?.includes(biome.parts?.terrainBase?.id)) weight *= 2.4;
    if (bodyType.id === "crocodile" && head.id === "crocodileHead") weight *= 5;
    if (bodyType.id === "bird" && head.id === "birdBeak") weight *= 4;
    if (bodyType.id === "skull" && head.id === "skullHead") weight *= 4;
    if (bodyType.id === "floatingOrb" && head.id === "noHead") weight *= 3.5;
    if (biome.creatureRules?.bias?.mushroomHead && head.id === "mushroomHead") weight *= biome.creatureRules.bias.mushroomHead;
    if (biome.creatureRules?.bias?.skullHead && head.id === "skullHead") weight *= biome.creatureRules.bias.skullHead;
    weights[head.id] = weight;
  }
  return weightedPick(rng, HEAD_TYPES, weights);
}

function pickFaceType(rng, biome, bodyType, parts) {
  const weights = {};
  for (const face of FACE_TYPES) {
    let weight = face.weight || 1;
    if (parts.eye?.id === "oneEye" && face.id === "oneEye") weight *= 4;
    if (parts.eye?.id === "threeEyes" && face.id === "threeEyes") weight *= 4;
    if (biome.creatureRules?.bias?.oneEye && face.id === "oneEye") weight *= biome.creatureRules.bias.oneEye;
    if (bodyType.id === "crocodile" && face.id === "giantMouth") weight *= 3;
    if (bodyType.id === "crystal" && face.id === "glowingFace") weight *= 3;
    weights[face.id] = weight;
  }
  return weightedPick(rng, FACE_TYPES, weights);
}

function pickDetails(rng, biome, bodyType, parts) {
  const count = 1 + Math.floor(rng() * 3);
  const selected = [];
  const preferred = new Set(bodyType.details || []);
  while (selected.length < count) {
    const weights = {};
    for (const detail of DETAILS) {
      let weight = 1;
      if (preferred.has(detail.id)) weight *= 2.6;
      if (detail.tags?.includes(biome.parts?.terrainBase?.id)) weight *= 2.2;
      if (parts.skin?.id === "armorSkin" && detail.id === "armorPlates") weight *= 2;
      if (parts.movement?.id === "wings" && detail.id === "wings") weight *= 3;
      if (parts.head?.id === "mushroomHead" && detail.id === "mushrooms") weight *= 2.5;
      if (selected.some((item) => item.id === detail.id)) weight = 0;
      weights[detail.id] = weight;
    }
    const next = weightedPick(rng, DETAILS, weights);
    if (!selected.includes(next)) selected.push(next);
  }
  return selected;
}

function pickTier(rng, x, y, bodyType) {
  const nearSpawn = Math.hypot(x - 320, y - 320) < 950;
  const weights = Object.fromEntries(HEALTH_TIERS.map((tier) => [tier.id, tier.chance]));
  if (nearSpawn) weights.nearInvincible = 0;
  if (bodyType.id === "giantHeavy") {
    weights.giant *= 2.8;
    weights.tiny *= 0.2;
  }
  return weightedPick(rng, HEALTH_TIERS, weights);
}

function pickTemperament(rng, biome, bodyType, tier) {
  const weights = {};
  for (const temperament of TEMPERAMENTS) {
    let weight = 1;
    if (temperament.id === "hostile") weight *= biome.creatureRules?.bias?.aggressive || 1;
    if (temperament.id === "friendly" || temperament.id === "scared" || temperament.id === "neutral") {
      weight *= biome.creatureRules?.bias?.peaceful || 1;
      if (!bodyType.tameItem) weight *= 0.4;
    }
    if (temperament.id === "hive" && ["spider", "tinyBug", "skull", "boneBeast"].includes(bodyType.id)) weight *= 2.4;
    if (temperament.id === "ambusher" && ["spider", "worm", "crocodile"].includes(bodyType.id)) weight *= 2.1;
    if (tier.id === "nearInvincible" && temperament.friendly) weight = 0;
    weights[temperament.id] = weight;
  }
  return weightedPick(rng, TEMPERAMENTS, weights);
}

function pickMovementStyle(rng, biome, bodyType, details, parts) {
  const options = [...(bodyType.movementStyles || ["walking"])];
  for (const detail of details) {
    if (detail.movement && !options.includes(detail.movement)) options.push(detail.movement);
  }
  if (parts.movement?.id === "wings" && !options.includes("flying")) options.push("flying");
  if ((biome.gravity?.id || "").includes("zero") && !options.includes("drifting")) options.push("drifting");
  return options[Math.floor(rng() * options.length)];
}

function pickAttackStyle(rng, biome, bodyType, headType, faceType, details, parts, temperament) {
  const options = [...(bodyType.attacks || ["bite"])];
  for (const source of [headType, faceType, ...details]) {
    for (const attack of source.attacks || []) {
      if (!options.includes(attack)) options.push(attack);
    }
  }
  if (parts.eye?.laser && !options.includes("laserBeam")) options.push("laserBeam");
  if (parts.head?.spore && !options.includes("sporeBurst")) options.push("sporeBurst");
  if (parts.arms?.melee && !options.includes("clawSlash")) options.push("clawSlash");
  if (temperament.hive && !options.includes("hiveSignal")) options.push("hiveSignal");
  if (biome.creatureRules?.bias?.oneEye && !options.includes("laserBeam")) options.push("laserBeam");
  return options[Math.floor(rng() * options.length)];
}

function calculateProfileStats(profile, parts, biome) {
  const body = BODY_TYPES.find((entry) => entry.id === profile.bodyType) || BODY_TYPES[0];
  const tier = HEALTH_TIERS.find((entry) => entry.id === profile.healthTier) || HEALTH_TIERS[1];
  const details = DETAILS.filter((detail) => profile.bodyDetails.includes(detail.id));
  const head = HEAD_TYPES.find((entry) => entry.id === profile.headType) || HEAD_TYPES[0];
  const face = FACE_TYPES.find((entry) => entry.id === profile.faceType) || FACE_TYPES[0];

  let maxHp = body.health * tier.hp;
  let speed = body.speed * tier.speed;
  let damage = body.damage * tier.damage;
  let defense = body.defense || 0;
  let detection = 205;
  let aggression = 1;

  for (const part of Object.values(parts)) {
    if (!part) continue;
    maxHp += (part.health || 0) * 0.55;
    speed += (part.speed || 0) * 0.65;
    damage += (part.damage || 0) * 0.75;
    defense += (part.defense || 0) * 0.7;
    detection += part.detect || 0;
    aggression *= part.aggression || 1;
  }

  for (const source of [head, face, ...details]) {
    maxHp += source.health || 0;
    speed += source.speed || 0;
    damage += source.damage || 0;
    defense += source.defense || 0;
    detection += source.detect || 0;
    aggression *= source.aggression || 1;
  }

  const rules = biome.creatureRules || {};
  if (rules.bias?.aggressive) aggression *= rules.bias.aggressive;
  if (rules.bias?.peaceful) aggression *= 0.75;
  speed *= rules.speedMod || 1;
  damage *= rules.damageMod || 1;
  detection *= rules.detectionMod || 1;
  aggression *= rules.aggressionMod || 1;
  if (profile.isFriendly) aggression *= 0.28;
  if (profile.isInvincible) defense = Math.max(defense, 0.92);

  return {
    maxHp: Math.max(8, Math.round(maxHp)),
    speed: Math.max(12, Math.round(speed)),
    damage: Math.max(2, Math.round(damage)),
    defense: Math.min(0.96, defense),
    detection: Math.round(Math.max(80, detection)),
    chaseRange: Math.round(Math.max(160, detection * (profile.canLeaveOriginBiome ? 1.65 : 1.15))),
    aggression,
    flying: profile.canFly,
    laser: profile.attackStyle === "laserBeam" || Boolean(parts.eye?.laser),
    spore: ["sporeBurst", "toxicGas"].includes(profile.attackStyle) || Boolean(parts.head?.spore),
    clawed: ["clawSlash", "longArmSwipe"].includes(profile.attackStyle) || Boolean(parts.arms?.melee),
    drift: rules.drift || (profile.movementStyle === "floating" ? 0.45 : 0),
    bodyRadius: Math.round(22 * body.size * tier.size),
    attackRange: attackRangeFor(profile),
    attackCooldown: attackCooldownFor(profile),
    knockbackResistance: Math.min(0.85, defense + (profile.healthTier === "giant" ? 0.2 : 0)),
    xp: Math.round(profile.isFriendly ? 4 : 10 + maxHp * 0.28 + damage)
  };
}

export function calculateStats(parts, biomeProfileOrId) {
  const biome = normalizeBiome(biomeProfileOrId);
  const bodyType = BODY_TYPES[0];
  const profile = generateProfile(() => 0.45, biome, bodyType, parts, "preview", 0, 0);
  return calculateProfileStats(profile, parts, biome);
}

export function nameCreature(parts) {
  const words = [];
  for (const category of ["skin", "movement", "eye", "head"]) {
    if (parts[category]?.nameWord) words.push(parts[category].nameWord);
  }
  words.push(parts.body.nameWord);
  return words.join(" ");
}

export function drawCreature(ctx, creature, sx, sy, scale = 1) {
  const profile = creature.profile || fallbackProfile(creature);
  const palette = profile.colorPalette;
  const bodyRadius = (creature.bodyRadius || 22) * scale;
  const bob = profile.canFly || profile.movementStyle === "floating"
    ? Math.sin(performance.now() / 210 + creature.x * 0.01) * 5
    : profile.movementStyle === "jumping"
      ? Math.max(0, Math.sin(performance.now() / 190 + creature.x)) * -5
      : 0;

  ctx.save();
  ctx.translate(sx, sy + bob);
  ctx.scale(scale, scale);
  ctx.globalAlpha = creature.hurtTimer > 0 ? 0.65 : profile.movementStyle === "burrowing" && creature.burrowTimer > 0 ? 0.55 : 1;

  drawCreatureAuras(ctx, creature, profile, bodyRadius);
  drawWings(ctx, profile, bodyRadius);
  drawBodyShape(ctx, profile, bodyRadius);
  drawBodyDetails(ctx, profile, bodyRadius);
  drawHeadAndFace(ctx, profile, bodyRadius);
  drawCreatureLabels(ctx, creature, profile, bodyRadius);
  ctx.restore();
}

function drawCreatureAuras(ctx, creature, profile, bodyRadius) {
  if (profile.isInvincible) {
    ctx.strokeStyle = "rgba(17, 15, 26, 0.82)";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(0, 0, bodyRadius + 10 + Math.sin(performance.now() / 250) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (profile.isTamed) {
    ctx.strokeStyle = "rgba(112, 232, 255, 0.8)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, bodyRadius + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#ff7aa8";
    circle(ctx, 0, -bodyRadius - 15, 4);
  } else if (profile.isFriendly) {
    ctx.strokeStyle = "rgba(170, 232, 255, 0.55)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, bodyRadius + 5, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.strokeStyle = creature.hiveAlertTimer > 0 ? "rgba(255, 64, 64, 0.72)" : "rgba(255, 115, 82, 0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, bodyRadius + 4, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (profile.hiveMindId) {
    ctx.fillStyle = "rgba(255, 88, 88, 0.85)";
    for (let i = 0; i < 3; i += 1) {
      const angle = performance.now() / 420 + i * 2.09;
      circle(ctx, Math.cos(angle) * (bodyRadius + 12), Math.sin(angle) * (bodyRadius + 12), 3);
    }
  }
}

function drawWings(ctx, profile, bodyRadius) {
  if (!profile.canFly && !profile.specialTraits.includes("wings")) return;
  ctx.fillStyle = profile.colorPalette.detail;
  ctx.globalAlpha *= 0.72;
  ellipse(ctx, -bodyRadius * 0.9, -4, bodyRadius * 0.9, bodyRadius * 0.34, -0.48);
  ellipse(ctx, bodyRadius * 0.9, -4, bodyRadius * 0.9, bodyRadius * 0.34, 0.48);
  ctx.globalAlpha = 1;
}

function drawBodyShape(ctx, profile, bodyRadius) {
  ctx.fillStyle = profile.colorPalette.body;
  const r = bodyRadius;
  switch (profile.bodyType) {
    case "caterpillar":
      for (let i = -2; i <= 2; i += 1) {
        ellipse(ctx, i * r * 0.42, Math.sin(i) * 3, r * 0.42, r * 0.36, 0);
      }
      break;
    case "bat":
      ellipse(ctx, 0, 0, r * 0.68, r * 0.48, 0);
      break;
    case "crocodile":
      ellipse(ctx, -r * 0.18, 0, r * 1.25, r * 0.45, 0);
      ctx.fillStyle = profile.colorPalette.accent;
      ellipse(ctx, r * 0.92, -1, r * 0.56, r * 0.27, 0);
      break;
    case "spider":
      ellipse(ctx, -r * 0.25, 0, r * 0.6, r * 0.48, 0);
      ellipse(ctx, r * 0.35, 0, r * 0.5, r * 0.4, 0);
      ctx.strokeStyle = profile.colorPalette.dark;
      ctx.lineWidth = 3;
      for (let i = -2; i <= 2; i += 1) {
        line(ctx, -r * 0.2, i * 5, -r * 1.1, i * 12);
        line(ctx, r * 0.25, i * 5, r * 1.1, i * 12);
      }
      break;
    case "worm":
      for (let i = -3; i <= 3; i += 1) {
        ellipse(ctx, i * r * 0.32, Math.sin(i * 1.2) * 4, r * 0.34, r * 0.32, 0);
      }
      break;
    case "bird":
      ellipse(ctx, 0, 2, r * 0.72, r * 0.5, -0.1);
      break;
    case "frog":
      ellipse(ctx, 0, 2, r * 0.78, r * 0.58, 0);
      ctx.fillStyle = profile.colorPalette.accent;
      ellipse(ctx, -r * 0.52, r * 0.44, r * 0.25, r * 0.14, 0);
      ellipse(ctx, r * 0.52, r * 0.44, r * 0.25, r * 0.14, 0);
      break;
    case "skull":
      roundRect(ctx, -r * 0.62, -r * 0.58, r * 1.24, r * 1.05, r * 0.3);
      break;
    case "plant":
      ellipse(ctx, 0, 4, r * 0.65, r * 0.55, 0);
      ctx.fillStyle = profile.colorPalette.detail;
      for (let i = 0; i < 5; i += 1) {
        ellipse(ctx, Math.cos(i * 1.26) * r * 0.38, Math.sin(i * 1.26) * r * 0.38, r * 0.18, r * 0.36, i);
      }
      break;
    case "crystal":
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.72, -r * 0.12);
      ctx.lineTo(r * 0.42, r * 0.9);
      ctx.lineTo(-r * 0.52, r * 0.72);
      ctx.lineTo(-r * 0.75, -r * 0.1);
      ctx.closePath();
      ctx.fill();
      break;
    case "boneBeast":
    case "giantHeavy":
      roundRect(ctx, -r * 0.75, -r * 0.58, r * 1.5, r * 1.18, r * 0.28);
      break;
    case "floatingOrb":
      circle(ctx, 0, 0, r * 0.72);
      ctx.strokeStyle = profile.colorPalette.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.95, 0.4, Math.PI * 1.7);
      ctx.stroke();
      break;
    case "tinyBug":
      ellipse(ctx, 0, 0, r * 0.72, r * 0.52, 0);
      ctx.strokeStyle = profile.colorPalette.dark;
      ctx.lineWidth = 2;
      for (let i = -1; i <= 1; i += 1) {
        line(ctx, -r * 0.42, i * 5, -r * 0.9, i * 8);
        line(ctx, r * 0.42, i * 5, r * 0.9, i * 8);
      }
      break;
    default:
      blob(ctx, 0, 2, r, r * 0.82);
      break;
  }
}

function drawBodyDetails(ctx, profile, bodyRadius) {
  const details = profile.bodyDetails || [];
  if (details.includes("armorPlates")) {
    ctx.strokeStyle = profile.colorPalette.detail;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, bodyRadius * 0.9, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (details.includes("spikes")) {
    ctx.fillStyle = profile.colorPalette.detail;
    for (let i = 0; i < 7; i += 1) {
      const angle = (i / 7) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * bodyRadius * 0.65, Math.sin(angle) * bodyRadius * 0.65);
      ctx.lineTo(Math.cos(angle - 0.12) * bodyRadius * 1.12, Math.sin(angle - 0.12) * bodyRadius * 1.12);
      ctx.lineTo(Math.cos(angle + 0.12) * bodyRadius * 1.12, Math.sin(angle + 0.12) * bodyRadius * 1.12);
      ctx.fill();
    }
  }
  if (details.includes("mushrooms")) {
    ctx.fillStyle = "#f9e8ff";
    rect(ctx, -5, -bodyRadius - 3, 10, 12);
    ctx.fillStyle = "#ff72d2";
    ellipse(ctx, 0, -bodyRadius - 7, 16, 8, 0);
  }
  if (details.includes("crystals")) {
    ctx.fillStyle = "#a7efff";
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * 9, -bodyRadius - 12);
      ctx.lineTo(i * 9 - 6, -bodyRadius + 8);
      ctx.lineTo(i * 9 + 7, -bodyRadius + 8);
      ctx.closePath();
      ctx.fill();
    }
  }
  if (details.includes("poisonSacs")) {
    ctx.fillStyle = "rgba(143, 255, 102, 0.78)";
    circle(ctx, -bodyRadius * 0.45, bodyRadius * 0.18, bodyRadius * 0.22);
    circle(ctx, bodyRadius * 0.4, bodyRadius * 0.1, bodyRadius * 0.18);
  }
  if (details.includes("tail") || details.includes("stinger")) {
    ctx.strokeStyle = profile.colorPalette.detail;
    ctx.lineWidth = 4;
    line(ctx, -bodyRadius * 0.65, 0, -bodyRadius * 1.25, bodyRadius * 0.25);
    if (details.includes("stinger")) {
      ctx.fillStyle = profile.colorPalette.detail;
      ctx.beginPath();
      ctx.moveTo(-bodyRadius * 1.35, bodyRadius * 0.3);
      ctx.lineTo(-bodyRadius * 1.1, bodyRadius * 0.14);
      ctx.lineTo(-bodyRadius * 1.13, bodyRadius * 0.48);
      ctx.fill();
    }
  }
  if (profile.armLength > 0) {
    ctx.strokeStyle = profile.colorPalette.accent;
    ctx.lineWidth = profile.arms === "long" ? 5 : 3;
    const length = bodyRadius * (profile.armLength || 1);
    line(ctx, -bodyRadius * 0.45, 0, -length, bodyRadius * 0.55);
    line(ctx, bodyRadius * 0.45, 0, length, bodyRadius * 0.55);
  }
}

function drawHeadAndFace(ctx, profile, bodyRadius) {
  if (profile.hasHead) {
    ctx.fillStyle = profile.colorPalette.accent;
    if (profile.headType === "multipleHeads") {
      ellipse(ctx, -bodyRadius * 0.33, -bodyRadius * 0.78, bodyRadius * 0.28, bodyRadius * 0.24, 0);
      ellipse(ctx, bodyRadius * 0.33, -bodyRadius * 0.78, bodyRadius * 0.28, bodyRadius * 0.24, 0);
    } else if (profile.headType === "birdBeak") {
      ellipse(ctx, 0, -bodyRadius * 0.75, bodyRadius * 0.34, bodyRadius * 0.25, 0);
      ctx.fillStyle = "#f5d05b";
      ctx.beginPath();
      ctx.moveTo(bodyRadius * 0.24, -bodyRadius * 0.75);
      ctx.lineTo(bodyRadius * 0.66, -bodyRadius * 0.68);
      ctx.lineTo(bodyRadius * 0.24, -bodyRadius * 0.6);
      ctx.fill();
    } else if (profile.headType === "crocodileHead") {
      ellipse(ctx, bodyRadius * 0.48, -bodyRadius * 0.42, bodyRadius * 0.48, bodyRadius * 0.22, 0);
    } else {
      ellipse(ctx, 0, -bodyRadius * 0.72, bodyRadius * 0.42, bodyRadius * 0.3, 0);
    }
  }

  if (!profile.hasFace) return;
  const y = profile.hasHead ? -bodyRadius * 0.72 : -bodyRadius * 0.18;
  if (profile.faceType === "oneEye" || profile.faceType === "glowingFace") {
    ctx.fillStyle = "#ffffff";
    ellipse(ctx, 0, y, 7, 7, 0);
    ctx.fillStyle = profile.faceType === "glowingFace" ? "#7df1ff" : "#ff4ca3";
    ellipse(ctx, 0, y, 3.5, 3.5, 0);
  } else if (profile.faceType === "threeEyes") {
    ctx.fillStyle = "#ffffff";
    for (const x of [-9, 0, 9]) ellipse(ctx, x, y, 5, 5, 0);
    ctx.fillStyle = "#ffd84d";
    for (const x of [-9, 0, 9]) ellipse(ctx, x, y, 2, 2, 0);
  } else if (profile.faceType === "giantMouth") {
    ctx.fillStyle = "#24161c";
    ellipse(ctx, 0, y + 5, 12, 6, 0);
  } else if (profile.faceType === "maskFace") {
    ctx.fillStyle = "#f1ead6";
    roundRect(ctx, -12, y - 8, 24, 16, 5);
    ctx.fillStyle = "#191b24";
    circle(ctx, -5, y - 2, 3);
    circle(ctx, 5, y - 2, 3);
  }
}

function drawCreatureLabels(ctx, creature, profile, bodyRadius) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.58)";
  ctx.font = "11px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(profile.name, 0, -bodyRadius - 28);
  if (profile.isInvincible) {
    ctx.fillStyle = "#d9d4ff";
    ctx.fillText("nearly invincible", 0, -bodyRadius - 15);
  }
  healthBar(ctx, -bodyRadius, -bodyRadius - 22, bodyRadius * 2, 5, creature.hp / creature.maxHp, profile.isInvincible);
}

function healthBar(ctx, x, y, w, h, pct, invincible = false) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = invincible ? "#5a506f" : pct > 0.5 ? "#76e06f" : pct > 0.25 ? "#ffd45b" : "#ff5d57";
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, pct)), h);
}

function attackRangeFor(profile) {
  if (profile.attackStyle === "longArmSwipe") return 78;
  if (["rangedProjectile", "laserBeam", "poisonSpit", "fireBreath", "spikeShot"].includes(profile.attackStyle)) return 320;
  if (profile.attackStyle === "swoop") return 115;
  if (profile.attackStyle === "charge") return 150;
  return 42;
}

function attackCooldownFor(profile) {
  if (profile.attackStyle === "laserBeam") return 1.8;
  if (profile.attackStyle === "toxicGas" || profile.attackStyle === "sporeBurst") return 2.6;
  if (profile.attackStyle === "charge" || profile.attackStyle === "jumpSlam") return 1.7;
  if (profile.attackStyle === "swarmCall" || profile.attackStyle === "hiveSignal") return 2.2;
  return 1.05;
}

function legsForBody(bodyType, movementStyle) {
  if (["worm", "caterpillar", "slime", "floatingOrb"].includes(bodyType.id)) return "none";
  if (bodyType.id === "spider") return "many";
  if (movementStyle === "flying") return "tiny";
  return bodyType.id === "giantHeavy" ? "heavy" : "normal";
}

function buildLootTable(bodyType, biome, details, tier) {
  const resources = [...(biome.resources || [])];
  const drops = [];
  const addDrop = (itemId, chance = 0.35, min = 1, max = 2) => {
    if (!itemId) return;
    drops.push({ itemId, chance, min, max });
    resources.push(itemId);
  };

  for (const resource of biome.resources || []) addDrop(resource, 0.18, 1, 2);

  if (bodyType.id === "bat") {
    addDrop("Wing Scraps", 0.62, 1, 2);
    addDrop("Glow Spores", 0.36, 1, 2);
    addDrop("littleBird", 0.08, 1, 1);
  }
  if (bodyType.id === "caterpillar") {
    addDrop("Leaves", 0.58, 1, 3);
    addDrop("Silk", 0.45, 1, 2);
    addDrop("Poison Sac", 0.16, 1, 1);
  }
  if (bodyType.id === "crocodile") {
    addDrop("Scales", 0.55, 1, 2);
    addDrop("Teeth", 0.34, 1, 2);
    addDrop("Meat", 0.3, 1, 2);
    addDrop("Bone", 0.22, 1, 2);
  }
  if (bodyType.id === "crystal" || bodyType.id === "floatingOrb") {
    addDrop("Crystals", 0.6, 1, 3);
    addDrop("Glow Spores", 0.36, 1, 2);
    addDrop("gravityMarble", 0.06, 1, 1);
  }
  if (["boneBeast", "skull", "worm"].includes(bodyType.id)) {
    addDrop("Bone", 0.58, 1, 3);
    addDrop("Dry Wood", 0.22, 1, 2);
  }
  if (["slime", "frog", "plant"].includes(bodyType.id)) {
    addDrop("Slime", 0.45, 1, 2);
    addDrop("Leaves", 0.25, 1, 2);
  }
  if (bodyType.id === "bird") addDrop("Wing Scraps", 0.42, 1, 2);
  if (bodyType.id === "bird") addDrop("littleBird", 0.1, 1, 1);
  if (bodyType.id === "spider" || bodyType.id === "tinyBug") addDrop("Silk", 0.38, 1, 2);
  if (bodyType.id === "giantHeavy") addDrop("Metal Scraps", 0.2, 1, 2);

  if (details.some((detail) => detail.id === "poisonSacs")) addDrop("Poison Sac", 0.42, 1, 2);
  if (details.some((detail) => detail.id === "poisonSacs")) addDrop("toxicSlimeBomb", 0.08, 1, 1);
  if (details.some((detail) => detail.id === "glowingVeins")) addDrop("Glow Spores", 0.42, 1, 2);
  if (details.some((detail) => detail.id === "crystals")) addDrop("Crystals", 0.5, 1, 2);
  if (details.some((detail) => detail.id === "scales")) addDrop("Scales", 0.42, 1, 2);
  if (details.some((detail) => detail.id === "bones")) addDrop("Bone", 0.42, 1, 2);
  if (details.some((detail) => detail.id === "wings")) addDrop("Wing Scraps", 0.36, 1, 2);
  if (details.some((detail) => detail.id === "mushrooms")) addDrop("Mushroom Caps", 0.38, 1, 2);
  if (bodyType.attacks.includes("fireBreath")) addDrop("Fire Tooth Material", 0.18, 1, 1);

  return {
    resources: unique(resources),
    drops,
    knownDrops: unique(drops.map((drop) => drop.itemId)),
    min: tier.id === "tiny" ? 1 : 2,
    max: tier.id === "giant" || tier.id === "nearInvincible" ? 5 : 3,
    rareWeaponChance: bodyType.id === "boneBeast" || bodyType.id === "crystal" ? 0.08 : 0.03
  };
}

function makePalette(bodyType, biome, details, temperament, tier) {
  const base = bodyType.color || ["#7bd6ef", "#ffffff", "#1b2230"];
  let body = base[0];
  let accent = base[1];
  let dark = base[2];
  if (details.some((detail) => detail.id === "crystals")) accent = "#8af7ff";
  if (details.some((detail) => detail.id === "poisonSacs")) accent = "#9ef05c";
  if (details.some((detail) => detail.id === "bones")) accent = "#f0dfbd";
  if (temperament.friendly) dark = "#245c72";
  if (tier.id === "nearInvincible") {
    body = "#2a2634";
    accent = "#d9d4ff";
    dark = "#111018";
  }
  return {
    body,
    accent,
    detail: accent,
    dark,
    glow: biome.lighting?.glow || 1
  };
}

function nameCreatureProfile(bodyType, headType, faceType, details, temperament, tier) {
  const words = [];
  if (tier.id === "tiny") words.push("Tiny");
  if (tier.id === "giant") words.push("Giant");
  if (tier.id === "nearInvincible") words.push("Unbroken");
  if (temperament.id === "friendly") words.push("Gentle");
  if (temperament.id === "hive") words.push("Hive");
  const keyDetail = details.find((detail) => ["crystals", "mushrooms", "bones", "poisonSacs", "armorPlates"].includes(detail.id));
  if (keyDetail) words.push(keyDetail.label.replace(" Sacs", ""));
  if (faceType.id === "oneEye") words.push("One-Eyed");
  if (faceType.id === "threeEyes") words.push("Three-Eyed");
  if (headType.id === "skullHead") words.push("Skull");
  if (headType.id === "mushroomHead") words.push("Mushroom");
  words.push(bodyType.nameWord);
  return unique(words).join(" ");
}

function fallbackProfile(creature) {
  return {
    name: creature.name || "Creature",
    bodyType: creature.parts?.body?.id === "bugBody" ? "tinyBug" : "slime",
    bodyShape: "blob",
    headType: creature.parts?.head?.id || "oneHead",
    faceType: creature.parts?.eye?.id || "blankFace",
    hasFace: true,
    hasHead: true,
    arms: creature.parts?.arms ? "claws" : "none",
    armLength: creature.parts?.arms ? 1 : 0,
    movementStyle: creature.flying ? "flying" : "walking",
    attackStyle: creature.laser ? "laserBeam" : creature.spore ? "sporeBurst" : "bite",
    isFriendly: false,
    isTamed: false,
    isInvincible: false,
    canFly: creature.flying,
    specialTraits: [],
    bodyDetails: [],
    colorPalette: {
      body: creature.parts?.body?.color || "#7bd6ef",
      accent: creature.parts?.head?.color || "#ffd84d",
      detail: creature.parts?.movement?.color || "#ffffff",
      dark: "#1b2230"
    }
  };
}

function weightedPick(rng, entries, bias = {}) {
  const total = entries.reduce((sum, entry) => sum + entryWeight(entry, bias), 0);
  let roll = rng() * total;
  for (const entry of entries) {
    roll -= entryWeight(entry, bias);
    if (roll <= 0) return entry;
  }
  return entries[entries.length - 1];
}

function entryWeight(entry, bias = {}) {
  return Math.max(0, bias[entry.id] ?? entry.weight ?? 1);
}

function partWeight(part, bias = {}) {
  const multipliers = {
    blobBody: bias.blobBody,
    bugBody: bias.bugBody,
    skullHead: bias.skullHead,
    mushroomHead: bias.mushroomHead,
    oneEye: bias.oneEye,
    threeEyes: bias.threeEyes,
    claws: bias.claws,
    wings: bias.wings,
    threeFeet: bias.threeFeet,
    armorSkin: bias.armorSkin
  };
  return Math.max(0.05, multipliers[part.id] || 1);
}

function findById(entries, id) {
  return entries.find((entry) => entry.id === id) || entries[0];
}

function detailIds(details) {
  return details.map((detail) => detail.id);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function ellipse(ctx, x, y, rx, ry, rotation) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2);
  ctx.fill();
}

function blob(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, Math.sin(performance.now() / 300) * 0.12, 0, Math.PI * 2);
  ctx.fill();
}

function circle(ctx, x, y, radius) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function rect(ctx, x, y, w, h) {
  ctx.fillRect(x, y, w, h);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}
