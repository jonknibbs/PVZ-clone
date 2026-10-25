import { updateAnts } from './ants';
import { damageAnt, queueDeathAnimation, spawnAnt } from './combat';
import {
  ANTEATER_SPEED,
  BOARD_X,
  BOARD_Y,
  LANE_COUNT,
  LANE_LENGTH,
  LANE_WIDTH,
  QUEEN_ANTEATER_DAMAGE,
  SHARD_DAMAGE_PER_SECOND,
  SHARD_RADIUS,
} from './constants';
import { ITEM_ORDER } from './definitions';
import { updateMarbles, updateProjectiles } from './marbles';
import { unlockLevel } from './preferences';
import { updateTutorial } from './tutorial';
import type { Game } from './types';

export function updateGame(game: Game, deltaSeconds: number) {
  if (game.state.notification) {
    game.state.notification.lifeRemaining -= deltaSeconds;
    if (game.state.notification.lifeRemaining <= 0) {
      game.state.notification = null;
    }
  }
  if (game.state.screen !== 'play' || game.state.paused) {
    return;
  }
  updateFrameTimers(game, deltaSeconds);
  updateShards(game, deltaSeconds);
  updateAnteater(game, deltaSeconds);
  updateSpawns(game, deltaSeconds);
  updateMarbles(game, deltaSeconds);
  updateProjectiles(game, deltaSeconds);
  updateAnts(game, deltaSeconds);
  removeDefeatedAnts(game);
  updateTransientEffects(game, deltaSeconds);
  if (game.state.tutorial) {
    updateTutorial(game, deltaSeconds);
  } else if (game.mode !== 'sandbox') {
    checkVictory(game);
  }
}

function updateFrameTimers(game: Game, deltaSeconds: number) {
  if (game.debug) {
    if (game.debugCrumbsBackup === null) {
      game.debugCrumbsBackup = game.state.crumbs;
    }
    game.state.crumbs = 9999;
    game.state.debugUsed = true;
    for (const itemType of ITEM_ORDER) {
      game.state.cooldowns[itemType] = 0;
    }
    game.state.gloveCooldown = 0;
  }
  game.state.elapsed += deltaSeconds;
  if (!game.state.heldItem) {
    game.state.gloveCooldown = Math.max(0, game.state.gloveCooldown - deltaSeconds);
  }
  for (const trackPiece of game.state.trackPieces) {
    trackPiece.pulseRemaining = Math.max(0, trackPiece.pulseRemaining - deltaSeconds);
  }
}

function updateShards(game: Game, deltaSeconds: number) {
  for (const shard of game.state.shards) {
    shard.lifeRemaining -= deltaSeconds;
    for (const ant of game.state.ants) {
      if (
        !ant.emergence &&
        !ant.traversal &&
        (ant.spansAllLanes || Math.abs(ant.x - shard.x) < SHARD_RADIUS) &&
        Math.abs(ant.y - shard.y) < SHARD_RADIUS
      ) {
        ant.health -= SHARD_DAMAGE_PER_SECOND * deltaSeconds;
        shard.durability -= SHARD_DAMAGE_PER_SECOND * deltaSeconds;
      }
    }
  }
  game.state.shards = game.state.shards.filter(
    (shard) => shard.lifeRemaining > 0 && shard.durability > 0,
  );
}

function updateAnteater(game: Game, deltaSeconds: number) {
  if (game.state.anteater) {
    game.state.anteater.y -= ANTEATER_SPEED * deltaSeconds;
    for (const ant of game.state.ants) {
      if (ant.y > game.state.anteater.y - 70) {
        if (!ant.spansAllLanes) {
          ant.health = 0;
        } else if (ant.eatenBy !== game.state.anteater) {
          ant.eatenBy = game.state.anteater;
          damageAnt(ant, QUEEN_ANTEATER_DAMAGE);
          game.state.effects.push({
            x: ant.x,
            y: ant.y + 30,
            elapsed: 0,
            duration: 0.8,
            kind: 'dmg',
            text: '-' + QUEEN_ANTEATER_DAMAGE,
          });
        }
      }
    }
    if (game.state.anteater.y < BOARD_Y - 110) {
      game.state.anteater = null;
    }
  } else {
    game.state.anteaterCooldown = Math.max(0, game.state.anteaterCooldown - deltaSeconds);
  }
}

function updateSpawns(game: Game, deltaSeconds: number) {
  for (const itemType of ITEM_ORDER) {
    game.state.cooldowns[itemType] = Math.max(0, game.state.cooldowns[itemType] - deltaSeconds);
  }
  game.state.nextCrumbIn -= deltaSeconds;
  if (game.state.nextCrumbIn <= 0 && !game.state.tutorial) {
    game.state.nextCrumbIn =
      game.state.crumbInterval + game.random() * game.state.crumbIntervalJitter;
    game.state.crumbDrops.push({
      x: BOARD_X + 30 + game.random() * (LANE_COUNT * LANE_WIDTH - 60),
      y: -10,
      targetY: BOARD_Y + 60 + game.random() * LANE_LENGTH * 0.8,
      speed: 40,
      value: 25,
      lifeRemaining: 10,
    });
  }
  while (game.state.spawnQueue.length && game.state.spawnQueue[0][0] <= game.state.elapsed) {
    const nextSpawn = game.state.spawnQueue.shift();
    if (!nextSpawn) {
      throw new Error('The invasion schedule unexpectedly became empty.');
    }
    const [, type] = nextSpawn;
    const lane = Math.floor(game.random() * LANE_COUNT);
    spawnAnt(game, type, lane);
  }
}

function removeDefeatedAnts(game: Game) {
  for (const ant of game.state.ants) {
    if (ant.health <= 0) {
      queueDeathAnimation(game, 'ant', ant, ant.x, ant.y);
      game.state.effects.push({ x: ant.x, y: ant.y, elapsed: 0, duration: 0.4, kind: 'puff' });
    }
  }
  game.state.ants = game.state.ants.filter((ant) => ant.health > 0);
}

function updateTransientEffects(game: Game, deltaSeconds: number) {
  for (const drop of game.state.crumbDrops) {
    if (drop.y < drop.targetY) {
      drop.y += drop.speed * deltaSeconds;
    } else {
      drop.lifeRemaining -= deltaSeconds;
    }
  }
  game.state.crumbDrops = game.state.crumbDrops.filter((drop) => drop.lifeRemaining > 0);
  for (const animation of game.state.deaths) {
    animation.elapsed += deltaSeconds;
  }
  game.state.deaths = game.state.deaths.filter(
    (animation) => animation.elapsed < animation.duration,
  );
  for (const effect of game.state.effects) {
    effect.elapsed += deltaSeconds;
  }
  game.state.effects = game.state.effects.filter((effect) => effect.elapsed < effect.duration);
}

function checkVictory(game: Game) {
  if (!game.state.spawnQueue.length && !game.state.ants.length) {
    game.state.screen = 'win';
    // A win with debug mode's infinite crumbs should not unlock the next level.
    if (game.mode === 'campaign' && !game.state.debugUsed) {
      unlockLevel(game, game.levelIndex + 2);
    }
  }
}
