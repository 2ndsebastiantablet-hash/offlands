import { BIOMES, RECIPES, RESOURCES, WEAPONS } from "./data.js";
import { drawCreature } from "./creatures.js";
import { CHUNK_SIZE, World } from "./world.js";
import { MultiplayerClient } from "../frontend/multiplayer-client.js";
import { clamp, distance, normalize, seeded } from "./random.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const shell = document.getElementById("game-shell");
const mainMenu = document.getElementById("mainMenu");
const playButton = document.getElementById("playButton");
const healthText = document.getElementById("healthText");
const levelText = document.getElementById("levelText");
const weaponText = document.getElementById("weaponText");
const resourceText = document.getElementById("resourceText");
const statusText = document.getElementById("statusText");
const debugOverlay = document.getElementById("debugOverlay");
const craftingPanel = document.getElementById("craftingPanel");
const recipeList = document.getElementById("recipeList");
const multiplayerStatus = document.getElementById("multiplayerStatus");
const nameInput = document.getElementById("nameInput");
const codeInput = document.getElementById("codeInput");

const ENABLE_NOSTALGIC_FILTER = true;
const DEBUG_OVERLAY = true;
const STORAGE_NAME = "offlands_player_name";
const DEFAULT_SEED = new URLSearchParams(location.search).get("seed") || "offlands-shared-seed-001";
const apiBase = location.protocol === "file:" ? "http://127.0.0.1:3000" : location.origin;

const input = {
  keys: new Set(),
  mouse: { x: 0, y: 0, worldX: 0, worldY: 0, down: false },
  attackQueued: false,
  interactQueued: false
};

const state = {
  worldSeed: DEFAULT_SEED,
  world: new World(DEFAULT_SEED),
  camera: { x: 0, y: 0 },
  viewport: { width: 1024, height: 576 },
  started: false,
  debug: DEBUG_OVERLAY,
  lastTime: 0,
  playerName: loadPlayerName(),
  multiplayer: null,
  connected: false,
  snapshot: null,
  remotePlayers: new Map(),
  openedChests: new Set(),
  deadCreatures: new Set(),
  projectiles: [],
  enemyProjectiles: [],
  effects: [],
  floatingText: [],
  markers: [],
  attackSeq: 0,
  lastStatePush: 0,
  statusTimer: 0,
  player: {
    x: 320,
    y: 320,
    radius: 18,
    hp: 100,
    maxHp: 100,
    baseSpeed: 180,
    level: 1,
    xp: 0,
    xpNext: 50,
    damageBonus: 1,
    weaponIds: ["stickSword"],
    activeWeaponIndex: 0,
    inventory: Object.fromEntries(RESOURCES.map((name) => [name, 0])),
    cooldown: 0,
    hurtTimer: 0,
    respawnTimer: 0
  }
};

nameInput.value = state.playerName;
shell.classList.toggle("filter-enabled", ENABLE_NOSTALGIC_FILTER);
shell.classList.add("game-not-started");
shell.classList.toggle("debug-disabled", !state.debug);

