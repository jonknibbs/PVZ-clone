import assert from 'node:assert/strict';
import { test } from 'node:test';
import { placeItem } from '../src/game/actions';
import { laneCenterX } from '../src/game/constants';
import { updateGame } from '../src/game/simulation';
import { handleKeyDown, handlePointerDown } from '../src/ui/input';
import { MENU_BUTTON, QUIT_CONFIRM_BUTTON, toolbarSlot } from '../src/ui/layout';
import { testGame } from './helpers';

function press(game: ReturnType<typeof testGame>, key: string, modifiers = {}) {
  handleKeyDown(game, { key, preventDefault: () => {}, ...modifiers });
}

test('lowercase e calls the Ant Eater, like E', () => {
  const game = testGame();
  game.state.anteaterCooldown = 0;
  press(game, 'e');
  assert.ok(game.state.anteater);
});

test('number keys held with Ctrl, Cmd or Alt are left to the browser', () => {
  const game = testGame();
  press(game, '1', { metaKey: true });
  press(game, '-', { ctrlKey: true });
  assert.equal(game.state.selectedItem, null);
  press(game, '1');
  assert.equal(game.state.selectedItem, 'gold');
});

test('a crumb falling behind the toolbar does not swallow a slot click', () => {
  const game = testGame();
  const slot = toolbarSlot(3);
  game.state.crumbDrops.push({
    x: slot.x + 22,
    y: 50,
    targetY: 400,
    speed: 40,
    value: 25,
    lifeRemaining: 10,
  });
  handlePointerDown(game, { x: slot.x + 22, y: 50 });
  assert.equal(game.state.selectedItem, 'twin');
  assert.equal(game.state.crumbs, 150);
});

test('debug mode is unavailable unless enabled, and leaves crumbs untouched', () => {
  const game = testGame();
  press(game, 'F2');
  assert.equal(game.debug, false);
  game.debugAvailable = true;
  press(game, 'F2');
  assert.equal(game.debug, true);
  assert.ok(placeItem(game, 'twin', 0, 300));
  assert.ok(placeItem(game, 'twin', 1, 300));
  updateGame(game, 0.05);
  press(game, 'F2');
  assert.equal(game.debug, false);
  assert.equal(game.state.crumbs, 150);
});

test('an unaffordable or recharging placement explains why', () => {
  const game = testGame();
  game.state.crumbs = 10;
  assert.equal(placeItem(game, 'red', 1, 300), false);
  assert.match(game.state.notification?.text ?? '', /Shooter costs 100 — 90 more crumbs/);
  game.state.crumbs = 500;
  assert.ok(placeItem(game, 'red', 1, 300));
  assert.equal(placeItem(game, 'red', 2, 300), false);
  assert.match(game.state.notification?.text ?? '', /recharging/);
});

test('Main menu asks before ending a game, and Keep playing resumes it', () => {
  const game = testGame();
  const menuCenter = {
    x: MENU_BUTTON.x + MENU_BUTTON.width / 2,
    y: MENU_BUTTON.y + MENU_BUTTON.height / 2,
  };
  handlePointerDown(game, menuCenter);
  assert.equal(game.state.screen, 'play');
  assert.equal(game.state.paused, true);
  assert.equal(game.state.confirmQuit, true);
  press(game, 'Escape');
  assert.equal(game.state.confirmQuit, false);
  assert.equal(game.state.paused, false);
  handlePointerDown(game, menuCenter);
  handlePointerDown(game, { x: QUIT_CONFIRM_BUTTON.x + 10, y: QUIT_CONFIRM_BUTTON.y + 10 });
  assert.equal(game.state.screen, 'menu');
});

test('the Twin holds its delayed second shot while the game is paused', () => {
  const game = testGame();
  game.state.crumbs = 500;
  placeItem(game, 'twin', 2, 200);
  game.state.marbles[0].elapsed = 2;
  game.state.ants.push({
    type: 'basic',
    lane: 2,
    x: laneCenterX(2),
    y: 500,
    health: 100,
    maxHealth: 100,
    armor: 0,
    slowRemaining: 0,
    flashRemaining: 0,
    animationPhase: 0,
    hasJumped: false,
    traversal: null,
    jumpHeight: 0,
    spitCooldown: 1,
  });
  updateGame(game, 0.01);
  assert.equal(game.state.projectiles.length, 1);
  game.state.paused = true;
  updateGame(game, 0.3);
  assert.equal(game.state.projectiles.length, 1);
});
