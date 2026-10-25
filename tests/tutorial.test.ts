import assert from 'node:assert/strict';
import { test } from 'node:test';
import { laneCenterX } from '../src/game/constants';
import { createGame } from '../src/game/game';
import { createMemoryPreferenceStore } from '../src/game/preferences';
import { updateGame } from '../src/game/simulation';
import { TUTORIAL_ANT_LANE, TUTORIAL_STEPS } from '../src/game/tutorial';
import type { Game } from '../src/game/types';
import { handleKeyDown, handlePointerDown } from '../src/ui/input';
import { toolbarSlot, TUTORIAL_NEXT_BUTTON, TUTORIAL_SKIP_BUTTON } from '../src/ui/layout';
import { getMenuButtons } from '../src/ui/menus';
import { seededRandom } from './helpers';

const center = (bounds: { x: number; y: number; width: number; height: number }) => ({
  x: bounds.x + bounds.width / 2,
  y: bounds.y + bounds.height / 2,
});

function openFirstLevel(game: Game) {
  game.state.screen = 'levels';
  getMenuButtons(game)
    .find((button) => button.subtitle === 'Garden Gate')
    ?.onClick();
}

function run(game: Game, seconds: number, until: () => boolean) {
  for (let elapsed = 0; elapsed < seconds && !until(); elapsed += 0.05) {
    updateGame(game, 0.05);
  }
}

test('the first campaign level opens the tutorial until it has been finished once', () => {
  const store = createMemoryPreferenceStore();
  const game = createGame({ random: seededRandom(), preferenceStore: store });
  openFirstLevel(game);
  assert.equal(game.mode, 'tutorial');
  assert.equal(game.state.screen, 'play');
  assert.deepEqual(game.state.availableItems, ['red']);

  handlePointerDown(game, center(TUTORIAL_SKIP_BUTTON));
  assert.equal(game.mode, 'campaign');
  assert.equal(game.state.screen, 'intro');
  assert.equal(store.load().tutorialDone, true);

  const returning = createGame({ preferenceStore: store });
  openFirstLevel(returning);
  assert.equal(returning.mode, 'campaign');
});

test('the tutorial can be played through to level 1 with real input', () => {
  const game = createGame({ random: seededRandom() });
  getMenuButtons(game)
    .find((button) => button.label === 'How to Play')
    ?.onClick();
  const step = () => game.state.tutorial?.step;

  handlePointerDown(game, center(TUTORIAL_NEXT_BUTTON));
  handleKeyDown(game, { key: 'Enter', preventDefault: () => {} });
  assert.equal(step(), 2);

  assert.equal(game.state.ants.length, 1);
  assert.equal(game.state.ants[0].lane, TUTORIAL_ANT_LANE);

  // Next does nothing on a step that waits for the player
  handlePointerDown(game, center(TUTORIAL_NEXT_BUTTON));
  assert.equal(step(), 2);
  handlePointerDown(game, center(toolbarSlot(0)));
  updateGame(game, 0.05);
  assert.equal(step(), 3);

  // a marble in the wrong lane does not count
  handlePointerDown(game, { x: laneCenterX(0), y: 200 });
  updateGame(game, 0.05);
  assert.equal(step(), 3);
  game.state.cooldowns.red = 0;
  handlePointerDown(game, center(toolbarSlot(0)));
  handlePointerDown(game, { x: laneCenterX(TUTORIAL_ANT_LANE), y: 160 });
  updateGame(game, 0.05);
  assert.equal(step(), 4);

  run(game, 30, () => step() !== 4);
  assert.equal(step(), 5, 'the dropped Shooter should kill the tutorial ant');
  assert.equal(game.state.screen, 'play');

  const drop = game.state.crumbDrops[0];
  run(game, 5, () => drop.y >= drop.targetY);
  const crumbsBefore = game.state.crumbs;
  handlePointerDown(game, drop);
  assert.equal(game.state.crumbs, crumbsBefore + 25);
  updateGame(game, 0.05);
  assert.equal(step(), 6);

  handlePointerDown(game, center(TUTORIAL_NEXT_BUTTON));
  assert.equal(game.state.tutorial, null);
  assert.equal(game.mode, 'campaign');
  assert.equal(game.state.screen, 'intro');
  assert.equal(game.preferences.tutorialDone, true);
  assert.equal(TUTORIAL_STEPS.length, 7);
});

test('the tutorial never declares victory or drops crumbs on its own', () => {
  const game = createGame({ random: seededRandom() });
  getMenuButtons(game)
    .find((button) => button.label === 'How to Play')
    ?.onClick();
  run(game, 40, () => false);
  assert.equal(game.state.screen, 'play');
  assert.equal(game.state.crumbDrops.length, 0);
});
