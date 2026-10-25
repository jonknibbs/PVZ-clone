import assert from 'node:assert/strict';
import { test } from 'node:test';
import { callAnteater, placeItem, togglePause } from '../src/game/actions';
import { updateAnts } from '../src/game/ants';
import { damageAnt, explodeMarble, queueDeathAnimation, spawnAnt } from '../src/game/combat';
import {
  BOARD_BOTTOM,
  BOARD_Y,
  BOOST_DISTANCE_BONUS,
  BOOST_SPEED,
  DEATH_ANIMATION_DURATION,
  GRAVITY,
  INITIAL_ROLL_SPEED,
  MAX_FALL_SPEED,
  QUEEN_ANTEATER_DAMAGE,
  QUEEN_BOMB_DAMAGE,
  RING_REWARD,
  TWIN_SHOT_DELAY,
  laneCenterX,
} from '../src/game/constants';
import { startGame } from '../src/game/game';
import { updateMarbles, updateProjectiles } from '../src/game/marbles';
import { updateGame } from '../src/game/simulation';
import type { AntType, Game, MarbleType, TrackType } from '../src/game/types';
import { testGame } from './helpers';

function addMarble(game: Game, type: MarbleType = 'steel', lane = 0, y = 300) {
  game.state.crumbs = 9999;
  game.state.cooldowns[type] = 0;
  assert.ok(placeItem(game, type, lane, y));
  return game.state.marbles[game.state.marbles.length - 1];
}

function addWalkingAnt(game: Game, type: AntType = 'basic', lane = 0, y = 340) {
  spawnAnt(game, type, lane, 1);
  const ant = game.state.ants[game.state.ants.length - 1];
  ant.emergence = null;
  ant.y = y;
  return ant;
}

test('marbles accelerate under gravity and respect maximum fall speed', () => {
  const game = testGame();
  const marble = addMarble(game, 'steel', 0, 150);
  updateMarbles(game, 0.05);
  assert.equal(marble.velocityY, INITIAL_ROLL_SPEED + GRAVITY * 0.05);
  assert.equal(marble.y, 155);
  marble.velocityY = MAX_FALL_SPEED;
  updateMarbles(game, 0.05);
  assert.equal(marble.velocityY, MAX_FALL_SPEED);
});

test('drop damage uses mass and accumulated fall distance exactly once', () => {
  const game = testGame();
  const marble = addMarble(game);
  marble.fallDistance = 300;
  const ant = addWalkingAnt(game);
  updateMarbles(game, 0.01);
  assert.equal(ant.health, 100 - Math.round((8 * 300) / 100));
  updateMarbles(game, 0.01);
  assert.equal(ant.health, 76);
});

test('marbles queue only behind ant-blocked marbles', () => {
  const game = testGame();
  const lower = addMarble(game, 'steel', 0, 400);
  const upper = addMarble(game, 'steel', 0, 350);
  const ant = addWalkingAnt(game, 'basic', 0, 440);
  updateMarbles(game, 0.01);
  assert.equal(lower.y, 400);
  assert.equal(upper.y, 350);
  ant.health = 0;
  updateMarbles(game, 0.01);
  assert.ok(lower.y > 400);
  assert.ok(upper.y > 350);
});

for (const type of ['spring', 'rampL', 'rampR', 'boost', 'ring'] satisfies TrackType[]) {
  test(`${type} activates on downward crossings and rearms after leaving`, () => {
    const game = testGame();
    game.state.crumbs = 9999;
    assert.ok(placeItem(game, type, 2, 300));
    const piece = game.state.trackPieces[0];
    const marble = addMarble(game, 'steel', 2, 280);
    marble.y = 295;
    const crumbsBefore = game.state.crumbs;
    updateMarbles(game, 0.01);
    assert.equal(marble.lastTrackPiece, piece);
    assert.equal(piece.pulseRemaining, 0.3);
    if (type === 'spring') {
      assert.ok(marble.velocityY < 0);
      assert.equal(marble.fallDistance, 0);
    } else if (type === 'boost') {
      assert.equal(marble.velocityY, BOOST_SPEED);
      assert.ok(marble.fallDistance >= BOOST_DISTANCE_BONUS);
    } else if (type === 'ring') {
      assert.equal(game.state.crumbs, crumbsBefore + RING_REWARD);
      updateMarbles(game, 0.01);
      assert.equal(game.state.crumbs, crumbsBefore + RING_REWARD);
    } else {
      assert.equal(marble.lane, type === 'rampL' ? 1 : 3);
      assert.equal(marble.laneOffsetX, type === 'rampL' ? 100 : -100);
    }
    marble.y = 200;
    marble.velocityY = -10;
    updateMarbles(game, 0.001);
    assert.equal(marble.lastTrackPiece, null);
  });
}

