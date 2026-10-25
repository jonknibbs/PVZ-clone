import {
  ANT_SPEED_SCALE,
  BOARD_BOTTOM,
  BOARD_Y,
  LANE_COUNT,
  MARBLE_ANT_CONTACT_DISTANCE,
  MARBLE_SPACING,
  laneCenterX,
} from './constants';
import { ANT_DEFINITIONS } from './definitions';
import type { Ant, Game, Marble } from './types';

export function updateAnts(game: Game, deltaSeconds: number) {
  for (const ant of game.state.ants) {
    if (ant.health <= 0) {
      continue;
    }
    const definition = ANT_DEFINITIONS[ant.type];
    ant.slowRemaining = Math.max(0, ant.slowRemaining - deltaSeconds);
    ant.flashRemaining = Math.max(0, ant.flashRemaining - deltaSeconds);
    ant.animationPhase += deltaSeconds * 8;
    if (advanceEmergence(ant, deltaSeconds)) {
      continue;
    }
    const speed =
      definition.speed *
      ANT_SPEED_SCALE *
      (game.state.antSpeedMultiplier || 1) *
      (ant.slowRemaining > 0 ? 0.5 : 1);
    if (advanceTraversal(ant, deltaSeconds)) {
      continue;
    }
    if (ant.spansAllLanes) {
      updateQueen(game, ant, speed, deltaSeconds);
    } else {
      const blocker = findMarbleAhead(game, ant.lane, ant.y, MARBLE_ANT_CONTACT_DISTANCE);
      if (blocker) {
        if (startTraversal(ant)) {
          continue;
        }
        blocker.health -= definition.damagePerSecond * deltaSeconds;
      } else {
        const target =
          ant.type === 'spitter'
            ? findMarbleAhead(game, ant.lane, ant.y, ANT_DEFINITIONS.spitter.range)
            : null;
        if (target) {
          updateSpitter(game, ant, target, deltaSeconds);
        } else {
          ant.y -= speed * deltaSeconds;
        }
      }
    }
    if (ant.y < BOARD_Y - 5) {
      if (game.mode === 'sandbox') {
        ant.health = 0;
      } else {
        game.state.screen = 'lose';
      }
    }
  }
}

function advanceEmergence(ant: Ant, deltaSeconds: number): boolean {
  if (!ant.emergence) {
    return false;
  }
  const emergence = ant.emergence;
  emergence.elapsed += deltaSeconds;
  const progress = Math.max(0, Math.min(1, emergence.elapsed / emergence.duration));
  const eased = progress * progress * (3 - 2 * progress);
  ant.y = emergence.startY + (emergence.endY - emergence.startY) * eased;
  if (progress === 1) {
    ant.emergence = null;
  }
  return true;
}

function advanceTraversal(ant: Ant, deltaSeconds: number): boolean {
  if (!ant.traversal) {
    return false;
  }
  const traversal = ant.traversal;
  traversal.progress += deltaSeconds / (traversal.duration || 0.6);
  const progress = Math.min(1, traversal.progress);
  ant.y = traversal.startY + (traversal.endY - traversal.startY) * progress;
  ant.jumpHeight = traversal.dig ? 0 : Math.sin(progress * Math.PI) * 14;
  if (progress >= 1) {
    ant.traversal = null;
    ant.jumpHeight = 0;
  }
  return true;
}

function startTraversal(ant: Ant): boolean {
  if (ant.type === 'jumper' && !ant.hasJumped) {
    ant.hasJumped = true;
    ant.traversal = { progress: 0, startY: ant.y, endY: ant.y - MARBLE_SPACING * 1.6 };
    return true;
  }
  const distance = ANT_DEFINITIONS[ant.type].burrowDistance;
  if ((ant.digsRemaining ?? 0) > 0 && distance !== undefined) {
    ant.digsRemaining = (ant.digsRemaining ?? 0) - 1;
    ant.traversal = {
      progress: 0,
      startY: ant.y,
      endY: Math.max(BOARD_Y - 4, ant.y - distance),
      dig: true,
      duration: 1.4,
    };
    return true;
  }
  return false;
}

function findMarbleAhead(game: Game, lane: number, y: number, range: number): Marble | null {
  let nearest: Marble | null = null;
  for (const marble of game.state.marbles) {
    if (
      marble.lane === lane &&
      marble.y < y &&
      y - marble.y < range &&
      (!nearest || marble.y > nearest.y)
    ) {
      nearest = marble;
    }
  }
  return nearest;
}

function updateSpitter(game: Game, ant: Ant, target: Marble, deltaSeconds: number) {
  ant.spitCooldown -= deltaSeconds;
  if (ant.spitCooldown > 0) {
    return;
  }
  ant.spitCooldown = 2;
  target.health -= 12;
  target.poisonRemaining = 4;
  game.state.effects.push({
    x: ant.x,
    y: ant.y,
    targetX: laneCenterX(target.lane),
    targetY: target.y,
    elapsed: 0,
    duration: 0.25,
    kind: 'spit',
  });
}

function updateQueen(game: Game, queen: Ant, speed: number, deltaSeconds: number) {
  const definition = ANT_DEFINITIONS.queen;
  let chewing = false;
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    const blocker = findMarbleAhead(game, lane, queen.y, MARBLE_ANT_CONTACT_DISTANCE);
    if (blocker) {
      blocker.health -= definition.damagePerSecond * deltaSeconds;
      chewing = true;
    }
  }
  queen.broodRemaining = (queen.broodRemaining ?? definition.broodInterval) - deltaSeconds;
  if (queen.broodRemaining <= 0 && game.state.ants.length < 45) {
    queen.broodRemaining = definition.broodInterval;
    spawnQueenBrood(game, queen);
  }
  if (!chewing) {
    queen.y -= speed * deltaSeconds;
  }
}

function spawnQueenBrood(game: Game, queen: Ant) {
  const definition = ANT_DEFINITIONS.queen;
  const babyDefinition = ANT_DEFINITIONS.swarm;
  for (let index = 0; index < definition.babies; index++) {
    const lane = Math.floor(game.random() * LANE_COUNT);
    game.state.ants.push({
      type: 'swarm',
      lane,
      x: laneCenterX(lane) + (game.random() - 0.5) * 30,
      y: Math.min(BOARD_BOTTOM + 40, queen.y + definition.length * 0.7) + game.random() * 30,
      health: babyDefinition.health * (game.state.antHealthMultiplier || 1),
      maxHealth: babyDefinition.health * (game.state.antHealthMultiplier || 1),
      armor: 0,
      slowRemaining: 0,
      flashRemaining: 0,
      animationPhase: game.random() * 6,
      hasJumped: false,
      traversal: null,
      jumpHeight: 0,
      spitCooldown: 1,
    });
  }
  game.state.effects.push({
    x: queen.x,
    y: queen.y + definition.length * 0.6,
    elapsed: 0,
    duration: 0.4,
    kind: 'puff',
  });
}
