import assert from 'node:assert/strict';
import { test } from 'node:test';
import { laneCenterX } from '../src/game/constants';
import { ANT_TYPES } from '../src/game/definitions';
import type { Rectangle } from '../src/game/types';
import { handleCanvasPointer } from '../src/ui/input';
import {
  BOARD_CROP,
  chooseLayoutKind,
  computeCompactLayout,
  DESKTOP_LAYOUT,
  type Layout,
  toWorld,
} from '../src/ui/viewport';
import { testGame } from './helpers';

const COMPACT_SIZES: Array<[string, number, number]> = [
  ['phone landscape', 844, 390],
  ['large phone landscape', 932, 430],
  ['small phone landscape', 667, 375],
  ['tablet landscape', 1024, 768],
  ['tablet portrait', 768, 1024],
  ['large tablet portrait', 1024, 1366],
];

const MIN_TAP = 44;

function controlsOf(layout: Layout): Array<[string, Rectangle]> {
  const panel = layout.panel;
  assert.ok(panel);
  return [
    ['pause', panel.pause],
    ['menu', panel.menu],
    ['debug', panel.debug],
    ['eater', panel.eater],
    ['glove', panel.glove],
    ...panel.slots.map((slot, index): [string, Rectangle] => [`slot ${index}`, slot]),
  ];
}

const overlaps = (a: Rectangle, b: Rectangle) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

const centre = (area: Rectangle) => ({ x: area.x + area.width / 2, y: area.y + area.height / 2 });

test('landscape phones and tablets get the compact layout; desktop and portrait phones do not', () => {
  assert.equal(chooseLayoutKind(844, 390, true), 'compact');
  assert.equal(chooseLayoutKind(932, 430, true), 'compact');
  assert.equal(chooseLayoutKind(768, 1024, true), 'compact');
  assert.equal(chooseLayoutKind(1024, 768, true), 'compact');
  assert.equal(chooseLayoutKind(390, 844, true), 'desktop');
  assert.equal(chooseLayoutKind(1440, 900, false), 'desktop');
  assert.equal(chooseLayoutKind(1280, 720, false), 'desktop');
  assert.equal(chooseLayoutKind(1024, 768, false), 'desktop');
});

for (const [name, width, height] of COMPACT_SIZES) {
  test(`${name} (${width}x${height}) has comfortable, separate tap targets`, () => {
    const layout = computeCompactLayout(width, height, ANT_TYPES.length);
    const board = layout.boardClip;
    assert.ok(board);
    const inside = (area: Rectangle) =>
      area.x >= 0 &&
      area.y >= 0 &&
      area.x + area.width <= width + 0.01 &&
      area.y + area.height <= height + 0.01;
    assert.ok(inside(board), 'board inside the canvas');
    const controls = controlsOf(layout);
    assert.equal(layout.panel?.slots.length, 12);
    for (const [label, area] of controls) {
      assert.ok(area.width >= MIN_TAP && area.height >= MIN_TAP, `${label} is at least 44px`);
      assert.ok(inside(area), `${label} inside the canvas`);
      assert.ok(!overlaps(area, board), `${label} clear of the board`);
    }
    for (let first = 0; first < controls.length; first++) {
      for (let second = first + 1; second < controls.length; second++) {
        assert.ok(
          !overlaps(controls[first][1], controls[second][1]),
          `${controls[first][0]} clear of ${controls[second][0]}`,
        );
      }
    }
  });
}

test('the compact board viewport maps the board crop exactly onto the board area', () => {
  const layout = computeCompactLayout(844, 390, ANT_TYPES.length);
  const board = layout.boardClip;
  assert.ok(board);
  const topLeft = toWorld(layout.world, { x: board.x, y: board.y });
  const bottomRight = toWorld(layout.world, {
    x: board.x + board.width,
    y: board.y + board.height,
  });
  assert.ok(Math.abs(topLeft.x - BOARD_CROP.x) < 1e-9);
  assert.ok(Math.abs(topLeft.y - BOARD_CROP.y) < 1e-9);
  assert.ok(Math.abs(bottomRight.x - (BOARD_CROP.x + BOARD_CROP.width)) < 1e-9);
  assert.ok(Math.abs(bottomRight.y - (BOARD_CROP.y + BOARD_CROP.height)) < 1e-9);
});

test('compact taps select from the panel and place on the board through the viewport', () => {
  const game = testGame();
  const layout = computeCompactLayout(844, 390, ANT_TYPES.length);
  const panel = layout.panel;
  assert.ok(panel);
  handleCanvasPointer(game, layout, centre(panel.slots[1]));
  assert.equal(game.state.selectedItem, 'red');
  const lane = {
    x: layout.world.x + laneCenterX(2) * layout.world.scale,
    y: layout.world.y + 300 * layout.world.scale,
  };
  handleCanvasPointer(game, layout, lane);
  assert.equal(game.state.marbles.length, 1);
  assert.equal(game.state.marbles[0].lane, 2);
  assert.ok(Math.abs(game.state.marbles[0].y - 300) < 1e-9);
  assert.equal(game.state.crumbs, 50);
});

test('compact pause, menu, glove and debug buttons work, and pause blocks the rest', () => {
  const game = testGame();
  const layout = computeCompactLayout(768, 1024, ANT_TYPES.length);
  const panel = layout.panel;
  assert.ok(panel);
  handleCanvasPointer(game, layout, centre(panel.glove));
  assert.equal(game.state.gloveActive, true);
  handleCanvasPointer(game, layout, centre(panel.pause));
  assert.equal(game.state.paused, true);
  handleCanvasPointer(game, layout, centre(panel.slots[0]));
  assert.equal(game.state.selectedItem, null);
  handleCanvasPointer(game, layout, centre(panel.pause));
  assert.equal(game.state.paused, false);

  handleCanvasPointer(game, layout, centre(panel.debug));
  assert.equal(game.debug, true);
  const ants = game.state.ants.length;
  handleCanvasPointer(game, layout, centre(layout.debugAnts[0]));
  assert.equal(game.state.ants.length, ants + 1);

  handleCanvasPointer(game, layout, centre(panel.menu));
  assert.equal(game.state.confirmQuit, true);
  // Panel controls are inert behind the confirmation dialog.
  handleCanvasPointer(game, layout, centre(panel.pause));
  assert.equal(game.state.confirmQuit, true);
});

test('menus in the compact layout are tapped through the menu viewport', () => {
  const game = testGame();
  game.state.screen = 'menu';
  const layout = computeCompactLayout(844, 390, ANT_TYPES.length);
  // "Free Play" is centred at (450, 414) in world coordinates.
  handleCanvasPointer(game, layout, {
    x: layout.menuWorld.x + 450 * layout.menuWorld.scale,
    y: layout.menuWorld.y + 414 * layout.menuWorld.scale,
  });
  assert.equal(game.state.screen, 'play');
});

test('the desktop layout passes canvas points straight through', () => {
  const game = testGame();
  handleCanvasPointer(game, DESKTOP_LAYOUT, { x: laneCenterX(1), y: 300 });
  assert.equal(game.state.marbles.length, 0);
  handleCanvasPointer(game, DESKTOP_LAYOUT, { x: 103 + 48 + 20, y: 40 });
  assert.equal(game.state.selectedItem, 'red');
  handleCanvasPointer(game, DESKTOP_LAYOUT, { x: laneCenterX(1), y: 300 });
  assert.equal(game.state.marbles[0].lane, 1);
});
