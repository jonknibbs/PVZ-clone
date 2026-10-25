# Ants vs Marbles — Specification

A browser tower-defence game in the style of Plants vs Zombies. Ants climb a marble maze from the exit; the player defends by dropping different types of marbles into the maze.

- **Implementation:** HTML5 canvas with vanilla TypeScript modules and Vite; no runtime framework or dependencies.
- **Run:** `npm ci`, then `npm run dev`. See [README.md](./README.md) for setup, code organization, testing, and production builds. Opening the source HTML directly is no longer supported.

## 1. Objective

- **Lose:** any ant reaches the top of the maze.
- **Win:** the whole invasion schedule has spawned (including the final boss) and all ants are dead.

## 2. Playfield

- Vertical maze of **5 lanes** (100 px wide, 540 px long). Canvas is 900×700.
- **Top:** the marble chute (red line). Marbles are dropped in from here.
- **Bottom:** the exit, where ants enter. Marbles stop at the exit.
- Top bar: crumb counter, marble selector (12 slots incl. track pieces), eater, glove.
- Left side: invasion progress bar. Once the schedule is exhausted it reads **ANTS LEFT: n** so the final Queen is accounted for.
- On phones, tap the canvas to use controls. Landscape phones and tablets get a compact layout with large controls beside or below the board (see §8).

## 3. Resources — Crumbs

- Start with **150**.
- Crumbs fall from the sky every 7–10 s (worth 25, vanish after 10 s); click or tap to collect.
- Gold marbles also produce crumbs (see below).

## 4. Marbles (defenders)

Each marble has a cost, health, cooldown (after placing one, that type is unavailable for a while) and a mass used for drop damage.

| Marble  | Key | Cost | HP  | Cooldown | Mass | Behaviour                                                                                                                                                                                                                                     |
| ------- | --- | ---- | --- | -------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gold    | 1   | 50   | 100 | 5 s      | 3    | Drops a 25-crumb pickup every 10 s                                                                                                                                                                                                            |
| Shooter | 2   | 100  | 100 | 5 s      | 3    | Fires a shot (25 dmg) down its lane every 1.4 s while an ant is below it                                                                                                                                                                      |
| Frost   | 3   | 175  | 100 | 5 s      | 3    | Like Shooter, 20 dmg and slows the ant 50% for 3 s                                                                                                                                                                                            |
| Twin    | 4   | 200  | 100 | 5 s      | 5    | Fires two shots (25 dmg each) per volley                                                                                                                                                                                                      |
| Steel   | 5   | 50   | 900 | 15 s     | 8    | Tough wall, heaviest drop damage                                                                                                                                                                                                              |
| Bomb    | 6   | 150  | 1   | 25 s     | 2    | Explodes 0.8 s after touching an ant (or immediately if killed): kills every ant (including boss and armored) within 1.6 lanes sideways and 130 px vertically                                                                                 |
| Glass   | 7   | 75   | 1   | 8 s      | 4    | Shatters the moment it stops (lands on an ant or reaches the exit), doing normal drop damage. Leaves 8 shards across the lane; each cuts ants crawling over it for 14 dmg/s (ignores armor), lasts 30 s and wears out after dealing 90 damage |

### 4.1 Placing and rolling

- Select a marble (click slot or press 1–7), then click a lane. The marble is dropped from the **clicked height** (clamped to between the chute and just above the exit).
- It cannot be placed if unaffordable or on cooldown; either way the game says why.
- Marbles do not collide with each other and can overlap freely.
- Marbles accelerate while falling (500 px/s², max 420 px/s, starting 75 px/s) toward the exit.
- A marble stops when it reaches the exit or touches an ant. Marbles pass through each other, **except** that they queue up (about 54 px apart) behind a marble that is stopped by an ant being chewed, until that marble dies or the ant is killed.
- Marbles are destroyed when HP reaches 0.

### 4.2 Drop (impact) damage

If a marble lands on an ant while still falling:

`damage = round(mass × fallDistance / 100)`

Higher drops and heavier marbles hurt more. Damage is shown as a floating number. The distance counts only the original drop, not later rolling.

### 4.4 Glove