test('glass shatters into eight persistent shards on landing', () => {
  const game = testGame();
  const glass = addMarble(game, 'glass');
  glass.y = BOARD_BOTTOM - 30;
  updateMarbles(game, 0.01);
  assert.equal(game.state.marbles.length, 0);
  assert.equal(game.state.shards.length, 8);
  assert.equal(game.state.deaths[0].kind, 'marble');
});

test('armor absorbs projectile damage, while impact damage bypasses it', () => {
  const game = testGame();
  const ant = addWalkingAnt(game, 'armored');
  damageAnt(ant, 25, true);
  assert.equal(ant.health, 150);
  assert.equal(ant.armor, 135);
  damageAnt(ant, 25);
  assert.equal(ant.health, 125);
  assert.equal(ant.armor, 135);
});

test('frost shots slow exposed ants but do not hit emerging or burrowing ants', () => {
  const game = testGame();
  const ant = addWalkingAnt(game);
  game.state.projectiles.push({ x: laneCenterX(0), y: ant.y - 3, lane: 0, ice: true });
  updateProjectiles(game, 0.01);
  assert.equal(ant.health, 80);
  assert.equal(ant.slowRemaining, 3);
  spawnAnt(game, 'basic', 1);
  const emerging = game.state.ants[1];
  game.state.projectiles.push({ x: emerging.x, y: emerging.y - 3, lane: 1, ice: false });
  updateProjectiles(game, 0.01);
  assert.equal(emerging.health, 100);
  ant.traversal = { progress: 0.5, startY: ant.y, endY: ant.y - 170, dig: true, duration: 1.4 };
  game.state.projectiles.push({ x: ant.x, y: ant.y - 3, lane: 0, ice: false });
  updateProjectiles(game, 0.01);
  assert.equal(ant.health, 80);
});

test('jumper crosses its first blocker only once', () => {
  const game = testGame();
  const marble = addMarble(game);
  const ant = addWalkingAnt(game, 'jumper');
  updateAnts(game, 0.01);
  assert.equal(ant.hasJumped, true);
  assert.equal(ant.traversal?.endY, 340 - 54 * 1.6);
  for (let frame = 0; frame < 31; frame++) updateAnts(game, 0.02);
  assert.equal(ant.traversal, null);
  ant.y = marble.y + 40;
  const health = marble.health;
  updateAnts(game, 0.01);
  assert.equal(ant.traversal, null);
  assert.ok(marble.health < health);
});

test('digger consumes a burrow charge and passes 170 pixels under a blocker', () => {
  const game = testGame();
  addMarble(game);
  const ant = addWalkingAnt(game, 'digger');
  updateAnts(game, 0.01);
  assert.equal(ant.digsRemaining, 1);
  assert.equal(ant.traversal?.dig, true);
  assert.equal(ant.traversal?.endY, 170);
  for (let frame = 0; frame < 71; frame++) updateAnts(game, 0.02);
  assert.equal(ant.traversal, null);
  assert.ok(ant.y <= 170);
});

test('spitter attacks at range and applies poison without moving', () => {
  const game = testGame();
  const marble = addMarble(game);
  const ant = addWalkingAnt(game, 'spitter', 0, 450);
  ant.spitCooldown = 0;
  updateAnts(game, 0.01);
  assert.equal(ant.y, 450);
  assert.equal(marble.health, 888);
  assert.equal(marble.poisonRemaining, 4);
  updateMarbles(game, 0.05);
  assert.equal(marble.health, 888 - 7 * 0.05);
});

test('bombs spare underground ants and deal limited damage to the Queen', () => {
  const game = testGame();
  const bomb = addMarble(game, 'bomb', 2, 300);
  const queen = addWalkingAnt(game, 'queen', 2, 340);
  const worker = addWalkingAnt(game, 'armored', 2, 340);
  spawnAnt(game, 'basic', 2);
  const emerging = game.state.ants[2];
  emerging.y = 340;
  explodeMarble(game, bomb);
  assert.equal(queen.health, 6000 - QUEEN_BOMB_DAMAGE);
  assert.ok(worker.health <= 0);
  assert.equal(emerging.health, 100);
});

