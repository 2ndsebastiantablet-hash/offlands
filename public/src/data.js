export const RESOURCES = [
  "Wood",
  "Leaves",
  "Stone",
  "Mushroom Caps",
  "Slime",
  "Glow Spores",
  "Bone",
  "Sandstone",
  "Dry Wood"
];

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
    description: "Restore 25 health"
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
    marker: true
  }
];
