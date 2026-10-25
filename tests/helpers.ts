import { createGame, startGame } from '../src/game/game';
import type { Game } from '../src/game/types';

export function seededRandom(initialSeed = 123456) {
  let seed = initialSeed;
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export function testGame(): Game {
  const game = createGame({ random: seededRandom() });
  startGame(game, 'free', 0);
  game.state.spawnQueue = [[9999, 'basic']];
  game.state.nextCrumbIn = 9999;
  return game;
}

export function snapshot(game: Game) {
  const state = game.state;
  return {
    crumbs: state.crumbs,
    screen: state.screen,
    marbles: state.marbles.map((marble) => ({
      type: marble.type,
      lane: marble.lane,
      y: marble.y,
      health: marble.health,
      velocityY: marble.velocityY,
      fallDistance: marble.fallDistance,
      falling: marble.isFalling,
      boosted: !!marble.boosted,
    })),
    ants: state.ants.map((ant) => ({
      type: ant.type,
      lane: ant.lane,
      x: ant.x,
      y: ant.y,
      health: ant.health,
      armor: ant.armor,
      slow: ant.slowRemaining,
      emerging: !!ant.emergence,
      burrowing: !!ant.traversal?.dig,
    })),
    shots: state.projectiles.map((shot) => ({ lane: shot.lane, y: shot.y, ice: shot.ice })),
    shards: state.shards.map((shard) => ({
      x: shard.x,
      y: shard.y,
      life: shard.lifeRemaining,
      durability: shard.durability,
    })),
    deaths: state.deaths.map((death) => ({
      kind: death.kind,
      x: death.x,
      y: death.y,
      elapsed: death.elapsed,
    })),
    drops: state.crumbDrops.map((drop) => ({ x: drop.x, y: drop.y, life: drop.lifeRemaining })),
  };
}