Toggle with the glove button or **G**. Click a marble or track piece to pick it up, then click a lane/height to put it down (free). Marbles put down start rolling again with no drop damage. After putting an item down the glove has an **8 s cooldown** (shown on the button). Esc / right-click returns the held item without triggering the cooldown.

## 4a. Track pieces

Placed in a lane at the clicked height (same selector bar, keys 8, 9, 0, - and =). Ants ignore them. Pieces trigger every time a marble passes over them while moving downward, so marbles can loop through a route indefinitely (e.g. ramp right → ramp left → spring). A piece re-arms for a marble once it has moved away from it.

| Piece  | Key | Cost | Cooldown | Effect                                                                                                                                                                                                                       |
| ------ | --- | ---- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spring | 8   | 75   | 2 s      | Launches a marble back up to the top of the maze; it then falls again and gets a fresh drop for impact damage. With no tool selected, click a placed spring to cycle its strength (1–4 bars), which sets how high it bounces |
| Ramp ◀ | 9   | 25   | 1 s      | Slides a marble into the lane to the left (not placeable in the leftmost lane)                                                                                                                                               |
| Ramp ▶ | 0   | 25   | 1 s      | Slides a marble into the lane to the right (not placeable in the rightmost lane)                                                                                                                                             |
| Boost  | -   | 60   | 2 s      | Accelerates a marble to 720 px/s (normal max 420) until it stops. A boosted marble that hits an ant gets +250 px of effective fall distance and ×1.5 impact damage                                                           |
| Ring   | =   | 100  | 2 s      | Pays out 2 crumbs every time a marble drops through it                                                                                                                                                                       |

Pieces can be chained to build routes and loops (e.g. ramp across, spring back up). Pieces can't be placed within 44 px of another piece in the same lane.

## 4b. Ant Eater (special weapon)

- Button in the top bar or key **E**. Free, but has a **90 s cooldown** (first available after 20 s).
- An anteater appears in every lane at the exit and sweeps up the maze (230 px/s), eating **every ant** it passes, including the boss. Ants that spawn during the sweep are eaten too.
- Marbles are unaffected.

## 5. Ants (attackers)

Ants spawn head-first from a visible ant hill below the exit in a random lane, with soil hiding the underground body. Packs emerge one after another from the same hill rather than starting off-screen. Emergence takes 0.95 s (1.8 s for the giant Queen), then continues smoothly into climbing without resetting position. Emerging ants do not attack, block marbles, or take damage from shots, bombs, or shards; the Ant Eater can still eat them. The Queen's babies appear beside her rather than at the hills. When a marble blocks them they chew it (damage per second = `dmg`). Speeds below are in px/s before the global 0.8 speed scale.

| Ant                   | HP              | Speed | DPS         | Notes                                                                                                                                                                                                                    |
| --------------------- | --------------- | ----- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Basic                 | 100             | 9     | 20          | Standard                                                                                                                                                                                                                 |
| Fast                  | 60              | 18    | 15          | Small, quick                                                                                                                                                                                                             |
| Tank                  | 350             | 6     | 25          | Large                                                                                                                                                                                                                    |
| Jumper (green)        | 80              | 11    | 18          | Leaps over the first marble it meets (once)                                                                                                                                                                              |
| Armored (grey)        | 150 + 150 armor | 7     | 22          | Shots damage armor first (at 60%); bombs and drop damage ignore armor                                                                                                                                                    |
| Spitter (blue, shiny) | 90              | 8     | 15          | Stops 210 px away from a marble and spits venom every 2 s: 12 dmg + poison (7 dmg/s for 4 s)                                                                                                                             |
| Red                   | 600             | 3.5   | 90          | Huge, very slow, devastating bite                                                                                                                                                                                        |
| Swarm (brown)         | 30              | 14    | 8           | Tiny; arrives in packs of 5                                                                                                                                                                                              |
| Mite (tan)            | 14              | 26    | 5           | Very small and fast; arrives in packs of 9 (free play from the ~9th ant)                                                                                                                                                 |
| Digger (clay)         | 110             | 10    | 20          | When blocked by a marble it burrows for 1.4 s (immune to shots, bombs, shards, and passes under marbles) and resurfaces 170 px further up; can dig twice (free play from the ~15th ant)                                  |
| Boss                  | 1500            | 4     | 60          | Used as the campaign finale                                                                                                                                                                                              |
| Queen                 | 6000            | 3     | 70 per lane | Free-play finale: spans all 5 lanes, chews a marble in every lane at once, spawns 3 swarm babies every 5 s (max 45 ants on screen). Bombs deal 500, the Ant Eater 1200 (once per sweep), instead of killing her outright |