function loadPlayerName() {
  const stored = localStorage.getItem(STORAGE_NAME);
  if (stored) return stored;
  const generated = `Wanderer ${Math.floor(100 + Math.random() * 900)}`;
  localStorage.setItem(STORAGE_NAME, generated);
  return generated;
}

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const box = shell.getBoundingClientRect();
  state.viewport.width = Math.round(box.width);
  state.viewport.height = Math.round(box.height);
  canvas.width = Math.floor(state.viewport.width * ratio);
  canvas.height = Math.floor(state.viewport.height * ratio);
  canvas.style.width = `${state.viewport.width}px`;
  canvas.style.height = `${state.viewport.height}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function screenToWorld(x, y) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: x - rect.left + state.camera.x - state.viewport.width / 2,
    y: y - rect.top + state.camera.y - state.viewport.height / 2
  };
}

function setStatus(message, seconds = 3) {
  statusText.textContent = message;
  state.statusTimer = seconds;
}

function startGame() {
  savePlayerName();
  state.started = true;
  mainMenu.classList.add("hidden");
  shell.classList.remove("game-not-started");
  setStatus(state.connected ? "Multiplayer active. Explore together." : "Solo expedition started.");
}

function returnToMenu() {
  state.started = false;
  input.mouse.down = false;
  mainMenu.classList.remove("hidden");
  craftingPanel.classList.add("hidden");
  shell.classList.add("game-not-started");
  updateMultiplayerStatus();
}

function activeWeapon() {
  return WEAPONS[state.player.weaponIds[state.player.activeWeaponIndex]] || WEAPONS.stickSword;
}

function currentBiome() {
  return state.world.getBiomeAt(state.player.x, state.player.y);
}

function switchWorldSeed(seed) {
  if (!seed || seed === state.worldSeed) return;
  state.worldSeed = seed;
  state.world = new World(seed);
  setStatus(`Joined shared world seed ${seed.slice(0, 18)}.`);
}

function playerStatePayload() {
  const aim = normalize(input.mouse.worldX - state.player.x, input.mouse.worldY - state.player.y);
  return {
    x: round(state.player.x),
    y: round(state.player.y),
    aimX: round(aim.x),
    aimY: round(aim.y),
    hp: Math.max(0, Math.round(state.player.hp)),
    maxHp: state.player.maxHp,
    weaponId: activeWeapon().id,
    level: state.player.level,
    attackSeq: state.attackSeq,
    worldSeed: state.worldSeed
  };
}

function playerMetaPayload() {
  return {
    color: "#6bd4ff",
    accent: "#ffdf6e"
  };
}

function ensureMultiplayer() {
  if (state.multiplayer) return state.multiplayer;
  state.multiplayer = new MultiplayerClient(apiBase, {
    storageKey: "offlands_survival_session",
    pingMs: 4000,
    onSnapshot(snapshot) {
      state.snapshot = snapshot;
      state.connected = true;
      ingestWorldState(snapshot.worldState);
      adoptSnapshotSeed(snapshot);
      updateRemotePlayers(snapshot);
      updateMultiplayerStatus();
    },
    onOpen() {
      state.connected = true;
      updateMultiplayerStatus("Connected to shared Offlands.");
    },
    onClose() {
      state.connected = false;
      updateMultiplayerStatus("Realtime disconnected. Solo play continues.");
    },
    onCustom(message) {
      handleWorldEvent(message.customType, message.payload || {});
    },
    onError(error) {
      updateMultiplayerStatus(error.message || "Multiplayer error.");
    }
  });
  return state.multiplayer;
}

function ingestWorldState(worldState) {
  for (const id of Object.keys(worldState?.openedChests || {})) state.openedChests.add(id);
  for (const id of Object.keys(worldState?.deadCreatures || {})) state.deadCreatures.add(id);
}

function adoptSnapshotSeed(snapshot) {
  const host = snapshot?.players?.find((player) => player.isHost) || snapshot?.players?.[0];
  const seed = host?.state?.worldSeed;
  if (seed) switchWorldSeed(seed);
}

function updateRemotePlayers(snapshot) {
  const next = new Map();
  for (const player of snapshot?.players || []) {
    if (player.isYou) continue;
    next.set(player.playerId, player);
  }
  state.remotePlayers = next;
}

function updateMultiplayerStatus(extra = null) {
  const snapshot = state.snapshot;
  if (!snapshot) {
    multiplayerStatus.textContent = extra || "Solo mode ready. Join a lobby before Play for multiplayer.";
    return;
  }
  const code = snapshot.code ? ` | code ${snapshot.code}` : "";
  multiplayerStatus.textContent = extra || `${snapshot.name}${code} | ${snapshot.playerCount}/${snapshot.maxPlayers} players`;
}

async function joinPublic() {
  try {
    savePlayerName();
    const client = ensureMultiplayer();
    updateMultiplayerStatus("Finding public Offlands lobby...");
    const lobbies = await client.listPublicLobbies();
    const lobby = lobbies.find((entry) => entry.name.includes("Offlands") && entry.playerCount < entry.maxPlayers);
    const options = {
      playerName: state.playerName,
      playerState: playerStatePayload(),
      playerMeta: playerMetaPayload(),
      maxPlayers: 12
    };
    if (lobby) {
      await client.joinLobbyById({ ...options, lobbyId: lobby.lobbyId });
      setStatus("Joined public multiplayer.");
    } else {
      await client.createLobby({
        ...options,
        lobbyName: "Offlands Public",
        privateLobby: false
      });
      setStatus("Created public multiplayer world.");
    }
  } catch (error) {
    updateMultiplayerStatus(error.message || "Could not join public lobby.");
  }
}

async function createPrivate() {
  try {
    savePlayerName();
    const client = ensureMultiplayer();
    await client.createLobby({
      lobbyName: "Offlands Private",
      privateLobby: true,
      maxPlayers: 12,
      playerName: state.playerName,
      playerState: playerStatePayload(),
      playerMeta: playerMetaPayload()
    });
    setStatus("Private lobby created. Share the code.");
  } catch (error) {
    updateMultiplayerStatus(error.message || "Could not create private lobby.");
  }
}

async function joinCode() {
  try {
    savePlayerName();
    const code = codeInput.value.trim().toUpperCase();
    if (code.length < 4) {
      updateMultiplayerStatus("Enter a private code first.");
      return;
    }
    const client = ensureMultiplayer();
    await client.joinLobbyByCode({
      code,
      playerName: state.playerName,
      playerState: playerStatePayload(),
      playerMeta: playerMetaPayload()
    });
    setStatus("Joined private multiplayer.");
  } catch (error) {
    updateMultiplayerStatus(error.message || "Could not join code.");
  }
}

async function leaveMultiplayer() {
  try {
    await state.multiplayer?.leave();
  } catch {}
  state.connected = false;
  state.snapshot = null;
  state.remotePlayers.clear();
  updateMultiplayerStatus("Left multiplayer. Solo play continues.");
}

function savePlayerName() {
  state.playerName = nameInput.value.trim().slice(0, 18) || state.playerName;
  localStorage.setItem(STORAGE_NAME, state.playerName);
}

function sendWorldEvent(customType, payload) {
  handleWorldEvent(customType, payload);
  state.multiplayer?.sendCustom(customType, payload);
}

function handleWorldEvent(customType, payload) {
  if (customType === "chest_opened" && payload.chestId) {
    state.openedChests.add(payload.chestId);
  }
  if (customType === "creature_killed" && payload.creatureId) {
    state.deadCreatures.add(payload.creatureId);
  }
}

function update(dt, now) {
  const player = state.player;
  if (!state.started) {
    updateCamera(dt);
    updateHud();
    return;
  }

  if (state.statusTimer > 0) {
    state.statusTimer -= dt;
    if (state.statusTimer <= 0) statusText.textContent = "Explore, fight, loot, craft, and level up.";
  }

  input.mouse.worldX = screenToWorld(input.mouse.x, input.mouse.y).x;
  input.mouse.worldY = screenToWorld(input.mouse.x, input.mouse.y).y;

  if (player.respawnTimer > 0) {
    player.respawnTimer -= dt;
    if (player.respawnTimer <= 0) respawnPlayer();
  } else {
    movePlayer(dt);
    if (input.attackQueued || input.mouse.down) attack(now);
    if (input.interactQueued) interact();
  }
  input.attackQueued = false;
  input.interactQueued = false;

  player.cooldown = Math.max(0, player.cooldown - dt * 1000);
  player.hurtTimer = Math.max(0, player.hurtTimer - dt);

  const chunks = state.world.nearbyChunks(player.x, player.y, 2);
  for (const chunk of chunks) updateCreatures(chunk, dt);
  updateProjectiles(dt);
  updateEffects(dt);
  updateCamera(dt);
  maybePushMultiplayer(now);
  updateHud();
}

function movePlayer(dt) {
  const player = state.player;
  let x = 0;
  let y = 0;
  if (input.keys.has("KeyA") || input.keys.has("ArrowLeft")) x -= 1;
  if (input.keys.has("KeyD") || input.keys.has("ArrowRight")) x += 1;
  if (input.keys.has("KeyW") || input.keys.has("ArrowUp")) y -= 1;
  if (input.keys.has("KeyS") || input.keys.has("ArrowDown")) y += 1;
  const dir = normalize(x, y);
  const speedMod = playerInSlime() ? 0.65 : 1;
  if (x || y) {
    player.x += dir.x * player.baseSpeed * speedMod * dt;
    player.y += dir.y * player.baseSpeed * speedMod * dt;
  }
}

function playerInSlime() {
  for (const chunk of state.world.nearbyChunks(state.player.x, state.player.y, 1)) {
    for (const hazard of chunk.hazards) {
      if (distance(state.player, hazard) < hazard.radius) return true;
    }
  }
  return false;
}

function attack(now) {
  const player = state.player;
  const weapon = activeWeapon();
  if (player.cooldown > 0) return;
  player.cooldown = weapon.cooldown;
  state.attackSeq += 1;
  const aim = normalize(input.mouse.worldX - player.x, input.mouse.worldY - player.y);
  state.effects.push({ type: "swing", x: player.x, y: player.y, aim, weapon, life: 0.16, maxLife: 0.16 });

  if (weapon.type === "ranged") {
    state.projectiles.push({
      x: player.x + aim.x * 24,
      y: player.y + aim.y * 24,
      vx: aim.x * weapon.speed,
      vy: aim.y * weapon.speed,
      damage: scaledDamage(weapon.damage),
      traveled: 0,
      range: weapon.range,
      radius: weapon.id === "slimeGun" ? 9 : 5,
      color: weapon.color,
      effect: weapon.id
    });
  } else {
    meleeHit(weapon, aim);
  }
  if (state.connected) state.multiplayer?.pushState(playerStatePayload(), playerMetaPayload());
}

function meleeHit(weapon, aim) {
  const player = state.player;
  for (const creature of nearbyCreatures()) {
    if (state.deadCreatures.has(creature.id) || creature.dead) continue;
    const dx = creature.x - player.x;
    const dy = creature.y - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist > weapon.range + 22) continue;
    const dot = (dx / (dist || 1)) * aim.x + (dy / (dist || 1)) * aim.y;
    if (dot < 0.25) continue;
    damageCreature(creature, scaledDamage(weapon.damage), weapon, aim);
  }
}

function scaledDamage(amount) {
  return Math.round(amount * state.player.damageBonus);
}

function damageCreature(creature, amount, weapon, dir) {
  const finalDamage = Math.max(1, Math.round(amount * (1 - creature.defense)));
  creature.hp -= finalDamage;
  creature.hurtTimer = 0.18;
  creature.x += dir.x * (weapon.knockback || 55) * 0.045;
  creature.y += dir.y * (weapon.knockback || 55) * 0.045;
  if (weapon.id === "slimeGun") creature.slowTimer = 2.2;
  if (weapon.id === "fireTooth") creature.burnTimer = 3;
  addFloatingText(`-${finalDamage}`, creature.x, creature.y - 24, "#fff1a8");
  if (creature.hp <= 0) killCreature(creature);
}

function killCreature(creature) {
  if (state.deadCreatures.has(creature.id)) return;
  creature.dead = true;
  state.deadCreatures.add(creature.id);
  const biome = BIOMES[creature.biomeId];
  const rng = seeded(`${state.worldSeed}:drop:${creature.id}`);
  const resource = biome.resources[Math.floor(rng() * biome.resources.length)];
  addResource(resource, 1 + Math.floor(rng() * 2));
  gainXp(creature.xp);
  addFloatingText(`+${creature.xp} XP`, creature.x, creature.y - 42, "#a7ff8b");
  sendWorldEvent("creature_killed", { creatureId: creature.id });
}

function nearbyCreatures() {
  return state.world.nearbyChunks(state.player.x, state.player.y, 2).flatMap((chunk) => chunk.creatures);
}

function updateCreatures(chunk, dt) {
  for (const creature of chunk.creatures) {
    if (state.deadCreatures.has(creature.id)) {
      creature.dead = true;
      continue;
    }
    if (creature.dead) continue;
    creature.hurtTimer = Math.max(0, creature.hurtTimer - dt);
    creature.slowTimer = Math.max(0, creature.slowTimer - dt);
    if (creature.burnTimer > 0) {
      creature.burnTimer -= dt;
      creature.hp -= 4 * dt;
      if (creature.hp <= 0) killCreature(creature);
    }

    const toPlayer = { x: state.player.x - creature.x, y: state.player.y - creature.y };
    const playerDist = Math.hypot(toPlayer.x, toPlayer.y);
    const speed = creature.speed * (creature.slowTimer > 0 ? 0.48 : 1);
    let move = { x: 0, y: 0 };

    if (playerDist < creature.detection && state.player.respawnTimer <= 0) {
      move = normalize(toPlayer.x, toPlayer.y);
    } else {
      creature.wanderTimer -= dt;
      if (creature.wanderTimer <= 0) {
        creature.wanderTimer = 1 + Math.random() * 2;
        creature.wanderAngle += -1.2 + Math.random() * 2.4;
      }
      move = { x: Math.cos(creature.wanderAngle), y: Math.sin(creature.wanderAngle) };
    }

    creature.x += move.x * speed * dt;
    creature.y += move.y * speed * dt;
    creature.x = clamp(creature.x, chunk.x + 28, chunk.x + CHUNK_SIZE - 28);
    creature.y = clamp(creature.y, chunk.y + 28, chunk.y + CHUNK_SIZE - 28);

    creature.attackTimer -= dt;
    if (playerDist < 38 && creature.attackTimer <= 0) {
      creature.attackTimer = Math.max(0.45, 1.05 / creature.aggression);
      hurtPlayer(creature.damage, normalize(toPlayer.x, toPlayer.y));
    }

    if (creature.laser) {
      creature.laserTimer -= dt * 1000;
      if (playerDist < creature.detection + 80 && creature.laserTimer <= 0) {
        creature.laserTimer = 1500 + Math.random() * 1400;
        const dir = normalize(toPlayer.x, toPlayer.y);
        state.enemyProjectiles.push({
          x: creature.x,
          y: creature.y,
          vx: dir.x * 360,
          vy: dir.y * 360,
          damage: creature.damage + 5,
          traveled: 0,
          range: 520,
          radius: 5,
          color: "#ff4ca3"
        });
      }
    }

    if (creature.spore) {
      creature.sporeTimer -= dt * 1000;
      if (playerDist < 90 && creature.sporeTimer <= 0) {
        creature.sporeTimer = 2600 + Math.random() * 1700;
        state.effects.push({ type: "spore", x: creature.x, y: creature.y, radius: 76, life: 1.5, maxLife: 1.5 });
        if (playerDist < 76) hurtPlayer(4, normalize(toPlayer.x, toPlayer.y));
      }
    }
  }
}

function updateProjectiles(dt) {
  updateProjectileList(state.projectiles, dt, true);
  updateProjectileList(state.enemyProjectiles, dt, false);
}

function updateProjectileList(list, dt, fromPlayer) {
  for (let index = list.length - 1; index >= 0; index -= 1) {
    const projectile = list[index];
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;
    const step = Math.hypot(projectile.vx * dt, projectile.vy * dt);
    projectile.traveled += step;
    let remove = projectile.traveled >= projectile.range;

    if (fromPlayer) {
      for (const creature of nearbyCreatures()) {
        if (creature.dead || state.deadCreatures.has(creature.id)) continue;
        if (distance(projectile, creature) < projectile.radius + 20) {
          damageCreature(creature, projectile.damage, WEAPONS[projectile.effect] || WEAPONS.eyeWand, normalize(projectile.vx, projectile.vy));
          remove = true;
          break;
        }
      }
    } else if (distance(projectile, state.player) < projectile.radius + state.player.radius) {
      hurtPlayer(projectile.damage, normalize(projectile.vx, projectile.vy));
      remove = true;
    }

    if (remove) list.splice(index, 1);
  }
}

function hurtPlayer(amount, dir) {
  const player = state.player;
  if (player.respawnTimer > 0) return;
  player.hp -= amount;
  player.hurtTimer = 0.25;
  player.x += dir.x * 12;
  player.y += dir.y * 12;
  addFloatingText(`-${Math.round(amount)}`, player.x, player.y - 30, "#ffb0a8");
  if (player.hp <= 0) {
    player.hp = 0;
    player.respawnTimer = 2.2;
    setStatus("You dissolved. Respawning at camp...");
  }
}

function respawnPlayer() {
  state.player.x = 320;
  state.player.y = 320;
  state.player.hp = state.player.maxHp;
  state.enemyProjectiles.length = 0;
  setStatus("Respawned at the starting camp.");
}

function interact() {
  for (const chunk of state.world.nearbyChunks(state.player.x, state.player.y, 1)) {
    for (const resource of chunk.resources) {
      if (resource.collected || distance(resource, state.player) > 44) continue;
      resource.collected = true;
      addResource(resource.type, resource.amount);
      addFloatingText(`+${resource.amount} ${resource.type}`, resource.x, resource.y - 20, "#def7c4");
      return;
    }

    for (const chest of chunk.chests) {
      if (state.openedChests.has(chest.id) || distance(chest, state.player) > 58) continue;
      openChest(chest);
      return;
    }
  }
  setStatus("Nothing close enough to interact with.", 1.4);
}

function openChest(chest) {
  state.openedChests.add(chest.id);
  const loot = rollChestLoot(chest);
  for (const [resource, amount] of Object.entries(loot.resources)) addResource(resource, amount);
  if (loot.weaponId) addWeapon(loot.weaponId);
  gainXp(loot.xp);
  setStatus(`${BIOMES[chest.biomeId].chestName} opened: ${loot.summary}`);
  sendWorldEvent("chest_opened", { chestId: chest.id });
}

function rollChestLoot(chest) {
  const biome = BIOMES[chest.biomeId];
  const rng = seeded(`${state.worldSeed}:loot:${chest.id}`);
  const resources = {};
  const rolls = 2 + Math.floor(rng() * 3);
  for (let index = 0; index < rolls; index += 1) {
    const resource = biome.lootResources[Math.floor(rng() * biome.lootResources.length)];
    resources[resource] = (resources[resource] || 0) + 1 + Math.floor(rng() * 3);
  }
  const weaponId = rng() < 0.42 ? biome.lootWeapons[Math.floor(rng() * biome.lootWeapons.length)] : null;
  const xp = 10 + Math.floor(rng() * 16);
  const summary = [
    ...Object.entries(resources).map(([name, amount]) => `${amount} ${name}`),
    weaponId ? WEAPONS[weaponId].name : null,
    `${xp} XP`
  ].filter(Boolean).join(", ");
  return { resources, weaponId, xp, summary };
}

function addResource(resource, amount) {
  state.player.inventory[resource] = (state.player.inventory[resource] || 0) + amount;
}

function addWeapon(weaponId) {
  if (!WEAPONS[weaponId]) return;
  if (!state.player.weaponIds.includes(weaponId)) {
    state.player.weaponIds.push(weaponId);
    setStatus(`Found ${WEAPONS[weaponId].name}.`);
  }
}

function gainXp(amount) {
  const player = state.player;
  player.xp += amount;
  while (player.xp >= player.xpNext) {
    player.xp -= player.xpNext;
    player.level += 1;
    player.xpNext = Math.round(player.xpNext * 1.35 + 18);
    player.maxHp += 10;
    player.hp = player.maxHp;
    player.damageBonus = 1 + (player.level - 1) * 0.05;
    setStatus(`Level ${player.level}! Max health and damage increased.`);
  }
}

function craft(recipe) {
  const cost = chooseRecipeCost(recipe);
  if (!cost) {
    setStatus("Not enough resources.");
    return;
  }
  for (const [resource, amount] of Object.entries(cost)) {
    state.player.inventory[resource] -= amount;
  }
  if (recipe.id === "healingPack") {
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + 25);
    setStatus("Crafted Healing Fruit Pack.");
  } else if (recipe.weapon) {
    addWeapon(recipe.weapon);
    setStatus(`Crafted ${WEAPONS[recipe.weapon].name}.`);
  } else if (recipe.marker) {
    state.markers.push({ x: state.player.x, y: state.player.y });
    setStatus("Placed a Camp Marker.");
  }
}

function chooseRecipeCost(recipe) {
  if (recipe.cost) return canPay(recipe.cost) ? recipe.cost : null;
  return recipe.costOptions.find(canPay) || null;
}

function canPay(cost) {
  return Object.entries(cost).every(([resource, amount]) => (state.player.inventory[resource] || 0) >= amount);
}

function updateCamera(dt) {
  const ease = 1 - Math.pow(0.001, dt);
  state.camera.x += (state.player.x - state.camera.x) * ease;
  state.camera.y += (state.player.y - state.camera.y) * ease;
}

function maybePushMultiplayer(now) {
  if (!state.connected || !state.multiplayer?.snapshot || now - state.lastStatePush < 80) return;
  state.multiplayer.pushState(playerStatePayload(), playerMetaPayload());
  state.lastStatePush = now;
}

function updateEffects(dt) {
  for (const list of [state.effects, state.floatingText]) {
    for (let index = list.length - 1; index >= 0; index -= 1) {
      list[index].life -= dt;
      if (list[index].vy) list[index].y += list[index].vy * dt;
      if (list[index].life <= 0) list.splice(index, 1);
    }
  }
}

function addFloatingText(text, x, y, color) {
  state.floatingText.push({ text, x, y, color, life: 1, maxLife: 1, vy: -18 });
}

function draw() {
  ctx.clearRect(0, 0, state.viewport.width, state.viewport.height);
  ctx.save();
  ctx.translate(state.viewport.width / 2 - state.camera.x, state.viewport.height / 2 - state.camera.y);
  drawWorld();
  drawMarkers();
  drawRemotePlayers();
  drawPlayer();
  drawProjectiles();
  drawEffects();
  drawFloatingText();
  drawLighting();
  ctx.restore();
}

function drawWorld() {
  const chunks = state.world.nearbyChunks(state.player.x, state.player.y, 3);
  for (const chunk of chunks) drawChunkGround(chunk);
  for (const chunk of chunks) {
    for (const hazard of chunk.hazards) drawHazard(hazard);
    for (const prop of chunk.props) drawProp(prop, chunk.biomeId);
    for (const resource of chunk.resources) drawResource(resource);
    for (const chest of chunk.chests) drawChest(chest);
  }
  for (const chunk of chunks) {
    for (const creature of chunk.creatures) {
      if (creature.dead || state.deadCreatures.has(creature.id)) continue;
      drawCreature(ctx, creature, creature.x, creature.y);
    }
  }
}

function drawChunkGround(chunk) {
  const biome = BIOMES[chunk.biomeId];
  ctx.fillStyle = biome.ground;
  ctx.fillRect(chunk.x, chunk.y, CHUNK_SIZE, CHUNK_SIZE);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 2;
  ctx.strokeRect(chunk.x, chunk.y, CHUNK_SIZE, CHUNK_SIZE);

  const rng = seeded(`${state.worldSeed}:ground:${chunk.cx}:${chunk.cy}`);
  for (let index = 0; index < 18; index += 1) {
    ctx.fillStyle = index % 2 ? biome.groundAlt : "rgba(255, 255, 255, 0.08)";
    ctx.globalAlpha = 0.18 + rng() * 0.12;
    const x = chunk.x + rng() * CHUNK_SIZE;
    const y = chunk.y + rng() * CHUNK_SIZE;
    ctx.beginPath();
    ctx.ellipse(x, y, 24 + rng() * 70, 10 + rng() * 30, rng() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawProp(prop, biomeId) {
  const biome = BIOMES[biomeId];
  ctx.save();
  ctx.translate(prop.x, prop.y);
  if (prop.allowRotation) ctx.rotate(prop.spin);
  ctx.scale(prop.size * (prop.flip || 1), prop.size);
  if (prop.type === "tree") {
    ctx.fillStyle = "#6e4c2e";
    ctx.fillRect(-5, -2, 10, 22);
    ctx.fillStyle = "#2e7d46";
    circle(0, -10, 20);
  } else if (prop.type === "bush" || prop.type === "strangePlant") {
    ctx.fillStyle = prop.type === "bush" ? "#377d39" : "#35b7a8";
    circle(-7, 0, 11);
    circle(7, 1, 10);
    circle(0, -8, 10);
  } else if (prop.type === "flower" || prop.type === "spore") {
    ctx.fillStyle = biome.accent;
    for (let i = 0; i < 5; i += 1) {
      ctx.rotate((Math.PI * 2) / 5);
      ctx.fillRect(4, -2, 10, 4);
    }
    circle(0, 0, 4);
  } else if (prop.type === "mushroom") {
    ctx.fillStyle = "#d7e9ff";
    ctx.fillRect(-5, -2, 10, 18);
    ctx.fillStyle = "#ff72d2";
    ctx.beginPath();
    ctx.ellipse(0, -6, 22, 12, 0, Math.PI, 0);
    ctx.fill();
  } else if (prop.type === "slimePuddle") {
    ctx.fillStyle = "rgba(71, 232, 139, 0.45)";
    ctx.beginPath();
    ctx.ellipse(0, 0, 25, 12, 0.25, 0, Math.PI * 2);
    ctx.fill();
  } else if (prop.type === "bone") {
    ctx.fillStyle = "#f1e4ca";
    ctx.fillRect(-22, -4, 44, 8);
    circle(-24, -4, 7);
    circle(-24, 4, 7);
    circle(24, -4, 7);
    circle(24, 4, 7);
  } else if (prop.type === "skull") {
    ctx.fillStyle = "#eee0c2";
    circle(0, 0, 16);
    ctx.fillStyle = "#2d2731";
    circle(-6, -3, 4);
    circle(6, -3, 4);
  } else if (prop.type === "deadBush") {
    ctx.strokeStyle = "#69513b";
    ctx.lineWidth = 3;
    for (let i = 0; i < 5; i += 1) {
      line(0, 10, Math.cos(i * 1.25) * 18, Math.sin(i * 1.25) * 14);
    }
  } else if (prop.type === "hut") {
    ctx.fillStyle = "#d7a34f";
    ctx.fillRect(-18, -4, 36, 28);
    ctx.fillStyle = "#7d3f31";
    ctx.beginPath();
    ctx.moveTo(-24, -4);
    ctx.lineTo(0, -28);
    ctx.lineTo(24, -4);
    ctx.fill();
    ctx.fillStyle = "#3d2b22";
    ctx.fillRect(-5, 9, 10, 15);
  } else {
    ctx.fillStyle = biome.accent;
    ctx.fillRect(-13, -10, 26, 20);
  }
  ctx.restore();
}

function drawHazard(hazard) {
  ctx.fillStyle = "rgba(42, 230, 122, 0.28)";
  ctx.beginPath();
  ctx.ellipse(hazard.x, hazard.y, hazard.radius * 1.25, hazard.radius * 0.7, 0.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawResource(resource) {
  if (resource.collected) return;
  const colors = {
    Wood: "#8c5b31",
    Leaves: "#7ddb56",
    Stone: "#a3a7ad",
    "Mushroom Caps": "#e978e8",
    Slime: "#56e680",
    "Glow Spores": "#7deeff",
    Bone: "#efe1bd",
    Sandstone: "#d8bd7a",
    "Dry Wood": "#a66b3f"
  };
  ctx.fillStyle = colors[resource.type] || "#ffffff";
  circle(resource.x, resource.y, 8);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
  ctx.stroke();
}

function drawChest(chest) {
  const opened = state.openedChests.has(chest.id);
  ctx.save();
  ctx.translate(chest.x, chest.y);
  ctx.fillStyle = opened ? "#75685b" : "#a05b2a";
  ctx.fillRect(-18, -13, 36, 26);
  ctx.fillStyle = opened ? "#3a312c" : BIOMES[chest.biomeId].accent;
  ctx.fillRect(-18, -13, 36, 7);
  ctx.fillStyle = "#2a1b15";
  ctx.fillRect(-4, -2, 8, 9);
  ctx.restore();
}

function drawMarkers() {
  for (const marker of state.markers) {
    ctx.fillStyle = "#f4e35f";
    ctx.beginPath();
    ctx.moveTo(marker.x, marker.y - 30);
    ctx.lineTo(marker.x + 12, marker.y - 5);
    ctx.lineTo(marker.x, marker.y);
    ctx.fill();
    ctx.strokeStyle = "#503c1a";
    line(marker.x, marker.y - 30, marker.x, marker.y + 18);
  }
}

function drawRemotePlayers() {
  for (const player of state.remotePlayers.values()) {
    const p = player.state || {};
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = player.meta?.color || "#9fd7ff";
    circle(0, 0, 16);
    ctx.fillStyle = player.meta?.accent || "#ffdf6e";
    circle((p.aimX || 1) * 14, (p.aimY || 0) * 14, 5);
    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${player.name} L${p.level || 1}`, 0, -25);
    ctx.restore();
  }
}

