import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  cancelSelection,
  dropHeldItem,
  findNearestItem,
  placeItem,
  toggleGlove,
} from '../src/game/actions';
import { GLOVE_COOLDOWN, MIN_DROP_Y, laneCenterX } from '../src/game/constants';
import { CAMPAIGN_LEVELS } from '../src/game/definitions';
import { createGame, startGame } from '../src/game/game';
import { updateGame } from '../src/game/simulation';
import {
  canvasPoint,
  cursorFor,
  focusedMenuIndex,
  handleKeyDown,
  handlePointerDown,
  pauseForInterruption,
} from '../src/ui/input';
import {
  containsPoint,
  DEBUG_BUTTON,
  laneAt,
  MENU_BUTTON,
  QUIT_CANCEL_BUTTON,
  QUIT_CONFIRM_BUTTON,
  toolbarSlot,
} from '../src/ui/layout';
import { getIntroductionRows, getMenuButtons } from '../src/ui/menus';
import { testGame } from './helpers';

function key(
  game: ReturnType<typeof testGame>,
  value: string,
  modifiers: { ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean } = {},
) {
  let prevented = false;
  handleKeyDown(game, {
    key: value,
    ...modifiers,
    preventDefault: () => {
      prevented = true;
    },
  });
  return prevented;
}

test('menu buttons navigate campaign, intro, play, and settings', () => {
  const game = createGame();
  game.preferences.tutorialDone = true;
  getMenuButtons(game)
    .find((button) => button.label === 'Campaign')
    ?.onClick();
  assert.equal(game.state.screen, 'levels');
  const levels = getMenuButtons(game);
  assert.equal(levels.filter((button) => !button.locked && button.subtitle).length, 1);
  levels[0].onClick();
  assert.equal(game.state.screen, 'intro');
  assert.ok(getIntroductionRows(CAMPAIGN_LEVELS[0]).length > 0);
  getMenuButtons(game)[0].onClick();
  assert.equal(game.state.screen, 'play');
  assert.deepEqual(game.state.availableItems, ['red']);
});

test('campaign and intro controls fit inside their menu panels', () => {
  const game = createGame();
  game.state.screen = 'levels';
  const levelButtons = getMenuButtons(game).filter((button) => button.subtitle);
  assert.equal(levelButtons.length, CAMPAIGN_LEVELS.length);
  assert.ok(
    levelButtons.every(
      ({ x, y, width, height }) => x >= 184 && x + width <= 716 && y >= 210 && y + height <= 530,
    ),
  );
  assert.equal(new Set(levelButtons.map(({ x }) => x)).size, 2);

  startGame(game, 'campaign', 0);
  const introButtons = getMenuButtons(game);
  assert.ok(introButtons.every(({ y, height }) => y >= 68 && y + height <= 678));
});

test('placement charges crumbs, sets cooldown, clamps height, and rejects repeat purchases', () => {
  const game = testGame();
  assert.ok(placeItem(game, 'red', 1, 0));
  assert.equal(game.state.crumbs, 50);
  assert.equal(game.state.cooldowns.red, 5);
  assert.equal(game.state.marbles[0].y, MIN_DROP_Y);
  assert.equal(placeItem(game, 'red', 1, 200), false);
  assert.equal(game.state.marbles.length, 1);
  assert.equal(game.state.crumbs, 50);
});

test('track placement rejects invalid ramps and crowded pieces without charging', () => {
  const game = testGame();
  assert.equal(placeItem(game, 'rampL', 0, 300), false);
  assert.equal(game.state.crumbs, 150);
  assert.match(game.state.notification?.text ?? '', /No lane/);
  assert.ok(placeItem(game, 'spring', 1, 300));
  assert.equal(placeItem(game, 'boost', 1, 320), false);
  assert.equal(game.state.crumbs, 75);
  assert.equal(game.state.trackPieces.length, 1);
});

