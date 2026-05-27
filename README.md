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
3. Press `Play` for solo mode, or join/create a multiplayer lobby first.
4. Use `Esc` to return to the menu.

Controls:

- `WASD` or arrow keys: move
- Mouse: aim
- Left click or `Space`: attack
- `E`: pick up resources or open nearby chests
- `1`-`5`: switch weapons
- `C`: toggle crafting
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

- centered 16:9 browser game window with a main menu
- nostalgic CSS/canvas presentation filter
- canvas radial-gradient lighting around players, glowing props, projectiles, spores, slime, and fire effects
- upright prop rendering rules so trees, mushrooms, chests, skulls, bushes, huts, and dead bushes do not rotate sideways
- top-down movement and mouse aim
- public/private/code multiplayer lobbies with WebSocket player sync
- chunked deterministic world generation from a shared seed
- Green Wildlands, Purple Mushroom Field, and Bone Desert biomes
- random creatures assembled from 10 mechanical/visual parts
- melee, ranged, laser, spore, burn, slow, and knockback combat hooks
- chests with biome-tinted loot and shared opened state
- five weapons: Stick Sword, Bone Club, Slime Gun, Eye Wand, Fire Tooth
- inventory/hotbar, resources, crafting, XP, level ups, and optional debug overlay

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

- Enemy AI is client-side for the prototype. Creature deaths are synced through the shared room state, but full authoritative enemy simulation is a later step.
- Chest opened state is synced and persisted per room, but loot granting is local to the opener.
- Multiplayer uses template lobbies, not accounts, matchmaking, or persistent profiles.
- Art is intentionally simple canvas shapes with no copyrighted assets.
