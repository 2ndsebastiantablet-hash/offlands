export const RESOURCES = [
  "Wood",
  "Leaves",
  "Stone",
  "Mushroom Caps",
  "Slime",
  "Glow Spores",
  "Bone",
  "Sandstone",
  "Dry Wood",
  "Ice Shards",
  "Crystals",
  "Ash",
  "Metal Scraps"
];

export const RESOURCE_COLORS = {
  Wood: "#8c5b31",
  Leaves: "#7ddb56",
  Stone: "#a3a7ad",
  "Mushroom Caps": "#e978e8",
  Slime: "#56e680",
  "Glow Spores": "#7deeff",
  Bone: "#efe1bd",
  Sandstone: "#d8bd7a",
  "Dry Wood": "#a66b3f",
  "Ice Shards": "#b9f4ff",
  Crystals: "#85b8ff",
  Ash: "#9c9a94",
  "Metal Scraps": "#b7c7d3"
};

export const WEAPONS = {
  stickSword: {
    id: "stickSword",
    name: "Stick Sword",
    type: "melee",
    damage: 14,
    cooldown: 360,
    range: 62,
    knockback: 90,
    color: "#f0cf7b",
    effect: "Basic short-range swing"
  },
  boneClub: {
    id: "boneClub",
    name: "Bone Club",
    type: "melee",
    damage: 28,
    cooldown: 660,
    range: 70,
    knockback: 210,
    color: "#ead7b0",
    effect: "Slow heavy knockback"
  },
  slimeGun: {
    id: "slimeGun",
    name: "Slime Gun",
    type: "ranged",
    damage: 9,
    cooldown: 300,
    range: 430,
    speed: 390,
    color: "#62e08b",
    effect: "Slows enemies on hit"
  },
  eyeWand: {
    id: "eyeWand",
    name: "Eye Wand",
    type: "ranged",
    damage: 18,
    cooldown: 420,
    range: 560,
    speed: 650,
    color: "#ff5ec4",
    effect: "Fast straight laser"
  },
  fireTooth: {
    id: "fireTooth",
    name: "Fire Tooth",
    type: "special",
    damage: 23,
    cooldown: 520,
    range: 105,
    knockback: 130,
    color: "#ff7438",
    effect: "Short flame bite with burn"
  }
};

export const ITEM_DEFS = {
  ...Object.fromEntries(
    RESOURCES.map((name) => [
      name,
      {
        id: name,
        name,
        type: "resource",
        stackable: true,
        maxStack: 99,
        color: RESOURCE_COLORS[name],
        description: "Crafting resource"
      }
    ])
  ),
  healingPack: {
    id: "healingPack",
    name: "Healing Fruit Pack",
    type: "consumable",
    stackable: true,
    maxStack: 9,
    color: "#ff6f89",
    description: "Restores 25 health"
  },
  campMarker: {
    id: "campMarker",
    name: "Camp Marker",
    type: "placeable",
    stackable: true,
    maxStack: 9,
    color: "#f4e35f",
    description: "Places a small map marker"
  },
  ...Object.fromEntries(
    Object.values(WEAPONS).map((weapon) => [
      weapon.id,
      {
        id: weapon.id,
        name: weapon.name,
        type: "weapon",
        stackable: false,
        maxStack: 1,
        color: weapon.color,
        description: weapon.effect
      }
    ])
  )
};

