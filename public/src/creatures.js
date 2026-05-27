import { BIOMES, CREATURE_PARTS } from "./data.js";
import { choose, maybe } from "./random.js";

const OPTIONAL_CHANCE = {
  head: 0.72,
  eye: 0.68,
  arms: 0.58,
  movement: 0.5,
  skin: 0.38
};

export function generateCreatureSpec(rng, biomeId, id, x, y) {
  const biome = BIOMES[biomeId] || BIOMES.wildlands;
  const parts = {
    body: choose(rng, weightedBodies(rng, biome))
  };

  for (const category of ["head", "eye", "arms", "movement", "skin"]) {
    if (maybe(rng, OPTIONAL_CHANCE[category])) {
      parts[category] = choose(rng, weightedParts(category, biome));
    }
  }

  const stats = calculateStats(parts, biomeId);
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
    laserTimer: 500 + rng() * 1200,
    sporeTimer: 900 + rng() * 1600,
    burnTimer: 0,
    slowTimer: 0,
    hurtTimer: 0,
    dead: false,
    name: nameCreature(parts),
    parts,
    biomeId,
    ...stats,
    hp: stats.maxHp
  };
}

function weightedBodies(rng, biome) {
  if (biome.id === "desert" && rng() < 0.62) return [CREATURE_PARTS.body[1]];
  if (biome.id === "mushroom" && rng() < 0.58) return [CREATURE_PARTS.body[0]];
  return CREATURE_PARTS.body;
}

function weightedParts(category, biome) {
  const parts = CREATURE_PARTS[category];
  if (biome.id === "mushroom" && category === "head") return [parts[1], parts[1], parts[0]];
  if (biome.id === "mushroom" && category === "eye") return [parts[0], parts[0], parts[1]];
  if (biome.id === "desert" && category === "head") return [parts[0], parts[0], parts[1]];
  if (biome.id === "desert" && category === "movement") return [parts[1], parts[1], parts[0]];
  return parts;
}

export function calculateStats(parts, biomeId) {
  let maxHp = parts.body.health;
  let speed = parts.body.speed;
  let damage = parts.body.damage;
  let defense = 0;
  let detection = biomeId === "desert" ? 240 : 220;
  let aggression = 1;

  for (const part of Object.values(parts)) {
    if (!part) continue;
    maxHp += part.health || 0;
    speed += part.speed || 0;
    damage += part.damage || 0;
    defense += part.defense || 0;
    detection += part.detect || 0;
    aggression *= part.aggression || 1;
  }

  return {
    maxHp: Math.max(16, Math.round(maxHp)),
    speed: Math.max(30, speed),
    damage: Math.max(4, damage),
    defense: Math.min(0.55, defense),
    detection,
    aggression,
    flying: Boolean(parts.movement?.flying),
    laser: Boolean(parts.eye?.laser),
    spore: Boolean(parts.head?.spore),
    clawed: Boolean(parts.arms?.melee),
    xp: Math.round(12 + maxHp * 0.32 + damage)
  };
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
  const bob = creature.flying ? Math.sin(performance.now() / 210 + creature.x * 0.01) * 5 : 0;
  const bodyColor = creature.parts.body.color;
  const head = creature.parts.head;
  const eye = creature.parts.eye;
  const arms = creature.parts.arms;
  const move = creature.parts.movement;
  const skin = creature.parts.skin;

  ctx.save();
  ctx.translate(sx, sy + bob);
  ctx.scale(scale, scale);
  ctx.globalAlpha = creature.hurtTimer > 0 ? 0.65 : 1;

  if (move?.id === "wings") {
    ctx.fillStyle = move.color;
    ctx.globalAlpha *= 0.72;
    ellipse(ctx, -22, -3, 22, 10, -0.45);
    ellipse(ctx, 22, -3, 22, 10, 0.45);
    ctx.globalAlpha = creature.hurtTimer > 0 ? 0.65 : 1;
  }

  ctx.fillStyle = bodyColor;
  if (creature.parts.body.id === "bugBody") {
    ellipse(ctx, 0, 2, 22, 15, 0);
    ctx.fillStyle = "#1b2230";
    for (let i = -1; i <= 1; i += 1) {
      rect(ctx, -22, i * 8, 13, 3, 2);
      rect(ctx, 9, i * 8, 13, 3, 2);
    }
  } else {
    blob(ctx, 0, 2, 24, 20);
  }

  if (skin) {
    ctx.strokeStyle = skin.color;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 2, 24, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (head) {
    ctx.fillStyle = head.color;
    if (head.id === "skullHead") {
      roundRect(ctx, -14, -28, 28, 22, 8);
      ctx.fillStyle = "#1b2230";
      ellipse(ctx, -6, -20, 4, 5, 0);
      ellipse(ctx, 6, -20, 4, 5, 0);
    } else {
      ellipse(ctx, 0, -25, 19, 10, 0);
      ctx.fillStyle = "#f9e8ff";
      ellipse(ctx, -7, -26, 3, 2, 0);
      ellipse(ctx, 8, -23, 2, 2, 0);
    }
  }

  if (eye?.id === "oneEye") {
    ctx.fillStyle = "#ffffff";
    ellipse(ctx, 0, -6, 8, 8, 0);
    ctx.fillStyle = eye.color;
    ellipse(ctx, 0, -6, 4, 4, 0);
  } else if (eye?.id === "threeEyes") {
    ctx.fillStyle = "#ffffff";
    for (const x of [-9, 0, 9]) ellipse(ctx, x, -7, 5, 5, 0);
    ctx.fillStyle = eye.color;
    for (const x of [-9, 0, 9]) ellipse(ctx, x, -7, 2, 2, 0);
  }

  if (arms?.id === "claws") {
    ctx.strokeStyle = arms.color;
    ctx.lineWidth = 4;
    line(ctx, -20, 0, -35, 12);
    line(ctx, 20, 0, 35, 12);
  }

  if (move?.id === "threeFeet") {
    ctx.fillStyle = move.color;
    ellipse(ctx, -12, 22, 7, 5, 0);
    ellipse(ctx, 0, 25, 7, 5, 0);
    ellipse(ctx, 12, 22, 7, 5, 0);
  }

  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.font = "11px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(creature.name, 0, -42);
  healthBar(ctx, -22, -37, 44, 5, creature.hp / creature.maxHp);
  ctx.restore();
}

function healthBar(ctx, x, y, w, h, pct) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = pct > 0.5 ? "#76e06f" : pct > 0.25 ? "#ffd45b" : "#ff5d57";
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, pct)), h);
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
