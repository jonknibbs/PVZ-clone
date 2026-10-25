export type MarbleType = 'gold' | 'red' | 'blue' | 'twin' | 'steel' | 'bomb' | 'glass';

export type TrackType = 'spring' | 'rampL' | 'rampR' | 'boost' | 'ring';

export type ItemType = MarbleType | TrackType;

export type AntType =
  | 'basic'
  | 'fast'
  | 'tank'
  | 'boss'
  | 'queen'
  | 'jumper'
  | 'armored'
  | 'spitter'
  | 'red'
  | 'swarm'
  | 'mite'
  | 'digger';

export type GameMode = 'free' | 'campaign' | 'tutorial' | 'sandbox';

export type Screen = 'menu' | 'settings' | 'levels' | 'intro' | 'play' | 'win' | 'lose';

export type MarbleStyle = 'original' | 'classic' | 'character';

export type NotificationTone = 'error' | 'info';

export interface Point {
  x: number;
  y: number;
}

export interface Rectangle extends Point {
  width: number;
  height: number;
}

interface BaseItemDefinition {
  name: string;
  cost: number;
  cooldown: number;
  description: string;
}

export interface MarbleDefinition extends BaseItemDefinition {
  kind?: never;
  health: number;
  color: string;
  mass: number;
}

export interface TrackDefinition extends BaseItemDefinition {
  kind: 'piece';
  direction?: number;
}

export type ItemDefinition = MarbleDefinition | TrackDefinition;

export type ItemCatalog = Record<MarbleType, MarbleDefinition> &
  Record<TrackType, TrackDefinition> &
  Record<
    'rampL' | 'rampR',
    TrackDefinition & {
      direction: -1 | 1;
    }
  >;

export interface AntDefinition {
  health: number;
  speed: number;
  damagePerSecond: number;
  color: string;
  size: number;
  spansAllLanes?: boolean;
  length?: number;
  broodInterval?: number;
  babies?: number;
  group?: number;
  armor?: number;
  range?: number;
  shiny?: boolean;
  burrowCount?: number;
  burrowDistance?: number;
}

export interface QueenDefinition extends AntDefinition {
  length: number;
  broodInterval: number;
  babies: number;
}

export interface TrackPiece {
  type: TrackType;
  lane: number;
  y: number;
  pulseRemaining: number;
  strength: number;
}

export interface Marble {
  type: MarbleType;
  lane: number;
  y: number;
  health: number;
  maxHealth: number;
  elapsed: number;
  fuseRemaining: number;
  touchingAnt: boolean;
  poisonRemaining: number;
  velocityY: number;
  fallDistance: number;
  isFalling: boolean;
  lastTrackPiece: TrackPiece | null;
  laneOffsetX: number;
  /** Counts down to the Twin's follow-up shot, so it stops while the game is paused. */
  twinShotRemaining?: number;
  boosted?: boolean;
  isBlockedByAnt?: boolean;
  isRolling?: boolean;
  exploded?: boolean;
  deathQueued?: boolean;
}

export interface Emergence {
  elapsed: number;
  duration: number;
  startY: number;
  endY: number;
}

export interface Traversal {
  progress: number;
  startY: number;
  endY: number;
  dig?: boolean;
  duration?: number;
}

export interface Anteater {
  y: number;
}

export interface Ant extends Point {
  type: AntType;
  lane: number;
  health: number;
  maxHealth: number;
  armor: number;
  slowRemaining: number;
  flashRemaining: number;
  animationPhase: number;
  hasJumped: boolean;
  traversal: Traversal | null;
  jumpHeight: number;
  spitCooldown: number;
  digsRemaining?: number;
  spansAllLanes?: boolean;
  broodRemaining?: number;
  emergence?: Emergence | null;
  eatenBy?: Anteater;
  deathQueued?: boolean;
}

export type HeldItem =
  | {
      isPiece: true;
      entity: TrackPiece;
    }
  | {
      isPiece: false;
      entity: Marble;
    };

export interface Shard extends Point {
  lane: number;
  lifeRemaining: number;
  durability: number;
  rotation: number;
  size: number;
}

export interface Projectile extends Point {
  lane: number;
  ice: boolean;
  dead?: boolean;
}

export interface CrumbDrop extends Point {
  targetY: number;
  speed: number;
  value: number;
  lifeRemaining: number;
}

export type Effect = Point & {
  elapsed: number;
  duration: number;
} & (
    | {
        kind: 'puff' | 'boom';
      }
    | {
        kind: 'dmg';
        text: string;
      }
    | {
        kind: 'spit';
        targetX: number;
        targetY: number;
      }
  );

export type DeathAnimation = Point & {
  elapsed: number;
  duration: number;
} & (
    | {
        kind: 'ant';
        entity: Ant;
      }
    | {
        kind: 'marble';
        entity: Marble;
      }
  );

export type SpawnEvent = [time: number, type: AntType];

export interface LevelDefinition {
  name: string;
  newItems: ItemType[];
  newAntTypes: AntType[];
  glove?: boolean;
  eater?: boolean;
  tip: string;
  boss?: boolean;
}

export interface CampaignLevel extends LevelDefinition {
  availableItems: ItemType[];
  antTypes: AntType[];
  glove: boolean;
  eater: boolean;
  newGlove: boolean;
  newEater: boolean;
  crumbs: number;
  health: number;
}

export interface GameState {
  crumbs: number;
  marbles: Marble[];
  trackPieces: TrackPiece[];
  shards: Shard[];
  deaths: DeathAnimation[];
  heldItem: HeldItem | null;
  gloveActive: boolean;
  gloveCooldown: number;
  anteater: Anteater | null;
  anteaterCooldown: number;
  ants: Ant[];
  projectiles: Projectile[];
  crumbDrops: CrumbDrop[];
  effects: Effect[];
  elapsed: number;
  selectedItem: ItemType | null;
  cooldowns: Record<ItemType, number>;
  nextCrumbIn: number;
  crumbInterval: number;
  crumbIntervalJitter: number;
  screen: Screen;
  paused: boolean;
  confirmQuit: boolean;
  tutorial: TutorialProgress | null;
  debugUsed: boolean;
  pointer: Point;
  /** Keyboard focus inside a menu, remembered per screen. */
  menuFocus: {
    screen: Screen;
    index: number;
  } | null;
  spawnQueue: SpawnEvent[];
  notification: {
    text: string;
    lifeRemaining: number;
    tone: NotificationTone;
  } | null;
  availableItems: ItemType[];
  abilities: {
    glove: boolean;
    eater: boolean;
  };
  antHealthMultiplier?: number;
  antSpeedMultiplier?: number;
  invasionDuration: number;
}

export interface TutorialProgress {
  step: number;
  /** Seconds spent on the current step, for steps that wait for something to happen. */
  stepElapsed: number;
  crumbsAtStepStart: number;
}

export interface Preferences {
  marbleStyle: MarbleStyle;
  unlockedLevels: number;
  tutorialDone: boolean;
}

export interface PreferenceStore {
  load(): Preferences;
  save(preferences: Preferences): void;
}

export interface Game {
  state: GameState;
  mode: GameMode;
  levelIndex: number;
  debug: boolean;
  /** Development builds only: lets F2 switch on debug mode. */
  debugAvailable: boolean;
  /** Crumb count to put back when debug mode is switched off. */
  debugCrumbsBackup: number | null;
  preferences: Preferences;
  random: () => number;
  preferenceStore: PreferenceStore;
}