test('keyboard selection, pause, cancellation, and debug retain their original bindings', () => {
  const game = testGame();
  key(game, '1');
  assert.equal(game.state.selectedItem, 'gold');
  key(game, '=');
  assert.equal(game.state.selectedItem, 'ring');
  key(game, 'P');
  assert.equal(game.state.paused, true);
  key(game, '2');
  assert.equal(game.state.selectedItem, 'ring');
  key(game, 'p');
  key(game, 'Escape');
  assert.equal(game.state.selectedItem, null);
  game.debugAvailable = true;
  assert.equal(key(game, 'F2'), true);
  assert.equal(game.debug, true);
});

test('on-screen debug button toggles debug mode while playing or paused', () => {
  const game = testGame();
  game.debugAvailable = true;
  const point = { x: DEBUG_BUTTON.x + DEBUG_BUTTON.width / 2, y: DEBUG_BUTTON.y + 19 };
  handlePointerDown(game, point);
  assert.equal(game.debug, true);
  assert.equal(game.state.crumbs, 9999);

  game.state.paused = true;
  handlePointerDown(game, point);
  assert.equal(game.debug, false);
  assert.equal(game.state.crumbs, 150);
  assert.match(game.state.notification?.text ?? '', /Debug mode OFF/);
});

test('a debug win does not unlock the next campaign level', () => {
  const game = testGame();
  game.debugAvailable = true;
  startGame(game, 'campaign', 0);
  game.state.screen = 'play';
  key(game, 'F2');
  game.state.spawnQueue = [];
  updateGame(game, 0.01);
  assert.equal(game.state.screen, 'win');
  assert.equal(game.preferences.unlockedLevels, 1);
});

test('unaffordable and recharging placements explain themselves', () => {
  const game = testGame();
  game.state.crumbs = 10;
  assert.equal(placeItem(game, 'red', 1, 300), false);
  assert.match(game.state.notification?.text ?? '', /Shooter costs 100 — 90 more crumbs/);

  game.state.crumbs = 9999;
  assert.ok(placeItem(game, 'red', 1, 300));
  assert.equal(placeItem(game, 'red', 2, 300), false);
  assert.match(game.state.notification?.text ?? '', /Shooter is recharging: 5s/);
});

test('the main menu button asks before ending a run', () => {
  const game = testGame();
  const point = { x: MENU_BUTTON.x + 10, y: MENU_BUTTON.y + 10 };
  handlePointerDown(game, point);
  assert.equal(game.state.confirmQuit, true);
  assert.equal(game.state.paused, true);
  assert.equal(game.state.screen, 'play');

  handlePointerDown(game, { x: QUIT_CANCEL_BUTTON.x + 10, y: QUIT_CANCEL_BUTTON.y + 10 });
  assert.equal(game.state.confirmQuit, false);
  assert.equal(game.state.paused, false);

  handlePointerDown(game, point);
  key(game, 'Escape');
  assert.equal(game.state.confirmQuit, false);

  handlePointerDown(game, point);
  handlePointerDown(game, { x: QUIT_CONFIRM_BUTTON.x + 10, y: QUIT_CONFIRM_BUTTON.y + 10 });
  assert.equal(game.state.screen, 'menu');
});

test('the Ant Eater answers to a lowercase e', () => {
  const game = testGame();
  game.state.anteaterCooldown = 0;
  key(game, 'e');
  assert.ok(game.state.anteater);
});

test('browser and OS shortcuts are not treated as game input', () => {
  const game = testGame();
  key(game, '1', { metaKey: true });
  key(game, '-', { ctrlKey: true });
  key(game, '2', { altKey: true });
  assert.equal(game.state.selectedItem, null);
  key(game, '1');
  assert.equal(game.state.selectedItem, 'gold');
});

test('a hidden tab or a lost window pauses the run', () => {
  const game = testGame();
  pauseForInterruption(game);
  assert.equal(game.state.paused, true);
  pauseForInterruption(game);
  assert.equal(game.state.paused, true);
  game.state.screen = 'menu';
  game.state.paused = false;
  pauseForInterruption(game);
  assert.equal(game.state.paused, false);
});