test('Queen chews every lane and her brood appears beside her', () => {
  const game = testGame();
  const marbles = Array.from({ length: 5 }, (_, lane) => addMarble(game, 'steel', lane));
  const queen = addWalkingAnt(game, 'queen', 2);
  queen.broodRemaining = 0;
  updateAnts(game, 0.01);
  assert.equal(queen.y, 340);
  assert.ok(marbles.every((marble) => marble.health === 900 - 70 * 0.01));
  assert.equal(game.state.ants.length, 4);
  assert.ok(game.state.ants.slice(1).every((ant) => !ant.emergence && ant.y > queen.y));
});

test('anteater hits the Queen only once per sweep and eats spawning workers', () => {
  const game = testGame();
  const queen = addWalkingAnt(game, 'queen', 2, 600);
  spawnAnt(game, 'basic', 0);
  game.state.anteaterCooldown = 0;
  callAnteater(game);
  for (let frame = 0; frame < 30; frame++) updateGame(game, 0.05);
  assert.equal(queen.health, 6000 - QUEEN_ANTEATER_DAMAGE);
  assert.equal(game.state.ants.length, 1);
});

test('death animations are queued once, are detached snapshots, and expire', () => {
  const game = testGame();
  const ant = addWalkingAnt(game);
  ant.health = 0;
  queueDeathAnimation(game, 'ant', ant, ant.x, ant.y);
  queueDeathAnimation(game, 'ant', ant, ant.x, ant.y);
  assert.equal(game.state.deaths.length, 1);
  const death = game.state.deaths[0];
  ant.y = 999;
  assert.notEqual(death.entity.y, ant.y);
  for (let frame = 0; frame < Math.ceil(DEATH_ANIMATION_DURATION / 0.05) + 1; frame++) {
    updateGame(game, 0.05);
  }
  assert.equal(game.state.deaths.length, 0);
});

test('pause freezes simulation, cooldowns, and emergence', () => {
  const game = testGame();
  spawnAnt(game, 'basic', 0);
  togglePause(game);
  const before = structuredClone(game.state);
  updateGame(game, 0.05);
  assert.deepEqual(game.state, before);
});

test('victory unlocks the next campaign level; a breach loses the game', () => {
  const game = testGame();
  startGame(game, 'campaign', 0);
  game.state.screen = 'play';
  game.state.spawnQueue = [];
  updateGame(game, 0.01);
  assert.equal(game.state.screen, 'win');
  assert.equal(game.preferences.unlockedLevels, 2);
  startGame(game, 'free', 0);
  addWalkingAnt(game, 'basic', 0, BOARD_Y - 6);
  updateGame(game, 0.01);
  assert.equal(game.state.screen, 'lose');
});

test('twin follow-up shots run on game time and stop while paused', () => {
  const game = testGame();
  const twin = addMarble(game, 'twin');
  addWalkingAnt(game, 'basic', 0, 500);
  twin.elapsed = 1.4;
  updateMarbles(game, 0.01);
  assert.equal(game.state.projectiles.length, 1);
  assert.equal(twin.twinShotRemaining, TWIN_SHOT_DELAY);

  // A paused game runs no marble updates, so the delayed shot waits.
  togglePause(game);
  updateGame(game, TWIN_SHOT_DELAY);
  assert.equal(game.state.projectiles.length, 1);
  assert.equal(twin.twinShotRemaining, TWIN_SHOT_DELAY);

  togglePause(game);
  updateGame(game, TWIN_SHOT_DELAY);
  assert.equal(game.state.projectiles.length, 2);
  assert.equal(twin.twinShotRemaining, 0);
});

test('a destroyed twin never fires its follow-up shot', () => {
  const game = testGame();
  const twin = addMarble(game, 'twin');
  addWalkingAnt(game, 'basic', 0, 500);
  twin.elapsed = 1.4;
  updateMarbles(game, 0.01);
  assert.equal(game.state.projectiles.length, 1);
  twin.health = 0;
  updateMarbles(game, 0.001);
  assert.equal(game.state.marbles.length, 0);
  updateMarbles(game, TWIN_SHOT_DELAY);
  assert.equal(game.state.projectiles.length, 1);
});
