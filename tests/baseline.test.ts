import assert from 'node:assert/strict';
import { test } from 'node:test';
import { placeItem } from '../src/game/actions';
import { spawnAnt } from '../src/game/combat';
import { ANT_TYPES, CAMPAIGN_LEVELS } from '../src/game/definitions';
import { createGame, startGame } from '../src/game/game';
import { updateGame } from '../src/game/simulation';
import type { MarbleType } from '../src/game/types';
import baseline from './fixtures/gameplay-baseline.json';
import { seededRandom, snapshot, testGame } from './helpers';

// Golden states were captured from the original game at commit ec90369, not the refactored engine.
// Exception: the Twin's follow-up shot now runs on game time rather than a real timer, so it lands
// inside these synchronous frames. The original fired it too, just asynchronously after the capture.
for (const type of ANT_TYPES) {
  test(`${type} emergence and movement match the original game`, () => {
    const game = testGame();
    spawnAnt(game, type, 2);
    const snapshots = [];
    for (let frame = 0; frame <= 180; frame++) {
      if ([0, 10, 50, 180].includes(frame)) snapshots.push(snapshot(game));
      if (frame < 180) updateGame(game, 0.02);
    }
    assert.deepEqual(snapshots, baseline.spawn[type]);
  });
}

for (const [index, level] of CAMPAIGN_LEVELS.entries()) {
  test(`${level.name} schedule and unlocks match the original game`, () => {
    const game = createGame({ random: seededRandom() });
    startGame(game, 'campaign', index);
    assert.deepEqual(
      {
        items: game.state.availableItems,
        crumbs: game.state.crumbs,
        queue: game.state.spawnQueue,
        invasionDuration: game.state.invasionDuration,
        healthMultiplier: game.state.antHealthMultiplier,
        abilities: game.state.abilities,
      },
      baseline.campaign[index],
    );
  });
}

const marbleTypes: MarbleType[] = ['gold', 'red', 'blue', 'twin', 'steel', 'bomb', 'glass'];
for (const type of marbleTypes) {
  test(`${type} physics and combat match the original game`, () => {
    const game = testGame();
    game.state.crumbs = 9999;
    spawnAnt(game, 'basic', 0);
    const ant = game.state.ants[0];
    ant.emergence = null;
    ant.y = 450;
    ant.health = 3000;
    assert.equal(placeItem(game, type, 0, 150), true);
    const snapshots = [];
    for (let frame = 1; frame <= 240; frame++) {
      updateGame(game, 0.05);
      if ([1, 20, 60, 120, 240].includes(frame)) snapshots.push(snapshot(game));
    }
    assert.deepEqual(snapshots, baseline.marbles[type]);
  });
}