export const BIOME_PARTS = {
  terrainBase: [
    {
      id: "grassland",
      label: "Grassland",
      nameWord: "Green",
      noun: "Plains",
      legacyId: "wildlands",
      ground: "#55a94c",
      groundAlt: "#6cc75d",
      accent: "#f4dd68",
      props: ["tree", "bush", "flower", "rock", "hut", "tallGrass"],
      resources: ["Wood", "Leaves", "Stone"],
      lootWeapons: ["stickSword", "boneClub"],
      lootResources: ["Wood", "Leaves", "Stone"],
      plantDensity: 1.15,
      creatureDensity: 1,
      resourceDensity: 1,
      chestChance: 1,
      temperature: "mild",
      creatureBias: { bugBody: 1.2, threeEyes: 0.7 }
    },
    {
      id: "snowfield",
      label: "Snowfield",
      nameWord: "Frozen",
      noun: "Wasteland",
      legacyId: "wildlands",
      ground: "#c9e9ef",
      groundAlt: "#f1fbff",
      accent: "#7fcaf8",
      props: ["snowRock", "iceCrystal", "deadPlant"],
      resources: ["Ice Shards", "Stone"],
      lootWeapons: ["stickSword", "eyeWand"],
      lootResources: ["Ice Shards", "Stone"],
      plantDensity: 0.22,
      creatureDensity: 0.42,
      resourceDensity: 0.72,
      chestChance: 0.58,
      temperature: "freezing",
      movement: { playerSpeed: 0.9 },
      creatureBias: { armorSkin: 1.2 }
    },
    {
      id: "desert",
      label: "Desert",
      nameWord: "Dusty",
      noun: "Desert",
      legacyId: "desert",
      ground: "#cda65a",
      groundAlt: "#e1c071",
      accent: "#e56b43",
      props: ["deadBush", "crackedRock", "bone", "skull"],
      resources: ["Sandstone", "Dry Wood", "Bone"],
      lootWeapons: ["boneClub", "fireTooth"],
      lootResources: ["Sandstone", "Dry Wood", "Bone"],
      plantDensity: 0.48,
      creatureDensity: 0.9,
      resourceDensity: 0.92,
      chestChance: 0.85,
      temperature: "hot",
      creatureBias: { threeFeet: 1.35, skullHead: 1.2 }
    },
    {
      id: "mushroomSoil",
      label: "Mushroom Soil",
      nameWord: "Purple",
      noun: "Marsh",
      legacyId: "mushroom",
      ground: "#8250b8",
      groundAlt: "#9c5ed1",
      accent: "#52e0d2",
      props: ["mushroom", "spore", "slimePuddle", "strangePlant"],
      resources: ["Mushroom Caps", "Slime", "Glow Spores"],
      lootWeapons: ["slimeGun", "eyeWand"],
      lootResources: ["Mushroom Caps", "Slime", "Glow Spores"],
      hazards: ["slime"],
      plantDensity: 1.05,
      creatureDensity: 1.05,
      resourceDensity: 1.18,
      chestChance: 1,
      temperature: "humid",
      creatureBias: { mushroomHead: 1.55, oneEye: 1.25, blobBody: 1.2 }
    },
    {
      id: "swamp",
      label: "Swamp",
      nameWord: "Toxic",
      noun: "Swamp",
      legacyId: "mushroom",
      ground: "#3e7d62",
      groundAlt: "#624a8f",
      accent: "#9ef05c",
      props: ["bush", "strangePlant", "poisonVent", "deadPlant", "slimePuddle"],
      resources: ["Slime", "Leaves", "Mushroom Caps"],
      lootWeapons: ["slimeGun", "stickSword"],
      lootResources: ["Slime", "Leaves", "Mushroom Caps"],
      hazards: ["poisonGas", "slime"],
      plantDensity: 1.25,
      creatureDensity: 1.22,
      resourceDensity: 1.12,
      chestChance: 1.05,
      movement: { playerSpeed: 0.9 },
      temperature: "humid",
      creatureBias: { mushroomHead: 1.55, blobBody: 1.2, aggressive: 1.1 }
    },
    {
      id: "crystalGround",
      label: "Crystal Ground",
      nameWord: "Crystal",
      noun: "Valley",
      legacyId: "mushroom",
      ground: "#5160a8",
      groundAlt: "#7557c8",
      accent: "#8af7ff",
      props: ["crystalCluster", "iceCrystal", "spore", "rock"],
      resources: ["Crystals", "Glow Spores", "Stone"],
      lootWeapons: ["eyeWand", "slimeGun"],
      lootResources: ["Crystals", "Glow Spores", "Stone"],
      plantDensity: 0.72,
      creatureDensity: 0.95,
      resourceDensity: 1.34,
      chestChance: 1.1,
      projectile: { range: 1.16, glow: 1.35 },
      temperature: "cool",
      creatureBias: { oneEye: 1.8, threeEyes: 1.2, armorSkin: 1.1 }
    },
    {
      id: "boneField",
      label: "Bone Field",
      nameWord: "Dead Bone",
      noun: "Flatlands",
      legacyId: "desert",
      ground: "#b99a68",
      groundAlt: "#d1bd91",
      accent: "#f0dfbd",
      props: ["bone", "skull", "deadBush", "deadPlant", "crackedRock"],
      resources: ["Bone", "Dry Wood", "Sandstone"],
      lootWeapons: ["boneClub", "fireTooth"],
      lootResources: ["Bone", "Dry Wood", "Sandstone"],
      plantDensity: 0.28,
      creatureDensity: 1.18,
      resourceDensity: 1.04,
      chestChance: 0.9,
      temperature: "dry",
      creatureBias: { skullHead: 1.7, threeFeet: 1.35, aggressive: 1.3 }
    },
    {
      id: "ashland",
      label: "Ashland",
      nameWord: "Ashen",
      noun: "Ashland",
      legacyId: "desert",
      ground: "#5f5c58",
      groundAlt: "#77716b",
      accent: "#ff8b4c",
      props: ["ashPile", "burnedTree", "lavaCrack", "crackedRock"],
      resources: ["Ash", "Metal Scraps", "Stone"],
      lootWeapons: ["fireTooth", "boneClub"],
      lootResources: ["Ash", "Metal Scraps", "Stone"],
      hazards: ["lavaCrack"],
      plantDensity: 0.35,
      creatureDensity: 0.92,
      resourceDensity: 1.02,
      chestChance: 0.78,
      temperature: "scorched",
      creatureBias: { armorSkin: 1.25, skullHead: 1.2 }
    }
  ],
  climate: [
    {
      id: "calm",
      label: "Calm",
      nameWord: "",
      weather: "calm",
      windStrength: 0,
      plantDensity: 1,
      creatureDensity: 1,
      visibility: 1
    },
    {
      id: "highWind",
      label: "High Wind",
      nameWord: "Wind-Torn",
      weather: "high wind",
      windStrength: 34,
      plantDensity: 0.78,
      creatureDensity: 0.9,
      visibility: 0.96,
      movement: { playerWind: 1, projectileWind: 1 }
    },
    {
      id: "snowstorm",
      label: "Snowstorm",
      nameWord: "Stormy",
      weather: "snowstorm",
      windStrength: 22,
      plantDensity: 0.55,
      creatureDensity: 0.66,
      resourceDensity: 0.82,
      visibility: 0.74,
      movement: { playerSpeed: 0.88, projectileWind: 0.7 }
    },
    {
      id: "fog",
      label: "Fog",
      nameWord: "Foggy",
      weather: "fog",
      windStrength: 4,
      plantDensity: 0.96,
      creatureDensity: 1,
      visibility: 0.72
    },
    {
      id: "heatwave",
      label: "Heatwave",
      nameWord: "Sun-Baked",
      weather: "heatwave",
      windStrength: 8,
      plantDensity: 0.72,
      creatureDensity: 0.86,
      resourceDensity: 0.94,
      visibility: 0.88,
      movement: { playerSpeed: 0.94 }
    },
    {
      id: "glowingSpores",
      label: "Glowing Spores",
      nameWord: "Sporelit",
      weather: "glowing spores",
      windStrength: 7,
      plantDensity: 1.12,
      creatureDensity: 1.12,
      resourceDensity: 1.15,
      visibility: 0.9,
      creatureBias: { mushroomHead: 1.35, oneEye: 1.12 }
    },
    {
      id: "dustStorm",
      label: "Dust Storm",
      nameWord: "Dust-Blurred",
      weather: "dust storm",
      windStrength: 26,
      plantDensity: 0.58,
      creatureDensity: 0.86,
      visibility: 0.76,
      movement: { playerWind: 0.8, projectileWind: 0.9 }
    }
  ],
  gravity: [
    {
      id: "normalGravity",
      label: "Normal Gravity",
      nameWord: "",
      movementEffect: "normal",
      gravityLevel: 1,
      playerSpeed: 1,
      inertia: 0,
      projectileRange: 1,
      projectileSpeed: 1,
      knockback: 1
    },
    {
      id: "lowGravity",
      label: "Low Gravity",
      nameWord: "Floating",
      movementEffect: "low gravity drift",
      gravityLevel: 0.55,
      playerSpeed: 1,
      inertia: 0.82,
      projectileRange: 1.32,
      projectileSpeed: 1.08,
      knockback: 1.35,
      creatureBias: { wings: 1.5 }
    },
    {
      id: "heavyGravity",
      label: "Heavy Gravity",
      nameWord: "Heavy",
      movementEffect: "heavy gravity",
      gravityLevel: 1.65,
      playerSpeed: 0.86,
      inertia: 0.1,
      projectileRange: 0.78,
      projectileSpeed: 0.92,
      knockback: 0.72,
      creatureBias: { armorSkin: 1.4, wings: 0.45 }
    },
    {
      id: "zeroGravityDrift",
      label: "Zero Gravity Drift",
      nameWord: "Drifting",
      movementEffect: "zero gravity drift",
      gravityLevel: 0.08,
      playerSpeed: 0.94,
      inertia: 0.94,
      projectileRange: 1.55,
      projectileSpeed: 1.12,
      knockback: 1.65,
      creatureBias: { wings: 1.9, threeFeet: 0.55 }
    }
  ],
  lifeDensity: [
    {
      id: "empty",
      label: "Empty",
      nameWord: "Empty",
      plantDensity: 0.16,
      creatureDensity: 0.18,
      resourceDensity: 0.42,
      chestChance: 0.42,
      props: ["rock", "deadPlant"],
      creatureBias: { peaceful: 1.5 }
    },
    {
      id: "sparse",
      label: "Sparse",
      nameWord: "Sparse",
      plantDensity: 0.48,
      creatureDensity: 0.56,
      resourceDensity: 0.72,
      chestChance: 0.75
    },
    {
      id: "normal",
      label: "Normal",
      nameWord: "",
      plantDensity: 1,
      creatureDensity: 1,
      resourceDensity: 1,
      chestChance: 1
    },
    {
      id: "overgrown",
      label: "Overgrown",
      nameWord: "Overgrown",
      plantDensity: 1.72,
      creatureDensity: 1.05,
      resourceDensity: 1.18,
      chestChance: 1.02,
      props: ["tallGrass", "bush", "strangePlant"],
      creatureBias: { mushroomHead: 1.08 }
    },
    {
      id: "infested",
      label: "Infested",
      nameWord: "Infested",
      plantDensity: 1.1,
      creatureDensity: 1.92,
      resourceDensity: 1.05,
      chestChance: 1.24,
      creatureBias: { aggressive: 1.55, claws: 1.35, threeFeet: 1.2 }
    }
  ],
  hazardStyle: [
    { id: "none", label: "No Hazards", hazards: [] },
    { id: "slimePuddles", label: "Slime Puddles", hazards: ["slime"], creatureBias: { blobBody: 1.15 } },
    { id: "poisonGas", label: "Poison Gas", hazards: ["poisonGas"], creatureBias: { mushroomHead: 1.35 } },
    { id: "icePatches", label: "Ice Patches", hazards: ["ice"], movement: { inertia: 0.2 } },
    { id: "lavaCracks", label: "Lava Cracks", hazards: ["lavaCrack"], chestChance: 0.85 },
    { id: "spikeGrowths", label: "Spike Growths", hazards: ["spikes"], creatureBias: { claws: 1.2 } },
    { id: "windStreams", label: "Wind Streams", hazards: ["windStream"], movement: { playerWind: 1.35, projectileWind: 1.2 } }
  ],
  creatureBias: [
    { id: "peacefulSparse", label: "Peaceful/Sparse", creatureDensity: 0.55, creatureBias: { peaceful: 1.6 } },
    { id: "fastCreatures", label: "Fast Creatures", creatureBias: { threeFeet: 1.75, bugBody: 1.25 } },
    { id: "flyingCreatures", label: "Flying Creatures", creatureBias: { wings: 1.9 } },
    { id: "laserCreatures", label: "Laser Creatures", creatureBias: { oneEye: 2, threeEyes: 1.25 } },
    { id: "armoredCreatures", label: "Armored Creatures", creatureBias: { armorSkin: 1.85 } },
    { id: "sporeCreatures", label: "Spore Creatures", creatureBias: { mushroomHead: 1.9, blobBody: 1.15 } },
    { id: "aggressiveCreatures", label: "Aggressive Creatures", creatureBias: { aggressive: 1.75, skullHead: 1.35, claws: 1.25 } }
  ],
  resourceBias: [
    { id: "woodLeaves", label: "Wood/Leaves", resources: ["Wood", "Leaves", "Dry Wood"], lootResources: ["Wood", "Leaves"], resourceDensity: 1.08 },
    { id: "stoneCrystal", label: "Stone/Crystal", resources: ["Stone", "Crystals"], lootResources: ["Stone", "Crystals"], resourceDensity: 1.22 },
    { id: "slimeSpores", label: "Slime/Spores", resources: ["Slime", "Glow Spores", "Mushroom Caps"], lootResources: ["Slime", "Glow Spores"], resourceDensity: 1.2 },
    { id: "boneDryWood", label: "Bone/Dry Wood", resources: ["Bone", "Dry Wood", "Sandstone"], lootResources: ["Bone", "Dry Wood"], resourceDensity: 1.12 },
    { id: "iceShards", label: "Ice Shards", resources: ["Ice Shards", "Stone"], lootResources: ["Ice Shards"], resourceDensity: 0.98 },
    { id: "ash", label: "Ash", resources: ["Ash", "Metal Scraps", "Stone"], lootResources: ["Ash", "Metal Scraps"], resourceDensity: 1.04 },
    { id: "metalScraps", label: "Metal Scraps", resources: ["Metal Scraps", "Stone"], lootResources: ["Metal Scraps", "Stone"], resourceDensity: 0.82 }
  ],
  lightingMood: [
    { id: "bright", label: "Bright", tint: "rgba(8, 20, 17, 0.10)", lightColor: "rgba(255, 245, 190, 0.25)", glow: 0.9 },
    { id: "dreamy", label: "Dreamy", tint: "rgba(34, 19, 50, 0.20)", lightColor: "rgba(255, 203, 245, 0.25)", glow: 1.08 },
    { id: "dark", label: "Dark", tint: "rgba(7, 9, 18, 0.36)", lightColor: "rgba(180, 215, 255, 0.20)", glow: 1.1 },
    { id: "coldBlue", label: "Cold Blue", tint: "rgba(12, 35, 62, 0.28)", lightColor: "rgba(178, 230, 255, 0.26)", glow: 1.05 },
    { id: "warmDusty", label: "Warm Dusty", tint: "rgba(83, 49, 20, 0.21)", lightColor: "rgba(255, 207, 140, 0.23)", glow: 0.95 },
    { id: "neonGlow", label: "Neon Glow", tint: "rgba(23, 8, 42, 0.28)", lightColor: "rgba(121, 244, 255, 0.30)", glow: 1.4 },
    { id: "foggy", label: "Foggy", tint: "rgba(90, 96, 105, 0.22)", lightColor: "rgba(220, 235, 238, 0.19)", glow: 0.85 }
  ]
};

