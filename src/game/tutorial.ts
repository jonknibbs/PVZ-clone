import { BOARD_Y, LANE_LENGTH, laneCenterX } from './constants';
import { spawnAnt } from './combat';
import { startGame } from './game';
import { markTutorialDone } from './preferences';
import type { Game } from './types';

/** What the tutorial card points at; the renderer turns each target into a highlight. */
export type TutorialTarget =
  'hills' | 'crumbs' | 'firstSlot' | 'antLane' | 'board' | 'ants' | 'crumbDrop';

export interface TutorialStep {
  text: string;
  target: TutorialTarget;
  /** Steps without a condition wait for the player to press Next. */
  isComplete?: (game: Game) => boolean;
  enter?: (game: Game) => void;
  nextLabel?: string;
  /** Shown instead of Next while the step waits; defaults to prompting the player to act. */
  waitingHint?: string;
}

export const TUTORIAL_CRUMBS = 300;
export const TUTORIAL_ANT_LANE = 2;

const marbleInAntLane = (game: Game) =>
  game.state.marbles.some((marble) => marble.lane === TUTORIAL_ANT_LANE);

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    text: 'Ants dig up from these hills and climb the lanes. If one reaches the top, you lose.',
    target: 'hills',
  },
  {
    text: 'Crumbs pay for marbles. You collect more as you play.',
    target: 'crumbs',
  },
  {
    text: 'An ant is coming up lane 3. Pick the Shooter marble.',
    target: 'firstSlot',
    enter: (game) => spawnAnt(game, 'basic', TUTORIAL_ANT_LANE),
    isComplete: (game) => game.state.selectedItem === 'red' || marbleInAntLane(game),
  },
  {
    text: 'Click the highlighted lane above the ant to drop it in. The higher you drop it, the harder it lands.',
    target: 'antLane',
    isComplete: marbleInAntLane,
  },
  {
    text: 'Your Shooter also fires down its lane at anything below it. Watch it finish the ant.',
    target: 'ants',
    isComplete: (game) => game.state.ants.length === 0,
    waitingHint: 'Watch the Shooter',
  },
  {
    text: 'Crumbs also fall from the sky. Click this one to collect it.',
    target: 'crumbDrop',
    enter: (game) =>
      game.state.crumbDrops.push({
        x: laneCenterX(2),
        y: BOARD_Y,
        targetY: BOARD_Y + LANE_LENGTH * 0.45,
        speed: 120,
        value: 25,
        lifeRemaining: Infinity,
      }),
    isComplete: (game) => game.state.crumbs > (game.state.tutorial?.crumbsAtStepStart ?? Infinity),
  },
  {
    text: 'Press P to pause. Esc or right-click cancels a selection. You are ready for level 1.',
    target: 'board',
    nextLabel: 'Start level 1',
  },
];

export function currentTutorialStep(game: Game): TutorialStep | null {
  const progress = game.state.tutorial;
  return progress ? (TUTORIAL_STEPS[progress.step] ?? null) : null;
}

export function beginTutorial(game: Game) {
  game.state.tutorial = { step: 0, stepElapsed: 0, crumbsAtStepStart: game.state.crumbs };
  TUTORIAL_STEPS[0].enter?.(game);
}

export function advanceTutorial(game: Game) {
  const progress = game.state.tutorial;
  if (!progress) {
    return;
  }
  progress.step++;
  progress.stepElapsed = 0;
  progress.crumbsAtStepStart = game.state.crumbs;
  const step = TUTORIAL_STEPS[progress.step];
  if (step) {
    step.enter?.(game);
  } else {
    finishTutorial(game);
  }
}

export function updateTutorial(game: Game, deltaSeconds: number) {
  const progress = game.state.tutorial;
  const step = currentTutorialStep(game);
  if (!progress || !step) {
    return;
  }
  progress.stepElapsed += deltaSeconds;
  if (step.isComplete?.(game)) {
    advanceTutorial(game);
  }
}

/** Finishing or skipping both count as done, and lead into the first campaign level. */
export function finishTutorial(game: Game) {
  markTutorialDone(game);
  startGame(game, 'campaign', 0);
}
