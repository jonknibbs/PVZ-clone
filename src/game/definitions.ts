import type {
  AntDefinition,
  AntType,
  CampaignLevel,
  ItemCatalog,
  ItemType,
  LevelDefinition,
  QueenDefinition,
  TrackType,
} from './types';

export const ITEM_DEFINITIONS: ItemCatalog = {
  gold: {
    name: 'Gold',
    cost: 50,
    health: 100,
    color: '#f5c518',
    cooldown: 5,
    mass: 3,
    description: 'Makes crumbs',
  },
  red: {
    name: 'Shooter',
    cost: 100,
    health: 100,
    color: '#e53935',
    cooldown: 5,
    mass: 3,
    description: 'Shoots',
  },
  blue: {
    name: 'Frost',
    cost: 175,
    health: 100,
    color: '#42a5f5',
    cooldown: 5,
    mass: 3,
    description: 'Slows ants',
  },
  steel: {
    name: 'Steel',
    cost: 50,
    health: 900,
    color: '#9e9e9e',
    cooldown: 15,
    mass: 8,
    description: 'Tough wall, heavy drop',
  },
  bomb: {
    name: 'Bomb',
    cost: 150,
    health: 1,
    color: '#222',
    cooldown: 25,
    mass: 2,
    description: 'Explodes on contact',
  },
  glass: {
    name: 'Glass',
    cost: 75,
    health: 1,
    color: '#b3e5fc',
    cooldown: 8,
    mass: 4,
    description: 'Shatters on landing; shards cut ants',
  },
  twin: {
    name: 'Twin',
    cost: 200,
    health: 100,
    color: '#66bb6a',
    cooldown: 5,
    mass: 5,
    description: 'Shoots x2',
  },
  spring: {
    name: 'Spring',
    cost: 75,
    kind: 'piece',
    cooldown: 2,
    description: 'Track: bounces marbles back to the top',
  },
  rampL: {
    name: 'Ramp ◀',
    cost: 25,
    kind: 'piece',
    cooldown: 1,
    direction: -1,
    description: 'Track: slides marbles one lane left',
  },
  rampR: {
    name: 'Ramp ▶',
    cost: 25,
    kind: 'piece',
    cooldown: 1,
    direction: 1,
    description: 'Track: slides marbles one lane right',
  },
  boost: {
    name: 'Boost',
    cost: 60,
    kind: 'piece',
    cooldown: 2,
    description: 'Track: speeds marbles down; hits ants harder',
  },
  ring: {
    name: 'Ring',
    cost: 100,
    kind: 'piece',
    cooldown: 2,
    description: 'Track: marbles passing through earn crumbs',
  },
};
export const ITEM_ORDER: ItemType[] = [
  'gold',
  'red',
  'blue',
  'twin',
  'steel',
  'bomb',
  'glass',
  'spring',
  'rampL',
  'rampR',
  'boost',
  'ring',
];
export const ANT_DEFINITIONS: Record<AntType, AntDefinition> & {
  queen: QueenDefinition;
  spitter: AntDefinition & {
    range: number;
  };
  digger: AntDefinition & {
    burrowDistance: number;
    burrowCount: number;
  };
} = {
  basic: { health: 100, speed: 9, damagePerSecond: 20, color: '#5a2d0c', size: 1 },
  fast: { health: 60, speed: 18, damagePerSecond: 15, color: '#b23a0a', size: 0.8 },
  tank: { health: 350, speed: 6, damagePerSecond: 25, color: '#2a1a0a', size: 1.3 },
  boss: { health: 1500, speed: 4, damagePerSecond: 60, color: '#7a0000', size: 1.8 },
  // free-play finale: spans all five lanes, chews every lane at once and keeps spawning swarm babies
  queen: {
    health: 6000,
    speed: 3,
    damagePerSecond: 70,
    color: '#6a1b1b',
    size: 1,
    spansAllLanes: true,
    length: 170,
    broodInterval: 5,
    babies: 3,
  },
  jumper: { health: 80, speed: 11, damagePerSecond: 18, color: '#2e7d32', size: 0.9 }, // leaps over the first marble it meets
  armored: { health: 150, speed: 7, damagePerSecond: 22, color: '#455a64', size: 1.1, armor: 150 }, // shield absorbs shots; bombs bypass it
  spitter: {
    health: 90,
    speed: 8,
    damagePerSecond: 15,
    color: '#1e88e5',
    size: 1,
    range: 210,
    shiny: true,
  }, // blue shiny ant, spits poisonous venom
  red: { health: 600, speed: 3.5, damagePerSecond: 90, color: '#c62828', size: 1.7 }, // huge, slow, devastating bite
  swarm: { health: 30, speed: 14, damagePerSecond: 8, color: '#6d4c41', size: 0.55, group: 5 }, // arrives in packs
  mite: { health: 14, speed: 26, damagePerSecond: 5, color: '#c0a060', size: 0.38, group: 9 }, // tiny, very fast, big packs
  digger: {
    health: 110,
    speed: 10,
    damagePerSecond: 20,
    color: '#8d6e63',
    size: 1,
    burrowCount: 2,
    burrowDistance: 170,
  }, // burrows under marbles and resurfaces further up
};
export const ANT_DESCRIPTIONS: Record<AntType, [string, string]> = {
  basic: ['Worker Ant', 'Walks up the lane and chews anything in its way.'],
  fast: ['Sprinter', 'Quick but fragile.'],
  tank: ['Tank Ant', 'Slow and very tough.'],
  jumper: ['Hopper', 'Leaps over the first marble it meets.'],
  swarm: ['Swarm', 'Arrives in packs of five.'],
  mite: ['Mite', 'Tiny and very fast, in big groups.'],
  digger: ['Digger', 'Burrows under a marble and pops up further up the lane.'],
  armored: ['Armored Ant', 'Its shield soaks up shots - bombs ignore it.'],
  spitter: ['Spitter', 'Spits poison at marbles from a distance.'],
  red: ['Fire Ant', 'Huge and slow, with a devastating bite.'],
  boss: ['The Queen', 'Enormous. Bring everything you have!'],
  queen: [
    'Giant Queen',
    'Spans every lane, chews them all at once and keeps spawning swarm babies.',
  ],
};
// add = marbles introduced, ants = ants introduced; both accumulate over the campaign
const LEVEL_DEFINITIONS: LevelDefinition[] = [
  {
    name: 'Garden Gate',
    newItems: ['red'],
    newAntTypes: ['basic'],
    glove: true,
    tip: 'Click a lane to drop a marble. Higher drops hit harder! Use the glove (G) to reposition marbles.',
  },
  {
    name: 'Crumb Collector',
    newItems: ['gold'],
    newAntTypes: ['fast'],
    tip: 'Gold marbles make crumbs. Click falling crumbs to collect them.',
  },
  {
    name: 'Iron Wall',
    newItems: ['steel'],
    newAntTypes: ['tank'],
    eater: true,
    tip: 'Steel is tough and hits hard from height. The Ant Eater (E) sweeps the maze clean - an emergency button!',
  },
  {
    name: 'Cold Snap',
    newItems: ['blue'],
    newAntTypes: ['jumper'],
    tip: 'Frost slows ants. Hoppers skip the first marble they meet.',
  },
  {
    name: 'Track Day',
    newItems: ['rampL', 'rampR', 'spring'],
    newAntTypes: ['swarm'],
    tip: 'Track pieces steer marbles. Click a placed spring to set its strength.',
  },
  {
    name: 'Boom Town',
    newItems: ['bomb'],
    newAntTypes: ['armored'],
    tip: 'Bombs blow up on contact and ignore armor.',
  },
  {
    name: 'Shatter',
    newItems: ['glass', 'boost'],
    newAntTypes: ['spitter'],
    tip: 'Glass shards cut ants. Boost makes marbles hit harder.',
  },
  {
    name: 'Double Trouble',
    newItems: ['twin', 'ring'],
    newAntTypes: ['red'],
    tip: 'Rings pay crumbs each time a marble passes through.',
  },
  {
    name: 'Full Swing',
    newItems: [],
    newAntTypes: [],
    tip: 'Everything you have learned. Build a machine!',
  },
  {
    name: "Queen's Court",
    newItems: [],
    newAntTypes: ['boss'],
    boss: true,
    tip: 'The Queen is coming. Hold the line!',
  },
];
export const CAMPAIGN_LEVELS: CampaignLevel[] = [];
// difficulty curve: starting crumbs, ant health scale and spawn gap per level index
export const CAMPAIGN_DIFFICULTY = {
  crumbs: (index: number) => 400 + index * 40,
  health: (index: number) => [0.55, 0.6, 0.7, 0.7, 0.75, 0.8, 0.95, 1.1, 1.25, 1.3][index],
  gap: (index: number) => Math.max(2.6, 4.2 - index * 0.18),
  end: (index: number) => 26 + index * 1.5,
  speed: 1.25,
};
{
  let availableItems: ItemType[] = [];
  let antTypes: AntType[] = [];
  let gloveUnlocked = false;
  let anteaterUnlocked = false;
  LEVEL_DEFINITIONS.forEach((definition, index) => {
    availableItems = availableItems.concat(definition.newItems);
    antTypes = antTypes.concat(definition.newAntTypes);
    gloveUnlocked = gloveUnlocked || !!definition.glove;
    anteaterUnlocked = anteaterUnlocked || !!definition.eater;
    CAMPAIGN_LEVELS.push({
      ...definition,
      availableItems: availableItems,
      antTypes,
      glove: gloveUnlocked,
      eater: anteaterUnlocked,
      newGlove: !!definition.glove,
      newEater: !!definition.eater,
      crumbs: CAMPAIGN_DIFFICULTY.crumbs(index),
      health: CAMPAIGN_DIFFICULTY.health(index),
    });
  });
}
export const ANT_TYPES = Object.keys(ANT_DEFINITIONS) as AntType[];

export function isTrackType(type: ItemType): type is TrackType {
  return ITEM_DEFINITIONS[type].kind === 'piece';
}
