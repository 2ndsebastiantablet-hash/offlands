import { ITEM_DEFS, RECIPES, RESOURCE_COLORS, RESOURCES, WEAPONS } from "./data.js";
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
const hotbarEl = document.getElementById("hotbar");
const inventoryPanel = document.getElementById("inventoryPanel");
const inventoryGrid = document.getElementById("inventoryGrid");
const inventoryHotbar = document.getElementById("inventoryHotbar");
const inventoryDetails = document.getElementById("inventoryDetails");
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
  interactQueued: false,
  pickupQueued: false
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
  droppedItems: [],
  markers: [],
  attackSeq: 0,
  dropSeq: 0,
  inventoryOpen: false,
  lastStatePush: 0,
  statusTimer: 0,
  player: {
    x: 320,
    y: 320,
    vx: 0,
    vy: 0,
    radius: 18,
    hp: 100,
    maxHp: 100,
    baseSpeed: 180,
    level: 1,
    xp: 0,
    xpNext: 50,
    damageBonus: 1,
    hotbar: createSlots(9, [{ id: "stickSword", quantity: 1 }]),
    inventorySlots: createSlots(27),
    selectedHotbar: 0,
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
  setInventoryOpen(false);
  mainMenu.classList.remove("hidden");
  craftingPanel.classList.add("hidden");
  shell.classList.add("game-not-started");
  updateMultiplayerStatus();
}

function selectedHotbarStack() {
  return state.player.hotbar[state.player.selectedHotbar] || null;
}

function activeItem() {
  const stack = selectedHotbarStack();
  return stack ? ITEM_DEFS[stack.id] : null;
}

function activeWeapon() {
  const stack = selectedHotbarStack();
  return stack && WEAPONS[stack.id] ? WEAPONS[stack.id] : WEAPONS.stickSword;
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
    weaponId: WEAPONS[selectedHotbarStack()?.id] ? selectedHotbarStack().id : null,
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
    updateHazardEffects(dt);
    const clickedPickup = input.pickupQueued && pickupDroppedAt(input.mouse.worldX, input.mouse.worldY);
    if (!clickedPickup && (input.attackQueued || input.mouse.down)) useSelectedItem(now);
    if (input.interactQueued) interact();
  }
  input.attackQueued = false;
  input.interactQueued = false;
  input.pickupQueued = false;

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
  const biome = currentBiome();
  const mods = biome.gameplayModifiers || {};
  const hazardMove = playerHazardMoveMultiplier();
  const speed = player.baseSpeed * (mods.playerSpeed || 1) * hazardMove;
  const inertia = mods.inertia || 0;
  const windPush = biome.wind?.strength || 0;

  if (inertia > 0.05) {
    const accel = speed * (5.5 - inertia * 2.8);
    player.vx += dir.x * accel * dt;
    player.vy += dir.y * accel * dt;
    const damping = Math.pow(0.0008 + inertia * 0.72, dt);
    player.vx *= damping;
    player.vy *= damping;
    const maxSpeed = speed * (1.15 + inertia * 0.35);
    const currentSpeed = Math.hypot(player.vx, player.vy);
    if (currentSpeed > maxSpeed) {
      player.vx = (player.vx / currentSpeed) * maxSpeed;
      player.vy = (player.vy / currentSpeed) * maxSpeed;
    }
    player.x += player.vx * dt;
    player.y += player.vy * dt;
  } else if (x || y) {
    player.vx = dir.x * speed;
    player.vy = dir.y * speed;
    player.x += player.vx * dt;
    player.y += player.vy * dt;
  } else {
    player.vx = 0;
    player.vy = 0;
  }

  if (windPush > 0) {
    player.x += biome.wind.x * windPush * 0.38 * dt;
    player.y += biome.wind.y * windPush * 0.38 * dt;
  }
}

function playerHazardMoveMultiplier() {
  let multiplier = 1;
  for (const chunk of state.world.nearbyChunks(state.player.x, state.player.y, 1)) {
    for (const hazard of chunk.hazards) {
      if (distance(state.player, hazard) >= hazard.radius) continue;
      if (hazard.type === "slime") multiplier = Math.min(multiplier, 0.65);
      if (hazard.type === "ice") multiplier = Math.min(multiplier, 0.88);
      if (hazard.type === "poisonGas") multiplier = Math.min(multiplier, 0.86);
      if (hazard.type === "windStream") {
        state.player.x += hazard.windX * hazard.push * 0.004;
        state.player.y += hazard.windY * hazard.push * 0.004;
      }
    }
  }
  return multiplier;
}

function updateHazardEffects(dt) {
  let damage = 0;
  for (const chunk of state.world.nearbyChunks(state.player.x, state.player.y, 1)) {
    for (const hazard of chunk.hazards) {
      if (distance(state.player, hazard) >= hazard.radius) continue;
      if (hazard.type === "poisonGas") damage += (hazard.damage || 5) * dt;
      if (hazard.type === "lavaCrack") damage += (hazard.damage || 9) * dt;
      if (hazard.type === "spikes") damage += (hazard.damage || 7) * dt;
      if (hazard.type === "windStream") {
        state.player.x += hazard.windX * hazard.push * dt;
        state.player.y += hazard.windY * hazard.push * dt;
      }
    }
  }
  if (damage > 0) hurtPlayer(damage, { x: 0, y: 0 }, false);
}

function useSelectedItem(now) {
  const item = activeItem();
  const stack = selectedHotbarStack();
  if (!item) {
    if (input.attackQueued) setStatus("Selected hotbar slot is empty.", 1);
    return;
  }
  if (item?.type === "consumable" && stack?.id === "healingPack") {
    if (state.player.hp >= state.player.maxHp) {
      setStatus("Health is already full.", 1.1);
      return;
    }
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + 25);
    removeFromSlot(state.player.hotbar, state.player.selectedHotbar, 1);
    setStatus("Used Healing Fruit Pack.");
    return;
  }
  if (item?.type === "placeable" && stack?.id === "campMarker") {
    state.markers.push({ x: state.player.x, y: state.player.y });
    removeFromSlot(state.player.hotbar, state.player.selectedHotbar, 1);
    setStatus("Placed a Camp Marker.");
    return;
  }
  if (item.type !== "weapon") {
    if (input.attackQueued) setStatus(`${item.name} is not a weapon.`, 1);
    return;
  }
  attack(now);
}

