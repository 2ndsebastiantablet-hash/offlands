# Offlands

Top-down 2D multiplayer open-world survival prototype. Explore strange generated chunks, fight random creatures made from parts, open chests, collect resources, craft weapons, and level up.

## Run Locally

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

The same Worker serves the frontend, API, WebSocket route, and Durable Object multiplayer rooms.

## How To Play

1. Open the local URL.
2. Use the main menu to enter a player name.
3. Press `Play`, choose `Single Player`, or open `Multiplayer` to browse/create servers.
4. Use `Esc` to return to the menu.

Controls:

- `WASD` or arrow keys: move
- Mouse: aim/facing direction
- `Space`: attack or use the selected hotbar item
- Click a nearby dropped item/resource: pick it up
- Click a nearby chest: open it
- Click a nearby creature: identify it and add it to the Creature Codex
- `1`-`9`: select hotbar slot
- `Shift` + number: drop from that hotbar slot
- `E`: toggle full inventory
- `Q`: toggle Creature/Item Codex
- `F`: toggle the Crafting Octagon
- `C`: toggle the old simple crafting panel
- `F3`: toggle debug overlay

## Multiplayer Template Source

The multiplayer foundation is adapted from:

- repo: `2ndsebastiantablet-hash/fly-game`
- commit: `389610aa69a18eb56eadb228520a5f4dfd33109d`
- folder: `multiplayer-template`

Used/adapted pieces:

- `backend/lobby-manager.js`
- `backend/rate-limit.js`
- `backend/realtime-server.js`
- `backend/server-authority.js`
- `backend/server.js`
- `backend/utils.js`
- `public/frontend/multiplayer-client.js`
- `wrangler.toml`

## Prototype Systems

- centered 16:9 browser game window with an animated OFFLANDS title, mode select, public server browser, and create-server screens
- nostalgic CSS/canvas presentation filter
- canvas radial-gradient lighting around players, glowing props, projectiles, spores, slime, and fire effects
- upright prop rendering rules so trees, mushrooms, chests, skulls, bushes, huts, and dead bushes do not rotate sideways
- cleaner gameplay HUD with biome/controls details kept in the F3 debug overlay
- white pickup outlines and proximity glow for dropped items, resources, creature drops, and other collectible items
- finite 12x12 chunk worlds pregenerated from the world seed before play, with visible world borders
- reduced enemy density with safer starting chunks, sparse/empty low-spawn biomes, and capped dangerous chunks
- ten-heart health UI with compact level/XP and held item readouts
- top-down movement and mouse aim
- public/private/code multiplayer lobbies with WebSocket player sync
- chunked deterministic finite world generation from a shared seed
- modular biome profiles built from terrain, climate, gravity, life density, hazard, creature, resource, and lighting parts
- biome gameplay effects for wind, low/heavy/zero gravity, weather visibility, resource density, hazards, creature density, creature part bias, movement, and projectile range
- deep creature profiles with origin biome rules, body/head/face details, movement style, attack style, temperament, tameability, hive mind IDs, tiers, invincible variants, and loot tables
- creature body types including caterpillar, bat, crocodile, slime, spider, worm, bird, frog, skull, plant, crystal, bone beast, floating orb, tiny bug, and giant heavy forms
- hostile, neutral, friendly, tameable, tamed follower, hive mind, flying, fast, tanky, and rare near-invincible creature foundations
- melee, ranged, laser, spore, poison, fire, spike, charge, swipe, hive signal, burn, slow, and knockback combat hooks
- Creature Codex with clickable creature inspection, preview images, origin biome data, behavior traits, tameability, and known drops
- Item Codex with discovered item categories, rarity, effects, stack sizes, spawn sources, crafting tags, and interactions
- deep item registry with food, weapons, guns, spell books, armor/equipment, followers/summons, creature materials, transformation pieces, and weird utility items
- temporary buffs, passive equipment, active items, spell effects, follower summons, armor protection, and teleport/push/pull/cloud hooks
- Crafting Octagon with eight input points, data-driven combinations, non-consumed preview ingredients, and center-result crafting
- structure foundation with huts, crystal shrines, bone gates, poison wells, spell towers, and broken cat statues that spawn rare items
- placeholder boss foundation with a rare structure boss, special profile data, larger stats, and special drops
- flexible creature loot tables with physical drops such as Wing Scraps, Silk, Poison Sac, Scales, Teeth, Meat, Crystals, Ash, and Glow Spores
- chests with biome-tinted loot and shared opened state
- expanded weapons including Stick Sword, Bone Club, Slime Gun, Eye Wand, Fire Tooth, Bone Sword, Pineapple Gun, Teleport Gun, Bone Pistol, Crystal Rifle, Orange Launcher, Crystal Light Wand, and Ultra Wand
- Minecraft-style 9-slot hotbar, full inventory panel, stacked resources/consumables, item dropping, dropped item pickup, crafting, XP, level ups, and optional debug overlay
- draggable inventory, codex, creature info, simple crafting, and Crafting Octagon panels

## Cloudflare Notes

`wrangler.toml` serves static assets from `./public` at the root URL `/`, with `backend/server.js` still handling API and WebSocket routes.

Important settings:

```toml
main = "backend/server.js"

[assets]
directory = "./public"
binding = "ASSETS"
not_found_handling = "single-page-application"
```

Deploy later with:

```bash
npm run deploy
```

## Current Limitations

- Enemy AI, taming, hive behavior, creature/item codex discoveries, followers, buffs, structures, bosses, and dropped loot are client-side for the prototype. Creature deaths are synced through the shared room state, but full authoritative enemy simulation is a later step.
- Chest opened state is synced and persisted per room, but loot granting is local to the opener.
- Dropped items and each player's full inventory are local for this pass; the data shape is ready to sync later.
- Multiplayer uses template lobbies, not accounts, matchmaking, or persistent profiles.
- Art is intentionally simple canvas shapes with no copyrighted assets.