test('menus can be driven from the keyboard', () => {
  const game = createGame();
  assert.equal(focusedMenuIndex(game), -1);
  key(game, 'ArrowDown');
  assert.equal(focusedMenuIndex(game), 0);
  key(game, 'ArrowDown');
  assert.equal(focusedMenuIndex(game), 1);
  key(game, 'ArrowUp');
  key(game, 'ArrowUp');
  assert.equal(focusedMenuIndex(game), 4);
  key(game, 'ArrowDown');
  assert.equal(focusedMenuIndex(game), 0);
  key(game, 'Enter');
  assert.equal(game.state.screen, 'levels');
  assert.equal(focusedMenuIndex(game), -1);
});

test('the cursor shows what the pointer can act on', () => {
  const game = createGame();
  const campaign = getMenuButtons(game)[0];
  assert.equal(cursorFor(game, { x: campaign.x + 5, y: campaign.y + 5 }), 'pointer');
  assert.equal(cursorFor(game, { x: 5, y: 5 }), 'default');

  const playing = testGame();
  const slot = toolbarSlot(0);
  assert.equal(cursorFor(playing, { x: slot.x + 5, y: slot.y + 5 }), 'pointer');
  assert.equal(cursorFor(playing, { x: MENU_BUTTON.x + 5, y: MENU_BUTTON.y + 5 }), 'pointer');
  assert.equal(cursorFor(playing, { x: laneCenterX(1), y: 300 }), 'default');
  playing.state.selectedItem = 'red';
  assert.equal(cursorFor(playing, { x: laneCenterX(1), y: 300 }), 'copy');
  playing.state.selectedItem = null;
  playing.state.gloveActive = true;
  assert.equal(cursorFor(playing, { x: laneCenterX(1), y: 300 }), 'grab');
});

test('a crumb hidden behind the toolbar never steals its clicks', () => {
  const game = testGame();
  const slot = toolbarSlot(1);
  game.state.crumbDrops.push({
    x: slot.x + 20,
    y: slot.y + 20,
    targetY: 400,
    speed: 40,
    value: 25,
    lifeRemaining: 10,
  });
  handlePointerDown(game, { x: slot.x + 20, y: slot.y + 20 });
  assert.equal(game.state.selectedItem, 'red');
  assert.equal(game.state.crumbs, 150);
  assert.equal(game.state.crumbDrops.length, 1);
});

test('toolbar clicks toggle selection and a board click places the selected item', () => {
  const game = testGame();
  const slot = toolbarSlot(1);
  handlePointerDown(game, { x: slot.x + 20, y: slot.y + 20 });
  assert.equal(game.state.selectedItem, 'red');
  handlePointerDown(game, { x: slot.x + 20, y: slot.y + 20 });
  assert.equal(game.state.selectedItem, null);
  key(game, '2');
  handlePointerDown(game, { x: laneCenterX(1), y: 250 });
  assert.equal(game.state.marbles[0].type, 'red');
  assert.equal(game.state.marbles[0].lane, 1);
  assert.equal(game.state.selectedItem, null);
});

test('glove returns canceled pickups, and moved marbles gain no new impact damage', () => {
  const game = testGame();
  assert.ok(placeItem(game, 'red', 1, 300));
  const marble = game.state.marbles[0];
  toggleGlove(game);
  handlePointerDown(game, { x: laneCenterX(1), y: 300 });
  assert.equal(game.state.marbles.length, 0);
  cancelSelection(game);
  assert.equal(game.state.marbles[0], marble);
  assert.equal(game.state.gloveCooldown, 0);
  toggleGlove(game);
  handlePointerDown(game, { x: laneCenterX(1), y: 300 });
  dropHeldItem(game, 2, 240);
  assert.equal(marble.lane, 2);
  assert.equal(marble.y, 240);
  assert.equal(marble.isFalling, false);
  assert.equal(marble.fallDistance, 0);
  assert.equal(game.state.gloveCooldown, GLOVE_COOLDOWN);
  assert.equal(game.state.heldItem, null);
});