export const BIOMES = {
  wildlands: {
    id: "wildlands",
    name: "Green Wildlands",
    ground: "#55a94c",
    groundAlt: "#6cc75d",
    accent: "#f4dd68",
    props: ["tree", "bush", "flower", "rock", "hut"],
    resources: ["Wood", "Leaves", "Stone"],
    chestName: "Wildlands Chest",
    lootWeapons: ["stickSword", "boneClub"],
    lootResources: ["Wood", "Leaves", "Stone"],
    creatureTags: ["bug", "frog", "plant", "small"]
  },
  mushroom: {
    id: "mushroom",
    name: "Purple Mushroom Field",
    ground: "#8250b8",
    groundAlt: "#9c5ed1",
    accent: "#52e0d2",
    props: ["mushroom", "spore", "slimePuddle", "strangePlant"],
    resources: ["Mushroom Caps", "Slime", "Glow Spores"],
    chestName: "Mushroom Chest",
    lootWeapons: ["slimeGun", "eyeWand"],
    lootResources: ["Mushroom Caps", "Slime", "Glow Spores"],
    creatureTags: ["slime", "mushroom", "eye"]
  },
  desert: {
    id: "desert",
    name: "Bone Desert",
    ground: "#cda65a",
    groundAlt: "#e1c071",
    accent: "#e56b43",
    props: ["bone", "skull", "deadBush", "crackedRock"],
    resources: ["Bone", "Sandstone", "Dry Wood"],
    chestName: "Bone Chest",
    lootWeapons: ["boneClub", "fireTooth"],
    lootResources: ["Bone", "Sandstone", "Dry Wood"],
    creatureTags: ["skull", "fast", "fire"]
  }
};

