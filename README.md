# Ants vs Marbles

A canvas-based tower-defense game built with vanilla TypeScript. There is no UI framework or runtime dependency.

## Run locally

Requires Node.js **22.12 or newer** and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite, usually `http://127.0.0.1:5173`.
The source now uses ES modules: opening the HTML file directly is no longer supported.
The game supports touch input. Landscape phones and tablets get a compact layout with large
controls beside or below the board; portrait phones show the desktop page with a hint to rotate.
The canvas is drawn at the screen's pixel density, so it stays sharp on high-density displays.

```sh
npm run check   # Strict type checking, regression tests, and formatting checks
npm run build   # Type check and produce a static site in dist/
npm run preview # Serve that production build locally
npm run format # Apply the shared formatting rules
```

Under `npm run dev`, **F2** toggles debug mode (free placement, no cooldowns, ant spawn buttons). It is not available in the production build.

Deploy the contents of `dist/` to a static web host. The production build uses relative asset URLs so it can also be hosted under a subdirectory. Pushes to `master` are deployed automatically by `.github/workflows/deploy.yml`, which uploads the build output over SSH to the host configured in the repository secrets.

## Where things live

| Location                                                       | Responsibility                                                                        |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [index.html](./index.html), [src/styles.css](./src/styles.css) | Page structure and responsive presentation                                            |
| [src/main.ts](./src/main.ts)                                   | Browser startup, animation loop, and development cleanup                              |
| [src/game/types.ts](./src/game/types.ts)                       | Entity models, game state, and integration boundaries                                 |
| [src/game/constants.ts](./src/game/constants.ts)               | Board geometry, physics, timings, and damage constants                                |
| [src/game/definitions.ts](./src/game/definitions.ts)           | Marble/track catalogs, ant stats, and campaign unlocks                                |
| [src/game/game.ts](./src/game/game.ts)                         | Creating/resetting games and generating invasion schedules                            |
| [src/game/simulation.ts](./src/game/simulation.ts)             | Frame orchestration, spawning, the Ant Eater, pickups, effects, and victory           |
| [src/game/marbles.ts](./src/game/marbles.ts)                   | Marble contact, movement, track interactions, abilities, and projectiles              |
| [src/game/ants.ts](./src/game/ants.ts)                         | Emergence, movement, chewing, jumping/burrowing, spitters, and Queen brood            |
| [src/game/combat.ts](./src/game/combat.ts)                     | Entity spawning, damage, explosions, shards, and death snapshots                      |
| [src/game/actions.ts](./src/game/actions.ts)                   | Player actions: purchases, glove, pause, selection, and notifications                 |
| [src/game/preferences.ts](./src/game/preferences.ts)           | Saved progress, tutorial completion, and marble-style preferences                     |
| [src/game/tutorial.ts](./src/game/tutorial.ts)                 | Guided tutorial steps and their completion checks                                     |
| [src/rendering/](./src/rendering/)                             | Canvas painting, split into board, marbles, ants, tracks, effects, HUD and controls   |
| [src/ui/](./src/ui/)                                           | Hit areas, the desktop/compact viewport layouts, menus, and pointer/keyboard handlers |
| [tests/](./tests/)                                             | Behavioral regression tests and original-game fixtures                                |
| [SPEC.md](./SPEC.md)                                           | Gameplay reference and controls                                                       |

## How the pieces fit

Each game has an explicit `Game` object containing its current state, preferences, random-number source and preference store. There are no shared mutable game globals, and every timer runs on game time, so pausing freezes everything. Tests can create independent games without a canvas, browser, real timers, or local storage.

`updateGame(game, deltaSeconds)` advances the simulation. Its order is intentional:

1. Timers and track pulses.
2. Glass shards and the Ant Eater.
3. Cooldowns, crumb drops, and scheduled ant spawns.
4. Marbles, then projectiles, then ants.
5. Defeated-ant removal and transient animation/pickup updates.
6. Victory and campaign unlocking.

Marbles update **lowest first** so they can queue behind another marble being chewed. Ants added by the Queen are processed during that same ant-update pass. Changing these orders can change gameplay.

`renderGame(view)` paints the current state through a `RenderContext` containing the game and drawing context. Desktop drawing uses fixed 900×700 game units; compact layouts use viewport-sized logical coordinates. `main.ts` sizes the canvas backing store to its logical display size times `devicePixelRatio` every frame. Use `CANVAS_WIDTH`/`CANVAS_HEIGHT`, never `canvas.width`/`canvas.height`, for desktop layout. Rendering does not advance gameplay or modify game state. Pointer and keyboard listeners call the same exported action/input functions used by tests; their cleanup is registered with Vite's hot-reload lifecycle.

Living ants show health bars above their bodies regardless of maximum health, including the reduced-health campaign variants. Bars stay hidden while ants emerge or burrow.

### Making a change

- **Balance or unlocks:** start with the catalogs and campaign definitions.
- **A marble ability or track interaction:** use the named steps in the marble simulation; update the associated drawing code separately.
- **An ant behavior:** start in the ant simulation and combat helpers.
- **A visual change:** work in the appropriate renderer. `drawMarble`/`drawAnt` also accept lightweight appearances for toolbar/menu previews.
- **A menu or control:** edit menu definitions or input handlers, keeping hit areas in the shared layout module.
- **A new entity type:** update its union type and catalog, implement its behavior/rendering, and add tests.

Internal type IDs are preserved from the original game: marble `red` means **Shooter**, marble `blue` means **Frost**, and ant `red` means **Fire Ant**. UI names live in the catalogs.

## Regression tests

The baseline fixture was captured from the original single-file implementation at commit `ec90369`, using a seeded random-number generator. Tests compare all ant types, marble physics/combat, and every campaign schedule against those saved results. Additional tests cover track thresholds, armor, special ants, death cleanup, input, glove behavior, pause, saves, and victory/defeat.

Do **not** regenerate the baseline from the refactored engine just to make a failure pass. An intentional gameplay change should update its focused tests and expected baseline values together, with an explanation of the changed behavior.

The Twin's second projectile retains the original 160 ms delayed-callback behavior. Its scheduler is injectable so tests can execute that callback deterministically without waiting for real time.

## Saved games

The existing local-storage keys are preserved: `avm_marble_style` and `avm_unlocked`. `avm_tutorial_done` records that the tutorial has been finished or skipped. Browser storage belongs to an **origin**: progress saved when opening the old file directly may not appear automatically at the new localhost URL or a different port. It is not deleted.

Unavailable storage is reported in the console and uses session-only preferences. Failed writes also show an in-game notification rather than silently claiming progress was saved.