test('glove moves track pieces and refuses invalid ramp destinations', () => {
  const game = testGame();
  placeItem(game, 'rampL', 1, 300);
  toggleGlove(game);
  handlePointerDown(game, { x: laneCenterX(1), y: 300 });
  dropHeldItem(game, 0, 300);
  assert.ok(game.state.heldItem);
  assert.equal(game.state.trackPieces.length, 0);
  dropHeldItem(game, 2, 350);
  assert.equal(game.state.trackPieces[0].lane, 2);
  assert.equal(game.state.trackPieces[0].y, 350);
  assert.equal(game.state.gloveCooldown, GLOVE_COOLDOWN);
});

test('nearest-item selection compares marble and track distances', () => {
  const game = testGame();
  placeItem(game, 'steel', 0, 300);
  placeItem(game, 'spring', 0, 310);
  assert.equal(findNearestItem(game, 0, 305)?.isPiece, false);
  assert.equal(findNearestItem(game, 0, 308)?.isPiece, true);
  assert.equal(findNearestItem(game, 1, 300), null);
});

test('clicking an idle spring cycles its four strength settings', () => {
  const game = testGame();
  placeItem(game, 'spring', 0, 300);
  for (const expected of [1, 2, 3, 4, 1]) {
    handlePointerDown(game, { x: laneCenterX(0), y: 300 });
    assert.equal(game.state.trackPieces[0].strength, expected);
  }
});

test('crumb pickup and lane/button hit boundaries match the board geometry', () => {
  const game = testGame();
  game.state.crumbDrops.push({
    x: 300,
    y: 200,
    targetY: 200,
    speed: 0,
    value: 25,
    lifeRemaining: 10,
  });
  handlePointerDown(game, { x: 300, y: 200 });
  assert.equal(game.state.crumbs, 175);
  assert.equal(game.state.crumbDrops[0].lifeRemaining, 0);
  assert.equal(laneAt({ x: 200, y: 110 }), 0);
  assert.equal(laneAt({ x: 699, y: 650 }), 4);
  assert.equal(laneAt({ x: 700, y: 650 }), -1);
  assert.ok(containsPoint({ x: 10, y: 20 }, { x: 0, y: 0, width: 10, height: 20 }));
});

test('canvas pointer coordinates map correctly when the canvas is scaled', () => {
  const canvas = {
    width: 900,
    height: 700,
    getBoundingClientRect: () => ({ left: 10, top: 20, width: 450, height: 350 }),
  } as HTMLCanvasElement;
  assert.deepEqual(canvasPoint(canvas, { clientX: 235, clientY: 195 }), { x: 450, y: 350 });
});

test('canvas pointer coordinates ignore the decorative border', () => {
  const bordered = {
    width: 900,
    height: 700,
    clientLeft: 4,
    clientTop: 4,
    clientWidth: 450,
    clientHeight: 350,
    getBoundingClientRect: () => ({ left: 10, top: 20, width: 458, height: 358 }),
  } as HTMLCanvasElement;
  assert.deepEqual(canvasPoint(bordered, { clientX: 14, clientY: 24 }), { x: 0, y: 0 });
  assert.deepEqual(canvasPoint(bordered, { clientX: 239, clientY: 199 }), { x: 450, y: 350 });
});

test('separate games do not share mutable state, progress, or cooldowns', () => {
  const first = testGame();
  const second = testGame();
  placeItem(first, 'red', 0, 300);
  first.preferences.unlockedLevels = 10;
  startGame(first, 'campaign', 9);
  assert.equal(second.state.screen, 'play');
  assert.equal(second.state.marbles.length, 0);
  assert.equal(second.state.cooldowns.red, 0);
  assert.equal(second.preferences.unlockedLevels, 1);
  first.state.availableItems.pop();
  startGame(second, 'campaign', 9);
  assert.deepEqual(second.state.availableItems, CAMPAIGN_LEVELS[9].availableItems);
  assert.notDeepEqual(first.state.availableItems, second.state.availableItems);
  startGame(first, 'campaign', 9);
  assert.deepEqual(first.state.availableItems, second.state.availableItems);
});