export const CREATURE_PARTS = {
  body: [
    {
      id: "blobBody",
      label: "Blob Body",
      nameWord: "Blob",
      health: 34,
      speed: 54,
      damage: 7,
      color: "#7bd6ef"
    },
    {
      id: "bugBody",
      label: "Bug Body",
      nameWord: "Bug",
      health: 24,
      speed: 72,
      damage: 6,
      color: "#83dc70"
    }
  ],
  head: [
    {
      id: "skullHead",
      label: "Skull Head",
      nameWord: "Skull",
      health: 6,
      damage: 4,
      aggression: 1.25,
      color: "#f1ead6"
    },
    {
      id: "mushroomHead",
      label: "Mushroom Head",
      nameWord: "Mushroom",
      health: 5,
      damage: 1,
      spore: true,
      color: "#dc77e8"
    }
  ],
  eye: [
    {
      id: "oneEye",
      label: "One Eye",
      nameWord: "One-Eyed",
      laser: true,
      detect: 40,
      damage: 3,
      color: "#ff4ca3"
    },
    {
      id: "threeEyes",
      label: "Three Eyes",
      nameWord: "Three-Eyed",
      detect: 110,
      tracking: 1.3,
      color: "#ffd84d"
    }
  ],
  arms: [
    {
      id: "claws",
      label: "Claws",
      nameWord: "Clawed",
      melee: true,
      damage: 7,
      color: "#e64e3f"
    }
  ],
  movement: [
    {
      id: "wings",
      label: "Wings",
      nameWord: "Winged",
      flying: true,
      speed: 12,
      color: "#d8fbff"
    },
    {
      id: "threeFeet",
      label: "Three Feet",
      nameWord: "Three-Foot",
      speed: 28,
      color: "#ffca66"
    }
  ],
  skin: [
    {
      id: "armorSkin",
      label: "Armor Skin",
      nameWord: "Armored",
      health: 24,
      defense: 0.28,
      speed: -12,
      color: "#7c8494"
    }
  ]
};

export const RECIPES = [
  {
    id: "healingPack",
    name: "Healing Fruit Pack",
    costOptions: [{ Leaves: 2 }, { Wood: 2 }],
    description: "Restore 25 health",
    item: "healingPack",
    quantity: 1
  },
  {
    id: "boneClub",
    name: "Bone Club",
    cost: { Bone: 4, Wood: 2 },
    weapon: "boneClub"
  },
  {
    id: "slimeGun",
    name: "Slime Gun",
    cost: { Slime: 5, Stone: 2 },
    weapon: "slimeGun"
  },
  {
    id: "eyeWand",
    name: "Eye Wand",
    cost: { "Glow Spores": 3, Stone: 2, Slime: 1 },
    weapon: "eyeWand"
  },
  {
    id: "campMarker",
    name: "Camp Marker",
    cost: { Wood: 3, Stone: 2 },
    marker: true,
    item: "campMarker",
    quantity: 1
  }
];
