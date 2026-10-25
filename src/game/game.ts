import { CAMPAIGN_DIFFICULTY, CAMPAIGN_LEVELS, ITEM_ORDER } from './definitions';
import { createMemoryPreferenceStore } from './preferences';
import type { AntType, CampaignLevel, Game, GameMode, PreferenceStore, SpawnEvent } from './types';

function createState(pointer = { x: 0, y: 0 }): Game['state'] {
  return {
    crumbs: 150,
    marbles: [],
    trackPieces: [],
    shards: [],
    deaths: [],
    heldItem: null,
    gloveActive: false,
    gloveCooldown: 0,
    anteater: null,
    anteaterCooldown: 20,
    ants: [],
    projectiles: [],
    crumbDrops: [],
    effects: [],
    elapsed: 0,
    selectedItem: null,
    cooldowns: {
      gold: 0,
      red: 0,
      blue: 0,
      twin: 0,
      steel: 0,
      bomb: 0,
      glass: 0,
      spring: 0,
      rampL: 0,
      rampR: 0,
      boost: 0,
      ring: 0,
    },
    nextCrumbIn: 4,
    crumbInterval: 7,
    crumbIntervalJitter: 3,
    screen: 'menu',
    paused: false,
    confirmQuit: false,
    debugUsed: false,
    pointer: pointer,
    menuFocus: null,
    spawnQueue: [],
    notification: null,
    invasionDuration: 0,
    availableItems: ITEM_ORDER.slice(),
    abilities: { glove: true, eater: true },
  };
}

export function createGame(
  options: {
    random?: () => number;
    preferenceStore?: PreferenceStore;
  } = {},
): Game {
  const preferenceStore = options.preferenceStore ?? createMemoryPreferenceStore();
  const game: Game = {
    state: createState(),
    mode: 'free',
    levelIndex: 0,
    debug: false,
    debugCrumbsBackup: null,
    preferences: preferenceStore.load(),
    preferenceStore,
    random: options.random ?? Math.random,
  };
  resetGame(game);
  return game;
}

export function resetGame(game: Game) {
  game.state = createState(game.state.pointer);
  game.debugCrumbsBackup = null;
  buildFreePlaySchedule(game);
}

export function startGame(game: Game, mode: GameMode, levelIndex: number) {
  game.mode = mode;
  game.levelIndex = levelIndex;
  resetGame(game);
  if (mode === 'campaign') {
    const level = CAMPAIGN_LEVELS[levelIndex];
    game.state.availableItems = level.availableItems.slice();
    game.state.abilities = { glove: level.glove, eater: level.eater };
    game.state.crumbs = level.crumbs;
    game.state.crumbInterval = 3.5;
    game.state.crumbIntervalJitter = 1.5;
    game.state.antHealthMultiplier = level.health;
    game.state.antSpeedMultiplier = CAMPAIGN_DIFFICULTY.speed;
    buildCampaignSchedule(game, level, levelIndex);
    game.state.screen = 'intro';
  } else {
    game.state.screen = 'play';
  }
}

export function buildCampaignSchedule(game: Game, level: CampaignLevel, index: number) {
  const schedule: SpawnEvent[] = [];
  const endTime = CAMPAIGN_DIFFICULTY.end(index);
  const spawnGap = CAMPAIGN_DIFFICULTY.gap(index);
  const pool: AntType[] = level.antTypes.filter((x) => x !== 'boss');
  const newTypes: AntType[] = level.newAntTypes.filter((x) => x !== 'boss');
  const total = Math.floor((endTime - 5) / spawnGap);
  const seen = new Set();
  let spawnTime = 5;
  let spawnIndex = 0;
  while (spawnTime < endTime) {
    let type = newTypes.find((antType) => !seen.has(antType) && spawnIndex >= total * 0.35);
    if (!type) {
      const weightedTypes: AntType[] = [];
      for (const antType of pool) {
        for (let weight = 0; weight < (newTypes.includes(antType) ? 3 : 1); weight++) {
          weightedTypes.push(antType);
        }
      }
      type = weightedTypes[Math.floor(game.random() * weightedTypes.length)];
    }
    if (!type) {
      throw new Error(`Campaign level "${level.name}" has no available ant types.`);
    }
    seen.add(type);
    schedule.push([spawnTime, type]);
    spawnIndex++;
    spawnTime += spawnGap * (0.8 + game.random() * 0.4);
  }
  if (level.boss) {
    spawnTime += 4;
    schedule.push([spawnTime, 'boss']);
  }
  game.state.spawnQueue = schedule;
  game.state.invasionDuration = spawnTime;
}

export function buildFreePlaySchedule(game: Game) {
  const schedule: SpawnEvent[] = [];
  let spawnTime = 20;
  for (let index = 0; index < 60; index++) {
    spawnTime += Math.max(2.2, 9 - index * 0.12);
    let type: AntType = 'basic';
    if (index > 6 && game.random() < 0.3) {
      type = 'fast';
    }
    if (index > 15 && game.random() < 0.25) {
      type = 'tank';
    }
    if (index > 9 && game.random() < 0.2) {
      type = 'jumper';
    }
    if (index > 20 && game.random() < 0.2) {
      type = 'armored';
    }
    if (index > 25 && game.random() < 0.2) {
      type = 'spitter';
    }
    if (index > 12 && game.random() < 0.12) {
      type = 'swarm';
    }
    if (index > 8 && game.random() < 0.14) {
      type = 'mite';
    }
    if (index > 14 && game.random() < 0.18) {
      type = 'digger';
    }
    if (index > 18 && game.random() < 0.15) {
      type = 'red';
    }
    schedule.push([spawnTime, type]);
    if (index > 0 && index % 20 === 0) {
      for (let extraIndex = 0; extraIndex < 4; extraIndex++) {
        schedule.push([spawnTime + extraIndex * 0.8, 'basic']);
      }
    }
  }
  schedule.push([spawnTime + 10, 'queen']);
  game.state.spawnQueue = schedule;
  game.state.invasionDuration = spawnTime + 10;
}