Slowed ants move at half speed.

Defeated ants and marbles play a short fade/impact animation before being removed from the playfield.

## 6. Wave schedule

- First ant at 20 s. Each following ant arrives after `max(2.2, 9 − 0.12 × i)` seconds, for **60 ants**, then the Queen 10 s after the last.
- Type is rolled per ant, unlocking as the game progresses: fast (from #7), jumper (#10), swarm (#13), tank (#16), red (#19), armored (#21), spitter (#26).
- Every 20th ant is accompanied by 4 extra basic ants.

## 6a. Game modes

The main menu offers **Campaign** and **Free Play** (the full-length game above, everything unlocked).

Campaign is 10 short levels (~1 minute each). Each level starts with an intro screen listing what is new; marbles, ants, the glove (level 1) and the Ant Eater (level 3) are introduced gradually, and the bar only shows what has been unlocked so far. Level 1 has only the Shooter marble and basic ants; level 10 ends with the Queen. Campaign ants walk 25% faster, start with reduced health that scales up per level, and crumbs fall faster than in free play. Winning unlocks the next level (progress saved in localStorage); a **Main menu** button is available during play, which asks for confirmation first. The mite, digger and giant Queen appear in free play only.

## 7. Controls

| Input                              | Action                                                       |
| ---------------------------------- | ------------------------------------------------------------ |
| Click bar slot / keys 1–9, 0, -, = | Select marble or track piece                                 |
| E / Ant Eater button               | Call the Ant Eater                                           |
| Click lane                         | Drop selected marble                                         |
| Click lane with no tool selected   | Cycle the strength of a spring already there                 |
| Click crumb                        | Collect                                                      |
| G                                  | Toggle glove                                                 |
| Right-click / Esc                  | Cancel selection                                             |
| P / Pause button (left panel)      | Pause / resume (freezes the whole game)                      |
| Main menu button (left panel)      | Ask to leave the run; Enter confirms, Esc keeps playing      |
| F2 / Debug button                  | Debug mode: infinite crumbs, no cooldowns, ant spawn buttons |
| Click on menu/win/lose screen      | Start / restart                                              |
| Arrow keys / Enter on a menu       | Move between menu buttons and press the focused one          |

Modifier keys are ignored, so browser shortcuts such as Cmd+1 or Ctrl+- are not read as game input. Hiding the tab or switching window pauses the game. A debug-mode win does not unlock the next campaign level, and leaving debug mode puts the real crumb count back.

## 8. Platform and display

- The canvas bitmap is scaled to `devicePixelRatio`, so the game is sharp on high-density screens. Game drawing uses logical 900×700 world coordinates.
- Touch is supported: tapping moves the placement preview as well as acting on the tap.
- **Desktop and laptop** keep the fixed 900×700 page: toolbar across the top, HUD to the left of the board.
- **Landscape phones** (viewport height ≤ 540 px) and **tablets** (coarse pointer, shorter side 600–1024 px) get the compact layout. The canvas fills the viewport, the board is drawn through a scaled viewport, and the controls move into a panel with tap targets of at least 44 px:
  - Landscape: utilities (crumbs, invasion, Ant Eater, glove, pause, main menu, debug) on the left, the board in the middle, a 3×4 item grid on the right.
  - Portrait tablets: the board on top, then the invasion bar, a row of utilities and a 6×2 item grid.
  - Menus are scaled to fit their panel region rather than the whole 900×700 world.
- Portrait phones keep the desktop page with a hint to rotate to landscape.
- Marble style and campaign progress are saved in `localStorage`; if storage is unavailable the game says so and keeps them for the session only.

## 9. Possible future work

- More marble types (e.g. magnet, bouncing, splash)
- Sound and music, high scores
- Campaign levels for the mite, digger and giant Queen, which are free-play only today
- A portrait phone layout; the compact layout could serve it, but the board would be very small
- Larger menu buttons on landscape phones, where the menu panel is height-limited
- Screen-reader support, which the canvas-only UI cannot offer