function drawPlayer() {
  const player = state.player;
  const aim = normalize(input.mouse.worldX - player.x, input.mouse.worldY - player.y);
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.globalAlpha = player.respawnTimer > 0 ? 0.45 : 1;
  ctx.fillStyle = player.hurtTimer > 0 ? "#ffaaa3" : "#69d2ff";
  circle(0, 0, player.radius);
  ctx.fillStyle = "#ffdf6e";
  circle(aim.x * 16, aim.y * 16, 6);
  ctx.strokeStyle = activeWeapon().color;
  ctx.lineWidth = 5;
  line(aim.x * 12, aim.y * 12, aim.x * 32, aim.y * 32);
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(state.playerName, 0, -30);
  ctx.restore();
}

function drawProjectiles() {
  for (const projectile of [...state.projectiles, ...state.enemyProjectiles]) {
    ctx.fillStyle = projectile.color;
    circle(projectile.x, projectile.y, projectile.radius);
  }
}

function drawEffects() {
  for (const effect of state.effects) {
    const pct = effect.life / effect.maxLife;
    if (effect.type === "swing") {
      ctx.save();
      ctx.translate(effect.x, effect.y);
      ctx.rotate(Math.atan2(effect.aim.y, effect.aim.x));
      ctx.strokeStyle = effect.weapon.color;
      ctx.globalAlpha = pct;
      ctx.lineWidth = effect.weapon.id === "boneClub" ? 16 : 9;
      ctx.beginPath();
      ctx.arc(0, 0, effect.weapon.range, -0.45, 0.45);
      ctx.stroke();
      ctx.restore();
    }
    if (effect.type === "spore") {
      ctx.fillStyle = `rgba(160, 91, 218, ${0.22 * pct})`;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.radius * (1.2 - pct * 0.2), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawFloatingText() {
  ctx.font = "13px sans-serif";
  ctx.textAlign = "center";
  for (const item of state.floatingText) {
    ctx.globalAlpha = Math.max(0, item.life / item.maxLife);
    ctx.fillStyle = item.color;
    ctx.fillText(item.text, item.x, item.y);
  }
  ctx.globalAlpha = 1;
}

function drawLighting() {
  const biome = currentBiome();
  const visible = {
    x: state.camera.x - state.viewport.width / 2,
    y: state.camera.y - state.viewport.height / 2,
    w: state.viewport.width,
    h: state.viewport.height
  };
  const tint = biome.id === "mushroom"
    ? "rgba(26, 12, 46, 0.30)"
    : biome.id === "desert"
      ? "rgba(83, 49, 20, 0.18)"
      : "rgba(12, 28, 23, 0.14)";

  ctx.save();
  ctx.fillStyle = tint;
  ctx.fillRect(visible.x, visible.y, visible.w, visible.h);
  ctx.globalCompositeOperation = "lighter";
  addLight(state.player.x, state.player.y, 190, "rgba(255, 238, 176, 0.28)");

  for (const chunk of state.world.nearbyChunks(state.player.x, state.player.y, 2)) {
    for (const prop of chunk.props) {
      if (prop.type === "mushroom") addLight(prop.x, prop.y, 86, "rgba(255, 105, 216, 0.18)");
      if (prop.type === "spore") addLight(prop.x, prop.y, 70, "rgba(102, 239, 239, 0.18)");
      if (prop.type === "slimePuddle") addLight(prop.x, prop.y, 74, "rgba(84, 232, 128, 0.14)");
      if (prop.type === "flower") addLight(prop.x, prop.y, 42, "rgba(255, 228, 91, 0.11)");
    }
    for (const hazard of chunk.hazards) {
      addLight(hazard.x, hazard.y, hazard.radius * 2.2, "rgba(92, 239, 132, 0.13)");
    }
  }

  for (const projectile of [...state.projectiles, ...state.enemyProjectiles]) {
    addLight(projectile.x, projectile.y, projectile.effect === "fireTooth" ? 115 : 72, projectile.color + "88");
  }
  for (const effect of state.effects) {
    if (effect.type === "spore") addLight(effect.x, effect.y, effect.radius * 1.45, "rgba(184, 91, 226, 0.16)");
    if (effect.weapon?.id === "fireTooth") addLight(effect.x, effect.y, 140, "rgba(255, 116, 56, 0.22)");
  }

  ctx.restore();
}

function addLight(x, y, radius, color) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function updateHud() {
  const player = state.player;
  const weapon = activeWeapon();
  healthText.textContent = `Health ${Math.ceil(player.hp)} / ${player.maxHp}`;
  levelText.textContent = `Level ${player.level} | XP ${Math.floor(player.xp)} / ${player.xpNext}`;
  weaponText.textContent = `${weapon.name} (${player.activeWeaponIndex + 1}/${player.weaponIds.length})`;
  resourceText.textContent = RESOURCES.filter((name) => player.inventory[name] > 0)
    .map((name) => `${name}: ${player.inventory[name]}`)
    .join(" | ") || "Resources: none yet";
  const chunk = state.world.chunkCoords(player.x, player.y);
  debugOverlay.textContent = [
    `Biome: ${currentBiome().name}`,
    `Position: ${Math.round(player.x)}, ${Math.round(player.y)}`,
    `Chunk: ${chunk.cx}, ${chunk.cy}`,
    `Weapon: ${weapon.name}`,
    `Multiplayer: ${state.connected ? "connected" : "offline"} ${state.snapshot ? state.snapshot.playerCount + " players" : ""}`,
    `World seed: ${state.worldSeed}`,
    `Opened chests: ${state.openedChests.size}`,
    `Defeated creatures: ${state.deadCreatures.size}`
  ].join("\n");
}

function renderRecipes() {
  recipeList.innerHTML = "";
  for (const recipe of RECIPES) {
    const row = document.createElement("div");
    row.className = "recipe";
    const info = document.createElement("div");
    const name = document.createElement("div");
    name.className = "recipe-name";
    name.textContent = recipe.name;
    const cost = document.createElement("div");
    cost.className = "recipe-cost";
    cost.textContent = costText(recipe);
    info.append(name, cost);
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Craft";
    button.addEventListener("click", () => craft(recipe));
    row.append(info, button);
    recipeList.append(row);
  }
}

function costText(recipe) {
  if (recipe.costOptions) {
    return recipe.costOptions.map((cost) => Object.entries(cost).map(([k, v]) => `${v} ${k}`).join(", ")).join(" OR ");
  }
  return Object.entries(recipe.cost).map(([k, v]) => `${v} ${k}`).join(", ");
}

function loop(now) {
  const dt = Math.min(0.05, (now - state.lastTime) / 1000 || 0.016);
  state.lastTime = now;
  update(dt, now);
  draw();
  requestAnimationFrame(loop);
}

function circle(x, y, radius) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function line(x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function round(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("keydown", (event) => {
  if (event.code === "F3") {
    event.preventDefault();
    state.debug = !state.debug;
    shell.classList.toggle("debug-disabled", !state.debug);
    return;
  }
  if (event.code === "Escape") {
    returnToMenu();
    return;
  }
  input.keys.add(event.code);
  if (!state.started) return;
  if (event.code === "Space") input.attackQueued = true;
  if (event.code === "KeyE") input.interactQueued = true;
  if (event.code === "KeyC") craftingPanel.classList.toggle("hidden");
  if (/^Digit[1-5]$/.test(event.code)) {
    const index = Number(event.code.slice(-1)) - 1;
    if (state.player.weaponIds[index]) state.player.activeWeaponIndex = index;
  }
});
window.addEventListener("keyup", (event) => input.keys.delete(event.code));
canvas.addEventListener("mousemove", (event) => {
  input.mouse.x = event.clientX;
  input.mouse.y = event.clientY;
});
canvas.addEventListener("mousedown", () => {
  if (!state.started) return;
  input.mouse.down = true;
  input.attackQueued = true;
});
window.addEventListener("mouseup", () => {
  input.mouse.down = false;
});

document.getElementById("joinPublicButton").addEventListener("click", joinPublic);
document.getElementById("createPrivateButton").addEventListener("click", createPrivate);
document.getElementById("joinCodeButton").addEventListener("click", joinCode);
document.getElementById("leaveButton").addEventListener("click", leaveMultiplayer);
playButton.addEventListener("click", startGame);
nameInput.addEventListener("change", savePlayerName);

resizeCanvas();
renderRecipes();
updateHud();
setStatus("Offlands loaded. Choose Play for solo, or join multiplayer first.");
ensureMultiplayer().restore().catch(() => updateMultiplayerStatus());
requestAnimationFrame(loop);