function attack(now) {
  const player = state.player;
  const weapon = activeWeapon();
  if (player.cooldown > 0) return;
  player.cooldown = weapon.cooldown;
  state.attackSeq += 1;
  const aim = normalize(input.mouse.worldX - player.x, input.mouse.worldY - player.y);
  state.effects.push({ type: "swing", x: player.x, y: player.y, aim, weapon, life: 0.16, maxLife: 0.16 });
  const biome = currentBiome();
  const projectileRange = biome.gameplayModifiers?.projectileRange || 1;
  const projectileSpeed = biome.gameplayModifiers?.projectileSpeed || 1;

  if (weapon.type === "ranged") {
    state.projectiles.push({
      x: player.x + aim.x * 24,
      y: player.y + aim.y * 24,
      vx: aim.x * weapon.speed * projectileSpeed,
      vy: aim.y * weapon.speed * projectileSpeed,
      damage: scaledDamage(weapon.damage),
      traveled: 0,
      range: weapon.range * projectileRange,
      radius: weapon.id === "slimeGun" ? 9 : 5,
      color: weapon.color,
      effect: weapon.id,
      glow: biome.projectileEffect?.glow || 1
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

function damageCreature(creature, amount, weapon, dir, source = "player") {
  if (creature.profile?.isTamed && source === "player") {
    setStatus(`${creature.profile.name} is on your side.`, 1);
    return;
  }
  if (creature.profile?.isInvincible) {
    creature.hurtTimer = 0.18;
    addFloatingText("immune", creature.x, creature.y - 24, "#d9d4ff");
    alertHive(creature);
    return;
  }
  if (source === "player" && creature.profile?.isFriendly) {
    creature.profile.isFriendly = false;
    creature.profile.temperament = "Scared";
    creature.profile.behaviorType = "scared";
  }
  if (source === "player" && ["neutral", "scared"].includes(creature.profile?.behaviorType)) {
    creature.profile.isFriendly = false;
    creature.profile.behaviorType = "hostile";
    creature.profile.temperament = "Hostile";
  }
  const finalDamage = Math.max(1, Math.round(amount * (1 - creature.defense)));
  const knockbackScale = currentBiome().gameplayModifiers?.knockback || 1;
  creature.hp -= finalDamage;
  creature.hurtTimer = 0.18;
  const knockback = (weapon.knockback || 55) * (1 - (creature.knockbackResistance || 0));
  creature.x += dir.x * knockback * 0.045 * knockbackScale;
  creature.y += dir.y * knockback * 0.045 * knockbackScale;
  if (weapon.id === "slimeGun") creature.slowTimer = 2.2;
  if (weapon.id === "fireTooth") creature.burnTimer = 3;
  addFloatingText(`-${finalDamage}`, creature.x, creature.y - 24, "#fff1a8");
  alertHive(creature);
  if (creature.hp <= 0) killCreature(creature);
}

function killCreature(creature) {
  if (state.deadCreatures.has(creature.id)) return;
  creature.dead = true;
  state.deadCreatures.add(creature.id);
  const rng = seeded(`${state.worldSeed}:drop:${creature.id}`);
  const lootTable = creature.profile?.lootTable;
  const resources = lootTable?.resources?.length ? lootTable.resources : state.world.getBiomeAt(creature.x, creature.y).resources;
  const resource = resources[Math.floor(rng() * resources.length)];
  const min = lootTable?.min || 1;
  const max = lootTable?.max || 2;
  spawnDroppedItem(resource, min + Math.floor(rng() * Math.max(1, max - min + 1)), creature.x, creature.y);
  if (lootTable?.rareWeaponChance && rng() < lootTable.rareWeaponChance) {
    const weaponId = creature.profile?.bodyType === "crystal" ? "eyeWand" : creature.profile?.bodyType === "boneBeast" ? "boneClub" : "stickSword";
    spawnDroppedItem(weaponId, 1, creature.x + 18, creature.y + 10);
  }
  gainXp(creature.xp);
  addFloatingText(`+${creature.xp} XP`, creature.x, creature.y - 42, "#a7ff8b");
  sendWorldEvent("creature_killed", { creatureId: creature.id });
}

function nearbyCreatures() {
  return state.world.nearbyChunks(state.player.x, state.player.y, 2).flatMap((chunk) => chunk.creatures);
}

function updateCreatures(chunk, dt) {
  const biome = chunk.biomeProfile;
  for (const creature of chunk.creatures) {
    if (state.deadCreatures.has(creature.id)) {
      creature.dead = true;
      continue;
    }
    if (creature.dead) continue;
    updateCreatureTimers(creature, dt);
    if (creature.burnTimer > 0) {
      creature.burnTimer -= dt;
      creature.hp -= 4 * dt;
      if (creature.hp <= 0) killCreature(creature);
    }

    if (creature.profile?.isTamed) {
      updateTamedCreature(creature, chunk, biome, dt);
    } else {
      updateWildCreature(creature, chunk, biome, dt);
    }
    clampCreatureMovement(creature, chunk);
  }
}

function updateCreatureTimers(creature, dt) {
  creature.hurtTimer = Math.max(0, creature.hurtTimer - dt);
  creature.slowTimer = Math.max(0, creature.slowTimer - dt);
  creature.attackTimer = Math.max(0, creature.attackTimer - dt);
  creature.specialTimer = Math.max(0, creature.specialTimer - dt * 1000);
  creature.laserTimer = Math.max(0, creature.laserTimer - dt * 1000);
  creature.sporeTimer = Math.max(0, creature.sporeTimer - dt * 1000);
  creature.jumpTimer = Math.max(0, creature.jumpTimer - dt * 1000);
  creature.teleportTimer = Math.max(0, creature.teleportTimer - dt * 1000);
  creature.hiveAlertTimer = Math.max(0, creature.hiveAlertTimer - dt);
  creature.burrowTimer = Math.max(0, creature.burrowTimer - dt);
  creature.tamePulse = Math.max(0, creature.tamePulse - dt);
}

function updateWildCreature(creature, chunk, biome, dt) {
  const profile = creature.profile || {};
  const toPlayer = { x: state.player.x - creature.x, y: state.player.y - creature.y };
  const playerDist = Math.hypot(toPlayer.x, toPlayer.y);
  const hostile = isCreatureHostile(creature, playerDist);
  let move = { x: 0, y: 0 };

  if (profile.behaviorType === "scared" && playerDist < creature.detection) {
    move = normalize(-toPlayer.x, -toPlayer.y);
  } else if (hostile && playerDist < creature.chaseRange && state.player.respawnTimer <= 0) {
    move = normalize(toPlayer.x, toPlayer.y);
    if (profile.movementStyle === "ambushing" && playerDist > 80 && creature.burrowTimer <= 0) {
      creature.burrowTimer = 1.2;
    }
  } else if (profile.prefersOriginBiome && !profile.canLeaveOriginBiome && distance(creature, { x: creature.spawnX, y: creature.spawnY }) > 220) {
    move = normalize(creature.spawnX - creature.x, creature.spawnY - creature.y);
  } else {
    move = wanderMove(creature, dt);
  }

  if (profile.movementStyle === "teleporting" && hostile && playerDist > 130 && playerDist < 360 && creature.teleportTimer <= 0) {
    creature.teleportTimer = 3200 + Math.random() * 2200;
    const dir = normalize(toPlayer.x, toPlayer.y);
    creature.x += dir.x * 92;
    creature.y += dir.y * 92;
    addFloatingText("blink", creature.x, creature.y - 26, "#b9f4ff");
  }

  moveCreature(creature, move, biome, dt);
  if (hostile) creatureAttackPlayer(creature, biome, playerDist, toPlayer);
}

function updateTamedCreature(creature, chunk, biome, dt) {
  const target = findNearestHostileCreature(creature, 260);
  let move = { x: 0, y: 0 };
  if (target) {
    const toTarget = { x: target.x - creature.x, y: target.y - creature.y };
    const targetDist = Math.hypot(toTarget.x, toTarget.y);
    move = normalize(toTarget.x, toTarget.y);
    if (targetDist < Math.max(42, creature.attackRange || 42) && creature.attackTimer <= 0) {
      creature.attackTimer = Math.max(0.45, (creature.attackCooldown || 1) / Math.max(0.5, creature.aggression));
      damageCreature(target, creature.damage * 0.75, { id: "ally", knockback: 70 }, normalize(toTarget.x, toTarget.y), "ally");
      addFloatingText("guard", creature.x, creature.y - 26, "#8ff3ff");
    }
  } else {
    const toPlayer = { x: state.player.x - creature.x, y: state.player.y - creature.y };
    const dist = Math.hypot(toPlayer.x, toPlayer.y);
    if (dist > 72) move = normalize(toPlayer.x, toPlayer.y);
    if (dist < 42) move = normalize(-toPlayer.x, -toPlayer.y);
  }
  moveCreature(creature, move, biome, dt, 1.12);
}

function wanderMove(creature, dt) {
  creature.wanderTimer -= dt;
  if (creature.wanderTimer <= 0) {
    creature.wanderTimer = 1 + Math.random() * 2;
    creature.wanderAngle += -1.2 + Math.random() * 2.4;
  }
  return { x: Math.cos(creature.wanderAngle), y: Math.sin(creature.wanderAngle) };
}

function moveCreature(creature, move, biome, dt, speedBoost = 1) {
  const profile = creature.profile || {};
  const currentBiome = state.world.getBiomeAt(creature.x, creature.y);
  const outsideOrigin = profile.originBiomeId && currentBiome.id !== profile.originBiomeId;
  let speed = creature.speed * speedBoost * (creature.slowTimer > 0 ? 0.48 : 1);
  if (outsideOrigin && profile.prefersOriginBiome) speed *= profile.canLeaveOriginBiome ? 0.86 : 0.62;
  if (profile.movementStyle === "slowStomping") speed *= 0.82;
  if (profile.movementStyle === "charging" && isCreatureHostile(creature)) speed *= 1.18;
  if (profile.movementStyle === "jumping" && creature.jumpTimer <= 0) {
    creature.jumpTimer = 700 + Math.random() * 900;
    speed *= 2.1;
  }
  if (profile.movementStyle === "burrowing" && creature.burrowTimer > 0) speed *= 1.45;

  const drift = creature.flying || creature.drift || profile.movementStyle === "floating" ? (biome.gameplayModifiers?.inertia || 0.3) : 0;
  creature.x += move.x * speed * dt;
  creature.y += move.y * speed * dt;
  if (drift > 0.2) {
    creature.x += Math.sin(performance.now() / 700 + creature.spawnX) * drift * 14 * dt;
    creature.y += Math.cos(performance.now() / 900 + creature.spawnY) * drift * 12 * dt;
  }
  if (biome.wind?.strength > 0 && !creature.parts.skin && profile.movementStyle !== "slowStomping") {
    creature.x += biome.wind.x * biome.wind.strength * 0.18 * dt;
    creature.y += biome.wind.y * biome.wind.strength * 0.18 * dt;
  }
}

function clampCreatureMovement(creature, chunk) {
  const margin = creature.profile?.canLeaveOriginBiome ? CHUNK_SIZE * 1.15 : 28;
  creature.x = clamp(creature.x, chunk.x - margin, chunk.x + CHUNK_SIZE + margin);
  creature.y = clamp(creature.y, chunk.y - margin, chunk.y + CHUNK_SIZE + margin);
  if (!creature.profile?.canLeaveOriginBiome) {
    creature.x = clamp(creature.x, chunk.x + 28, chunk.x + CHUNK_SIZE - 28);
    creature.y = clamp(creature.y, chunk.y + 28, chunk.y + CHUNK_SIZE - 28);
  }
}

function isCreatureHostile(creature, playerDist = Infinity) {
  const profile = creature.profile || {};
  if (profile.isTamed || profile.isFriendly) return false;
  if (creature.hiveAlertTimer > 0) return true;
  if (["hostile", "hive", "ambusher"].includes(profile.behaviorType)) return true;
  if (profile.behaviorType === "territorial" && playerDist < creature.detection * 0.72) return true;
  return false;
}

function findNearestHostileCreature(origin, range) {
  let best = null;
  let bestDist = Infinity;
  for (const creature of nearbyCreatures()) {
    if (creature === origin || creature.dead || state.deadCreatures.has(creature.id)) continue;
    if (!isCreatureHostile(creature, distance(origin, creature))) continue;
    const dist = distance(origin, creature);
    if (dist < range && dist < bestDist) {
      best = creature;
      bestDist = dist;
    }
  }
  return best;
}

function creatureAttackPlayer(creature, biome, playerDist, toPlayer) {
  if (creature.attackTimer > 0 || state.player.respawnTimer > 0) return;
  const profile = creature.profile || {};
  const attackStyle = profile.attackStyle || "bite";
  const dir = normalize(toPlayer.x, toPlayer.y);
  const cooldown = Math.max(0.38, (creature.attackCooldown || 1.05) / Math.max(0.45, creature.aggression));

  if (["bite", "clawSlash", "tailStab", "jumpSlam"].includes(attackStyle) && playerDist < (creature.attackRange || 42)) {
    creature.attackTimer = cooldown;
    const extra = attackStyle === "jumpSlam" ? 1.35 : attackStyle === "tailStab" ? 1.12 : 1;
    hurtPlayer(creature.damage * extra, dir);
    return;
  }

  if (attackStyle === "longArmSwipe" && playerDist < 82) {
    creature.attackTimer = cooldown;
    hurtPlayer(creature.damage * 0.9, dir);
    state.effects.push({ type: "swipe", x: creature.x, y: creature.y, aim: dir, radius: 82, color: creature.profile.colorPalette.accent, life: 0.18, maxLife: 0.18 });
    return;
  }

  if (attackStyle === "charge" && playerDist < 150) {
    creature.attackTimer = cooldown * 1.35;
    creature.x += dir.x * 38;
    creature.y += dir.y * 38;
    if (playerDist < 54) hurtPlayer(creature.damage * 1.35, dir);
    return;
  }

  if (["rangedProjectile", "laserBeam", "poisonSpit", "fireBreath", "spikeShot"].includes(attackStyle) && playerDist < (creature.attackRange || 320)) {
    creature.attackTimer = cooldown * (attackStyle === "laserBeam" ? 1.4 : 1);
    const color = attackStyle === "laserBeam"
      ? "#ff4ca3"
      : attackStyle === "poisonSpit"
        ? "#9ef05c"
        : attackStyle === "fireBreath"
          ? "#ff7438"
          : attackStyle === "spikeShot"
            ? "#efe1bd"
            : creature.profile.colorPalette.accent;
    state.enemyProjectiles.push({
      x: creature.x,
      y: creature.y,
      vx: dir.x * 360 * (biome.gameplayModifiers?.projectileSpeed || 1),
      vy: dir.y * 360 * (biome.gameplayModifiers?.projectileSpeed || 1),
      damage: creature.damage + (attackStyle === "laserBeam" ? 5 : 2),
      traveled: 0,
      range: (attackStyle === "laserBeam" ? 560 : 420) * (biome.gameplayModifiers?.projectileRange || 1),
      radius: attackStyle === "fireBreath" ? 8 : 5,
      color,
      effect: attackStyle,
      glow: attackStyle === "laserBeam" ? 1.4 : 1
    });
    return;
  }

  if (["toxicGas", "sporeBurst"].includes(attackStyle) && playerDist < 100) {
    creature.attackTimer = cooldown * 1.8;
    const color = attackStyle === "toxicGas" ? "rgba(142, 241, 94, 0.22)" : "rgba(160, 91, 218, 0.22)";
    state.effects.push({ type: "spore", x: creature.x, y: creature.y, radius: 82, color, life: 1.5, maxLife: 1.5 });
    if (playerDist < 82) hurtPlayer(creature.damage * 0.55, dir);
    return;
  }

  if (["swarmCall", "hiveSignal"].includes(attackStyle) && playerDist < creature.detection + 80) {
    creature.attackTimer = cooldown * 1.6;
    alertHive(creature);
    addFloatingText("signal", creature.x, creature.y - 26, "#ff7b7b");
  }
}

function alertHive(source) {
  const hiveMindId = source.profile?.hiveMindId;
  if (!hiveMindId) return;
  for (const creature of nearbyCreatures()) {
    if (creature.dead || state.deadCreatures.has(creature.id)) continue;
    if (creature.profile?.hiveMindId !== hiveMindId) continue;
    if (distance(source, creature) > 560) continue;
    creature.hiveAlertTimer = Math.max(creature.hiveAlertTimer || 0, 5);
    creature.profile.isFriendly = false;
    creature.profile.behaviorType = "hive";
    creature.profile.temperament = "Hive";
  }
}

function updateProjectiles(dt) {
  updateProjectileList(state.projectiles, dt, true);
  updateProjectileList(state.enemyProjectiles, dt, false);
}

function updateProjectileList(list, dt, fromPlayer) {
  for (let index = list.length - 1; index >= 0; index -= 1) {
    const projectile = list[index];
    const biome = state.world.getBiomeAt(projectile.x, projectile.y);
    const windForce = (biome.gameplayModifiers?.projectileWind || 0) * (biome.wind?.strength || 0);
    if (windForce > 0) {
      projectile.vx += biome.wind.x * windForce * dt;
      projectile.vy += biome.wind.y * windForce * dt;
    }
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

function hurtPlayer(amount, dir, knockback = true) {
  const player = state.player;
  if (player.respawnTimer > 0) return;
  player.hp -= amount;
  player.hurtTimer = 0.25;
  if (knockback) {
    player.x += dir.x * 12;
    player.y += dir.y * 12;
  }
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
  state.player.vx = 0;
  state.player.vy = 0;
  state.player.hp = state.player.maxHp;
  state.enemyProjectiles.length = 0;
  setStatus("Respawned at the starting camp.");
}

function interact() {
  if (pickupNearestDroppedItem()) return;
  if (tryTameCreature()) return;
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

function tryTameCreature() {
  let nearest = null;
  let nearestDistance = Infinity;
  for (const creature of nearbyCreatures()) {
    if (creature.dead || state.deadCreatures.has(creature.id)) continue;
    const dist = distance(creature, state.player);
    if (dist < nearestDistance && dist < Math.max(64, creature.bodyRadius + 34)) {
      nearest = creature;
      nearestDistance = dist;
    }
  }
  if (!nearest) return false;
  const profile = nearest.profile;
  if (!profile) return false;
  if (profile.isTamed) {
    setStatus(`${profile.name} is already following you.`, 1.5);
    return true;
  }
  if (!profile.isTameable) {
    if (profile.isFriendly || profile.behaviorType === "neutral") {
      setStatus(`${profile.name} seems friendly, but not tameable.`, 1.5);
      return true;
    }
    return false;
  }
  const tameItem = profile.tameItem;
  if (!tameItem || (state.player.inventory[tameItem] || 0) <= 0) {
    setStatus(`${profile.name} wants ${tameItem || "a different offering"}.`, 1.8);
    return true;
  }
  removeResource(tameItem, 1);
  profile.isTamed = true;
  profile.isFriendly = true;
  profile.followsPlayer = true;
  profile.fightsForPlayer = true;
  profile.behaviorType = "friendly";
  profile.temperament = "Tamed";
  nearest.hiveAlertTimer = 0;
  nearest.attackTimer = 0;
  addFloatingText("tamed", nearest.x, nearest.y - nearest.bodyRadius - 18, "#8ff3ff");
  setStatus(`${profile.name} joined you.`);
  return true;
}

function openChest(chest) {
  state.openedChests.add(chest.id);
  const loot = rollChestLoot(chest);
  for (const [resource, amount] of Object.entries(loot.resources)) addResource(resource, amount);
  if (loot.weaponId) addWeapon(loot.weaponId);
  gainXp(loot.xp);
  const biome = state.world.getBiomeAt(chest.x, chest.y);
  setStatus(`${biome.chestName} opened: ${loot.summary}`);
  sendWorldEvent("chest_opened", { chestId: chest.id });
}

function rollChestLoot(chest) {
  const biome = state.world.getBiomeAt(chest.x, chest.y);
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
  addItem(resource, amount);
}

function addWeapon(weaponId) {
  if (!WEAPONS[weaponId]) return;
  if (hasInventoryItem(weaponId)) return;
  addItem(weaponId, 1);
  setStatus(`Found ${WEAPONS[weaponId].name}.`);
}

function createSlots(count, starters = []) {
  const slots = Array.from({ length: count }, () => null);
  starters.forEach((stack, index) => {
    slots[index] = { id: stack.id, quantity: stack.quantity || 1 };
  });
  return slots;
}

function allSlots() {
  return [...state.player.hotbar, ...state.player.inventorySlots];
}

function inventoryContainers() {
  return [state.player.hotbar, state.player.inventorySlots];
}

function itemDef(itemId) {
  return ITEM_DEFS[itemId] || {
    id: itemId,
    name: itemId,
    type: "resource",
    stackable: true,
    maxStack: 99,
    color: "#ffffff",
    description: "Item"
  };
}

function addItem(itemId, quantity = 1) {
  const def = itemDef(itemId);
  let remaining = quantity;

  if (def.stackable) {
    for (const slots of inventoryContainers()) {
      for (const slot of slots) {
        if (!slot || slot.id !== itemId) continue;
        const room = (def.maxStack || 99) - slot.quantity;
        if (room <= 0) continue;
        const moved = Math.min(room, remaining);
        slot.quantity += moved;
        remaining -= moved;
        if (remaining <= 0) {
          recountResourceInventory();
          return true;
        }
      }
    }
  }

  for (const slots of inventoryContainers()) {
    for (let index = 0; index < slots.length; index += 1) {
      if (slots[index]) continue;
      const moved = def.stackable ? Math.min(def.maxStack || 99, remaining) : 1;
      slots[index] = { id: itemId, quantity: moved };
      remaining -= moved;
      if (remaining <= 0) {
        recountResourceInventory();
        return true;
      }
    }
  }

  if (remaining > 0) {
    spawnDroppedItem(itemId, remaining, state.player.x + 28, state.player.y + 12);
    setStatus("Inventory full. Extra item dropped nearby.");
  }
  recountResourceInventory();
  return remaining <= 0;
}

function hasInventoryItem(itemId) {
  return allSlots().some((slot) => slot?.id === itemId);
}

function recountResourceInventory() {
  state.player.inventory = Object.fromEntries(RESOURCES.map((name) => [name, 0]));
  for (const slot of allSlots()) {
    if (slot && RESOURCES.includes(slot.id)) {
      state.player.inventory[slot.id] += slot.quantity;
    }
  }
}

function removeResource(resource, amount) {
  let remaining = amount;
  for (const slots of inventoryContainers()) {
    for (let index = 0; index < slots.length; index += 1) {
      const slot = slots[index];
      if (!slot || slot.id !== resource) continue;
      const moved = Math.min(slot.quantity, remaining);
      slot.quantity -= moved;
      remaining -= moved;
      if (slot.quantity <= 0) slots[index] = null;
      if (remaining <= 0) {
        recountResourceInventory();
        return true;
      }
    }
  }
  recountResourceInventory();
  return false;
}

function removeFromSlot(slots, index, quantity = 1) {
  const slot = slots[index];
  if (!slot) return null;
  const removed = { id: slot.id, quantity: Math.min(quantity, slot.quantity) };
  slot.quantity -= removed.quantity;
  if (slot.quantity <= 0) slots[index] = null;
  recountResourceInventory();
  return removed;
}

function dropHotbarSlot(index, dropAll = false) {
  const slot = state.player.hotbar[index];
  if (!slot) {
    setStatus(`Hotbar slot ${index + 1} is empty.`, 1);
    return;
  }
  const quantity = dropAll || !itemDef(slot.id).stackable ? slot.quantity : 1;
  const removed = removeFromSlot(state.player.hotbar, index, quantity);
  if (!removed) return;
  spawnDroppedItem(
    removed.id,
    removed.quantity,
    state.player.x + 26 + Math.random() * 18,
    state.player.y + 12 + Math.random() * 18
  );
  setStatus(`Dropped ${itemDef(removed.id).name}.`);
}

function spawnDroppedItem(itemId, quantity, x, y) {
  const def = itemDef(itemId);
  state.dropSeq += 1;
  state.droppedItems.push({
    id: `drop:${Date.now()}:${state.dropSeq}`,
    itemId,
    itemType: def.type,
    name: def.name,
    quantity,
    x,
    y,
    color: def.color,
    radius: def.type === "weapon" ? 11 : 8
  });
}

function pickupNearestDroppedItem() {
  let nearest = null;
  let nearestDistance = Infinity;
  for (const item of state.droppedItems) {
    const dist = distance(item, state.player);
    if (dist < nearestDistance && dist < 52) {
      nearest = item;
      nearestDistance = dist;
    }
  }
  if (!nearest) return false;
  return pickupDroppedItem(nearest);
}

function pickupDroppedAt(x, y) {
  for (const item of state.droppedItems) {
    if (distance(item, state.player) > 72) continue;
    if (Math.hypot(item.x - x, item.y - y) > item.radius + 14) continue;
    return pickupDroppedItem(item);
  }
  return false;
}

function pickupDroppedItem(item) {
  const index = state.droppedItems.indexOf(item);
  if (index < 0) return false;
  addItem(item.itemId, item.quantity);
  state.droppedItems.splice(index, 1);
  addFloatingText(`+${item.quantity} ${item.name}`, item.x, item.y - 18, "#def7c4");
  setStatus(`Picked up ${item.quantity} ${item.name}.`, 1.6);
  return true;
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
    removeResource(resource, amount);
  }
  if (recipe.id === "healingPack") {
    addItem("healingPack", recipe.quantity || 1);
    setStatus("Crafted Healing Fruit Pack.");
  } else if (recipe.weapon) {
    addWeapon(recipe.weapon);
    setStatus(`Crafted ${WEAPONS[recipe.weapon].name}.`);
  } else if (recipe.marker) {
    addItem("campMarker", recipe.quantity || 1);
    setStatus("Crafted a Camp Marker.");
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
  drawDroppedItems();
  drawRemotePlayers();
  drawPlayer();
  drawProjectiles();
  drawEffects();
  drawFloatingText();
  drawLighting();
  ctx.restore();
  drawWeatherOverlay();
}

function drawWorld() {
  const chunks = state.world.nearbyChunks(state.player.x, state.player.y, 3);
  for (const chunk of chunks) drawChunkGround(chunk);
  for (const chunk of chunks) {
    for (const hazard of chunk.hazards) drawHazard(hazard);
    for (const prop of chunk.props) drawProp(prop, chunk.biomeProfile);
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
  const biome = chunk.biomeProfile;
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

function drawProp(prop, biome) {
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
  } else if (prop.type === "tallGrass") {
    ctx.strokeStyle = "#72d069";
    ctx.lineWidth = 2;
    for (let i = -4; i <= 4; i += 2) {
      line(i * 2, 10, i * 3, -8 - Math.abs(i) * 2);
    }
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
  } else if (prop.type === "snowRock") {
    ctx.fillStyle = "#d7edf3";
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 13, -0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-12, -10, 22, 5);
  } else if (prop.type === "iceCrystal" || prop.type === "crystalCluster") {
    const colors = prop.type === "iceCrystal" ? ["#d4fbff", "#8edfff"] : ["#b28dff", "#7df1ff"];
    for (let i = -1; i <= 1; i += 1) {
      ctx.fillStyle = colors[(i + 1) % 2];
      ctx.beginPath();
      ctx.moveTo(i * 10, -28 + Math.abs(i) * 5);
      ctx.lineTo(i * 10 - 8, 10);
      ctx.lineTo(i * 10 + 9, 9);
      ctx.closePath();
      ctx.fill();
    }
  } else if (prop.type === "poisonVent") {
    ctx.fillStyle = "#4b5341";
    ctx.fillRect(-13, 0, 26, 12);
    ctx.fillStyle = "rgba(148, 242, 92, 0.4)";
    circle(-6, -5, 8);
    circle(6, -9, 10);
  } else if (prop.type === "ashPile") {
    ctx.fillStyle = "#8d8982";
    ctx.beginPath();
    ctx.ellipse(0, 5, 26, 10, 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5d5954";
    circle(-7, 1, 5);
    circle(9, 2, 4);
  } else if (prop.type === "burnedTree") {
    ctx.fillStyle = "#2f2926";
    ctx.fillRect(-5, -26, 10, 44);
    ctx.strokeStyle = "#2f2926";
    ctx.lineWidth = 4;
    line(0, -12, -16, -28);
    line(0, -18, 16, -34);
    ctx.fillStyle = "rgba(255, 116, 56, 0.35)";
    circle(0, 12, 8);
  } else if (prop.type === "deadPlant") {
    ctx.strokeStyle = "#8d806e";
    ctx.lineWidth = 3;
    line(0, 12, 0, -12);
    line(0, -4, -12, -14);
    line(0, 0, 13, -10);
  } else if (prop.type === "lavaCrack") {
    ctx.strokeStyle = "#ff7438";
    ctx.lineWidth = 5;
    line(-22, 8, -8, -4);
    line(-8, -4, 4, 3);
    line(4, 3, 20, -10);
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
  ctx.save();
  ctx.translate(hazard.x, hazard.y);
  if (hazard.type === "poisonGas") {
    ctx.fillStyle = "rgba(142, 241, 94, 0.18)";
    circle(0, 0, hazard.radius);
    ctx.fillStyle = "rgba(182, 255, 126, 0.22)";
    circle(-hazard.radius * 0.25, -6, hazard.radius * 0.5);
    circle(hazard.radius * 0.22, 7, hazard.radius * 0.42);
  } else if (hazard.type === "ice") {
    ctx.fillStyle = "rgba(191, 245, 255, 0.30)";
    ctx.beginPath();
    ctx.ellipse(0, 0, hazard.radius * 1.35, hazard.radius * 0.58, -0.18, 0, Math.PI * 2);
    ctx.fill();
  } else if (hazard.type === "lavaCrack") {
    ctx.strokeStyle = "rgba(255, 116, 56, 0.82)";
    ctx.lineWidth = 7;
    line(-hazard.radius, 0, -hazard.radius * 0.25, -8);
    line(-hazard.radius * 0.25, -8, hazard.radius * 0.2, 6);
    line(hazard.radius * 0.2, 6, hazard.radius, -5);
  } else if (hazard.type === "spikes") {
    ctx.fillStyle = "rgba(238, 222, 185, 0.72)";
    for (let i = 0; i < 6; i += 1) {
      const angle = (Math.PI * 2 * i) / 6;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 4, Math.sin(angle) * 4);
      ctx.lineTo(Math.cos(angle - 0.18) * hazard.radius, Math.sin(angle - 0.18) * hazard.radius);
      ctx.lineTo(Math.cos(angle + 0.18) * hazard.radius, Math.sin(angle + 0.18) * hazard.radius);
      ctx.fill();
    }
  } else if (hazard.type === "windStream") {
    ctx.strokeStyle = "rgba(210, 240, 255, 0.34)";
    ctx.lineWidth = 3;
    for (let i = -2; i <= 2; i += 1) {
      line(-hazard.windX * hazard.radius + hazard.windY * i * 9, -hazard.windY * hazard.radius - hazard.windX * i * 9,
        hazard.windX * hazard.radius + hazard.windY * i * 9, hazard.windY * hazard.radius - hazard.windX * i * 9);
    }
  } else {
    ctx.fillStyle = "rgba(42, 230, 122, 0.28)";
    ctx.beginPath();
    ctx.ellipse(0, 0, hazard.radius * 1.25, hazard.radius * 0.7, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawResource(resource) {
  if (resource.collected) return;
  const close = distance(resource, state.player) <= 52;
  ctx.save();
  ctx.fillStyle = RESOURCE_COLORS[resource.type] || "#ffffff";
  circle(resource.x, resource.y, 8);
  ctx.shadowColor = close ? "rgba(255, 255, 255, 0.75)" : "transparent";
  ctx.shadowBlur = close ? 13 : 0;
  ctx.lineWidth = close ? 4 : 3;
  ctx.strokeStyle = close ? "#ffffff" : "rgba(255, 255, 255, 0.88)";
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
  ctx.stroke();
  ctx.restore();
}

function drawChest(chest) {
  const opened = state.openedChests.has(chest.id);
  const biome = state.world.getBiomeAt(chest.x, chest.y);
  ctx.save();
  ctx.translate(chest.x, chest.y);
  ctx.fillStyle = opened ? "#75685b" : "#a05b2a";
  ctx.fillRect(-18, -13, 36, 26);
  ctx.fillStyle = opened ? "#3a312c" : biome.accent;
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

function drawDroppedItems() {
  for (const item of state.droppedItems) {
    ctx.save();
    ctx.translate(item.x, item.y);
    const bob = Math.sin(performance.now() / 260 + item.x) * 2;
    ctx.translate(0, bob);
    ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
    ctx.beginPath();
    ctx.ellipse(0, 12, item.radius + 5, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    const close = distance(item, state.player) <= 72;
    ctx.shadowColor = close ? "rgba(255, 255, 255, 0.78)" : "transparent";
    ctx.shadowBlur = close ? 15 : 0;
    ctx.strokeStyle = close ? "#ffffff" : "rgba(255, 255, 255, 0.88)";
    ctx.lineWidth = close ? 4 : 3;
    ctx.beginPath();
    ctx.arc(0, 0, item.radius + 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = item.color;
    if (item.itemType === "weapon") {
      ctx.rotate(-0.65);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.strokeRect(-3, -16, 6, 28);
      ctx.strokeRect(-10, -4, 20, 5);
      ctx.fillRect(-3, -16, 6, 28);
      ctx.fillRect(-10, -4, 20, 5);
    } else if (item.itemType === "placeable") {
      ctx.beginPath();
      ctx.moveTo(0, -15);
      ctx.lineTo(10, 4);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fill();
      ctx.strokeStyle = "#503c1a";
      line(0, -15, 0, 13);
    } else {
      circle(0, 0, item.radius);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    if (item.quantity > 1) ctx.fillText(String(item.quantity), 0, -13);
    ctx.restore();
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
  ctx.strokeStyle = activeItem()?.color || "#cdd6df";
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
      ctx.fillStyle = effect.color || `rgba(160, 91, 218, ${0.22 * pct})`;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.radius * (1.2 - pct * 0.2), 0, Math.PI * 2);
      ctx.fill();
    }
    if (effect.type === "swipe") {
      ctx.save();
      ctx.translate(effect.x, effect.y);
      ctx.rotate(Math.atan2(effect.aim.y, effect.aim.x));
      ctx.strokeStyle = effect.color || "rgba(255, 255, 255, 0.65)";
      ctx.globalAlpha = pct;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(0, 0, effect.radius || 82, -0.42, 0.42);
      ctx.stroke();
      ctx.restore();
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
  const tint = biome.lighting?.tint || "rgba(12, 28, 23, 0.14)";

  ctx.save();
  ctx.fillStyle = tint;
  ctx.fillRect(visible.x, visible.y, visible.w, visible.h);
  ctx.globalCompositeOperation = "lighter";
  addLight(state.player.x, state.player.y, 190, biome.lighting?.playerLight || "rgba(255, 238, 176, 0.28)");

  for (const chunk of state.world.nearbyChunks(state.player.x, state.player.y, 2)) {
    for (const prop of chunk.props) {
      const glow = chunk.biomeProfile.lighting?.glow || 1;
      if (prop.type === "mushroom") addLight(prop.x, prop.y, 86 * glow, "rgba(255, 105, 216, 0.18)");
      if (prop.type === "spore") addLight(prop.x, prop.y, 70 * glow, "rgba(102, 239, 239, 0.18)");
      if (prop.type === "slimePuddle") addLight(prop.x, prop.y, 74, "rgba(84, 232, 128, 0.14)");
      if (prop.type === "flower") addLight(prop.x, prop.y, 42, "rgba(255, 228, 91, 0.11)");
      if (prop.type === "iceCrystal") addLight(prop.x, prop.y, 78 * glow, "rgba(150, 235, 255, 0.18)");
      if (prop.type === "crystalCluster") addLight(prop.x, prop.y, 104 * glow, "rgba(146, 119, 255, 0.22)");
      if (prop.type === "lavaCrack" || prop.type === "burnedTree") addLight(prop.x, prop.y, 88, "rgba(255, 104, 49, 0.18)");
    }
    for (const hazard of chunk.hazards) {
      if (hazard.type === "lavaCrack") addLight(hazard.x, hazard.y, hazard.radius * 2.5, "rgba(255, 94, 43, 0.25)");
      else if (hazard.type === "poisonGas") addLight(hazard.x, hazard.y, hazard.radius * 2.1, "rgba(142, 241, 94, 0.14)");
      else if (hazard.type === "ice") addLight(hazard.x, hazard.y, hazard.radius * 1.8, "rgba(185, 244, 255, 0.12)");
      else addLight(hazard.x, hazard.y, hazard.radius * 2.2, "rgba(92, 239, 132, 0.13)");
    }
  }

  for (const projectile of [...state.projectiles, ...state.enemyProjectiles]) {
    addLight(projectile.x, projectile.y, (projectile.effect === "fireTooth" ? 115 : 72) * (projectile.glow || 1), projectile.color + "88");
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

function drawWeatherOverlay() {
  if (!state.started) return;
  const biome = currentBiome();
  const weather = biome.weather;
  const visibility = biome.gameplayModifiers?.visibility || 1;
  const time = performance.now() / 1000;
  ctx.save();
  if (visibility < 0.92) {
    ctx.fillStyle = `rgba(220, 228, 230, ${Math.min(0.22, (1 - visibility) * 0.46)})`;
    ctx.fillRect(0, 0, state.viewport.width, state.viewport.height);
  }
  if (weather === "snowstorm") {
    ctx.strokeStyle = "rgba(235, 250, 255, 0.55)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 48; i += 1) {
      const x = (i * 79 + time * 72) % state.viewport.width;
      const y = (i * 41 + time * 170) % state.viewport.height;
      line(x, y, x - 13, y + 18);
    }
  } else if (weather === "dust storm" || weather === "heatwave") {
    ctx.strokeStyle = weather === "dust storm" ? "rgba(230, 194, 124, 0.34)" : "rgba(255, 198, 117, 0.22)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 34; i += 1) {
      const x = (i * 113 + time * 115) % state.viewport.width;
      const y = (i * 37 + Math.sin(time + i) * 18) % state.viewport.height;
      line(x, y, x + 42, y + 5);
    }
  } else if (weather === "glowing spores") {
    ctx.fillStyle = "rgba(120, 244, 255, 0.28)";
    for (let i = 0; i < 32; i += 1) {
      const x = (i * 97 + Math.sin(time + i) * 20) % state.viewport.width;
      const y = (i * 59 + time * 18) % state.viewport.height;
      circle(x, y, 2 + (i % 3));
    }
  } else if (weather === "high wind") {
    ctx.strokeStyle = "rgba(215, 236, 255, 0.24)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 28; i += 1) {
      const x = (i * 131 + time * 180) % state.viewport.width;
      const y = (i * 53 + time * 22) % state.viewport.height;
      line(x, y, x + biome.wind.x * 58, y + biome.wind.y * 22);
    }
  } else if (weather === "fog") {
    ctx.fillStyle = "rgba(210, 216, 222, 0.13)";
    for (let i = 0; i < 8; i += 1) {
      ctx.beginPath();
      ctx.ellipse(
        ((i * 173 + time * 16) % (state.viewport.width + 160)) - 80,
        70 + i * 64,
        130,
        26,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }
  ctx.restore();
}

function renderHotbar() {
  if (!hotbarEl) return;
  hotbarEl.innerHTML = "";
  state.player.hotbar.forEach((stack, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `hotbar-slot${index === state.player.selectedHotbar ? " selected" : ""}`;
    button.dataset.slot = String(index);
    const number = document.createElement("span");
    number.className = "slot-number";
    number.textContent = String(index + 1);
    button.append(number);
    if (stack) {
      const def = itemDef(stack.id);
      const icon = document.createElement("span");
      icon.className = "slot-icon";
      icon.style.background = def.color;
      const name = document.createElement("span");
      name.className = "slot-name";
      name.textContent = def.name;
      button.append(icon, name);
      if (stack.quantity > 1) {
        const qty = document.createElement("span");
        qty.className = "slot-qty";
        qty.textContent = String(stack.quantity);
        button.append(qty);
      }
    }
    button.addEventListener("click", () => {
      state.player.selectedHotbar = index;
      renderHotbar();
    });
    hotbarEl.append(button);
  });
}

function renderInventoryPanel() {
  if (!inventoryPanel || !inventoryGrid || !inventoryHotbar || !inventoryDetails) return;
  inventoryGrid.innerHTML = "";
  inventoryHotbar.innerHTML = "";

  state.player.inventorySlots.forEach((stack, index) => {
    inventoryGrid.append(renderInventorySlot(stack, index, "inventory"));
  });
  state.player.hotbar.forEach((stack, index) => {
    inventoryHotbar.append(renderInventorySlot(stack, index, "hotbar"));
  });

  const selected = selectedHotbarStack();
  const def = selected ? itemDef(selected.id) : null;
  inventoryDetails.textContent = def
    ? `Selected: ${def.name} x${selected.quantity} | ${def.type} | ${def.description || ""}`
    : "Selected: empty hotbar slot";
}

function renderInventorySlot(stack, index, source) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `inventory-slot${source === "hotbar" && index === state.player.selectedHotbar ? " selected" : ""}`;
  button.dataset.slot = String(index);
  if (stack) {
    const def = itemDef(stack.id);
    const icon = document.createElement("span");
    icon.className = "slot-icon";
    icon.style.background = def.color;
    const name = document.createElement("span");
    name.className = "slot-name";
    name.textContent = def.name;
    button.append(icon, name);
    if (stack.quantity > 1) {
      const qty = document.createElement("span");
      qty.className = "slot-qty";
      qty.textContent = String(stack.quantity);
      button.append(qty);
    }
  }
  button.addEventListener("click", () => {
    if (source === "hotbar") {
      state.player.selectedHotbar = index;
    } else if (stack) {
      const selected = state.player.selectedHotbar;
      const oldHotbar = state.player.hotbar[selected];
      state.player.hotbar[selected] = stack;
      state.player.inventorySlots[index] = oldHotbar;
      recountResourceInventory();
    }
    renderHotbar();
    renderInventoryPanel();
  });
  return button;
}

function setInventoryOpen(open) {
  state.inventoryOpen = open;
  inventoryPanel?.classList.toggle("hidden", !open);
  if (open) renderInventoryPanel();
}

function updateHud() {
  const player = state.player;
  const weapon = activeWeapon();
  const biome = currentBiome();
  const held = activeItem();
  recountResourceInventory();
  healthText.textContent = `Health ${Math.ceil(player.hp)} / ${player.maxHp}`;
  levelText.textContent = `Level ${player.level} | XP ${Math.floor(player.xp)} / ${player.xpNext}`;
  weaponText.textContent = `Held: ${held?.name || "Empty Hand"}`;
  resourceText.textContent = RESOURCES.filter((name) => player.inventory[name] > 0)
    .map((name) => `${name}: ${player.inventory[name]}`)
    .join(" | ") || "Resources: none yet";
  const chunk = state.world.chunkCoords(player.x, player.y);
  const nearestCreature = nearbyCreatures()
    .filter((creature) => !creature.dead && !state.deadCreatures.has(creature.id))
    .map((creature) => ({ creature, dist: distance(creature, player) }))
    .sort((a, b) => a.dist - b.dist)[0]?.creature;
  const creatureDebug = nearestCreature?.profile ? [
    `Nearest creature: ${nearestCreature.profile.name}`,
    `Creature origin: ${nearestCreature.profile.originBiomeName} | can leave: ${nearestCreature.profile.canLeaveOriginBiome}`,
    `Creature body: ${nearestCreature.profile.bodyType} | move ${nearestCreature.profile.movementStyle} | attack ${nearestCreature.profile.attackStyle}`,
    `Creature behavior: ${nearestCreature.profile.temperament} | tameable ${nearestCreature.profile.isTameable ? nearestCreature.profile.tameItem : "no"} | hive ${nearestCreature.profile.hiveMindId || "none"}`
  ] : ["Nearest creature: none"];
  debugOverlay.textContent = [
    `Biome: ${biome.name}`,
    `Parts: ${biome.partLabels.join(" / ")}`,
    `Temperature: ${biome.temperature} | Climate: ${biome.climate}`,
    `Gravity: ${biome.gravity.label} (${biome.gravity.level})`,
    `Wind: ${Math.round(biome.wind.strength)} @ ${biome.wind.x.toFixed(2)}, ${biome.wind.y.toFixed(2)}`,
    `Density: creatures ${biome.creatureDensity.toFixed(2)} | plants ${biome.plantDensity.toFixed(2)} | resources ${biome.resourceDensity.toFixed(2)}`,
    `Modifiers: speed ${biome.gameplayModifiers.playerSpeed.toFixed(2)} | inertia ${biome.gameplayModifiers.inertia.toFixed(2)} | projectile ${biome.gameplayModifiers.projectileRange.toFixed(2)}x`,
    `Hazards: ${biome.hazards.length ? biome.hazards.join(", ") : "none"}`,
    `Creature bias: ${Object.keys(biome.creatureRules.bias).join(", ") || "none"}`,
    `Position: ${Math.round(player.x)}, ${Math.round(player.y)}`,
    `Chunk: ${chunk.cx}, ${chunk.cy}`,
    `Held: ${held?.name || "Empty Hand"}`,
    ...creatureDebug,
    `Multiplayer: ${state.connected ? "connected" : "offline"} ${state.snapshot ? state.snapshot.playerCount + " players" : ""}`,
    `World seed: ${state.worldSeed}`,
    `Opened chests: ${state.openedChests.size}`,
    `Defeated creatures: ${state.deadCreatures.size}`,
    `Dropped items: ${state.droppedItems.length}`
  ].join("\n");
  renderHotbar();
  if (state.inventoryOpen) renderInventoryPanel();
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
    if (state.inventoryOpen) {
      setInventoryOpen(false);
      return;
    }
    returnToMenu();
    return;
  }
  input.keys.add(event.code);
  if (!state.started) return;
  if (event.code === "KeyR") {
    setInventoryOpen(!state.inventoryOpen);
    return;
  }
  if (event.code === "Space") input.attackQueued = true;
  if (event.code === "KeyE") input.interactQueued = true;
  if (event.code === "KeyQ") {
    dropHotbarSlot(state.player.selectedHotbar);
    return;
  }
  if (event.code === "KeyC") craftingPanel.classList.toggle("hidden");
  if (/^Digit[1-9]$/.test(event.code)) {
    const index = Number(event.code.slice(-1)) - 1;
    if (event.shiftKey || input.mouse.down) {
      dropHotbarSlot(index, event.shiftKey);
    } else {
      state.player.selectedHotbar = index;
      renderHotbar();
    }
  }
});
window.addEventListener("keyup", (event) => input.keys.delete(event.code));
canvas.addEventListener("mousemove", (event) => {
  input.mouse.x = event.clientX;
  input.mouse.y = event.clientY;
});
canvas.addEventListener("mousedown", () => {
  if (!state.started) return;
  for (let index = 0; index < 9; index += 1) {
    if (input.keys.has(`Digit${index + 1}`)) {
      dropHotbarSlot(index);
      return;
    }
  }
  input.mouse.down = true;
  input.attackQueued = true;
  input.pickupQueued = true;
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
