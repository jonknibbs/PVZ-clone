import {
  damageAnt,
  explodeMarble,
  fireProjectile,
  queueDeathAnimation,
  shatterMarble,
} from './combat';
import {
  BOARD_BOTTOM,
  BOOST_DAMAGE_MULTIPLIER,
  BOOST_DISTANCE_BONUS,
  BOOST_SPEED,
  CANVAS_HEIGHT,
  GRAVITY,
  INITIAL_ROLL_SPEED,
  LANE_COUNT,
  LANE_WIDTH,
  MARBLE_ANT_CONTACT_DISTANCE,
  MARBLE_SPACING,
  MAX_FALL_SPEED,
  MIN_DROP_Y,
  RING_REWARD,
  TWIN_SHOT_DELAY,
  laneCenterX,
} from './constants';
import { ITEM_DEFINITIONS } from './definitions';
import type { Game, Marble } from './types';

export function updateMarbles(game: Game, deltaSeconds: number) {
  // Lowest-first processing allows a marble to queue behind an ant-blocked marble.
  for (const marble of [...game.state.marbles].sort((lower, upper) => upper.y - lower.y)) {
    updateMarble(game, marble, deltaSeconds);
  }
  for (const marble of game.state.marbles) {
    if (marble.type === 'bomb' && marble.health <= 0 && !marble.exploded) {
      explodeMarble(game, marble);
    }
  }
  for (const marble of game.state.marbles) {
    if (marble.health <= 0) {
      queueDeathAnimation(game, 'marble', marble, laneCenterX(marble.lane), marble.y);
    }
  }
  game.state.marbles = game.state.marbles.filter((marble) => marble.health > 0);
}

function updateMarble(game: Game, marble: Marble, deltaSeconds: number) {
  marble.elapsed += deltaSeconds;
  if (marble.poisonRemaining > 0) {
    marble.poisonRemaining -= deltaSeconds;
    marble.health -= 7 * deltaSeconds;
  }
  marble.touchingAnt = false;
  marble.isBlockedByAnt = false;
  const rising = marble.velocityY < 0;
  const blocked = resolveMarbleContact(game, marble, rising);
  if (marble.type === 'glass' && blocked && !rising) {
    shatterMarble(game, marble);
    return;
  }
  moveMarble(marble, blocked, deltaSeconds);
  updateTrackInteraction(game, marble, blocked);
  updateMarbleAbility(game, marble, deltaSeconds);
}

function resolveMarbleContact(game: Game, marble: Marble, rising: boolean): boolean {
  let blocked = !rising && marble.y >= BOARD_BOTTOM - 30;
  if (!rising) {
    for (const ant of game.state.ants) {
      if (
        ant.health > 0 &&
        !ant.emergence &&
        (ant.spansAllLanes || ant.lane === marble.lane) &&
        ant.y > marble.y &&
        ant.y - marble.y < MARBLE_ANT_CONTACT_DISTANCE &&
        !ant.traversal
      ) {
        blocked = true;
        marble.touchingAnt = true;
        marble.isBlockedByAnt = true;
        if (marble.isFalling && marble.fallDistance > 0) {
          // landing on an ant: damage scales with marble weight and drop height
          const damage = Math.round(
            ((ITEM_DEFINITIONS[marble.type].mass * marble.fallDistance) / 100) *
              (marble.boosted ? BOOST_DAMAGE_MULTIPLIER : 1),
          );
          if (damage > 0) {
            damageAnt(ant, damage);
            game.state.effects.push({
              x: ant.x,
              y: ant.y - 20,
              elapsed: 0,
              duration: 0.8,
              kind: 'dmg',
              text: '-' + damage,
            });
          }
        }
        marble.isFalling = false;
      }
    }
    if (!marble.isBlockedByAnt) {
      for (const candidate of game.state.marbles) {
        if (
          candidate !== marble &&
          candidate.isBlockedByAnt &&
          candidate.lane === marble.lane &&
          candidate.y > marble.y &&
          candidate.y - marble.y < MARBLE_SPACING
        ) {
          blocked = true;
          marble.isBlockedByAnt = true;
        }
      }
    }
  }
  return blocked;
}

function moveMarble(marble: Marble, blocked: boolean, deltaSeconds: number) {
  if (!blocked) {
    marble.velocityY = Math.min(
      marble.boosted ? BOOST_SPEED : MAX_FALL_SPEED,
      marble.velocityY + GRAVITY * deltaSeconds,
    );
    const nextY = Math.min(BOARD_BOTTOM - 30, marble.y + marble.velocityY * deltaSeconds);
    if (marble.isFalling && nextY > marble.y) {
      marble.fallDistance += nextY - marble.y;
    }
    marble.y = nextY;
  } else {
    marble.velocityY = INITIAL_ROLL_SPEED;
    marble.isFalling = false;
    marble.boosted = false;
  }
  marble.isRolling = !blocked;
  if (marble.laneOffsetX) {
    marble.laneOffsetX -=
      Math.sign(marble.laneOffsetX) *
      Math.min(Math.abs(marble.laneOffsetX), (LANE_WIDTH * deltaSeconds) / 0.35);
  }
}

function updateTrackInteraction(game: Game, marble: Marble, blocked: boolean) {
  if (
    marble.lastTrackPiece &&
    (marble.lastTrackPiece.lane !== marble.lane ||
      Math.abs(marble.y - marble.lastTrackPiece.y) > 40)
  ) {
    marble.lastTrackPiece = null;
  }
  if (!marble.lastTrackPiece && !blocked && marble.velocityY > 0) {
    for (const trackPiece of game.state.trackPieces) {
      if (trackPiece.lane !== marble.lane || Math.abs(marble.y - trackPiece.y) > 16) {
        continue;
      }
      if (trackPiece.type === 'boost') {
        marble.lastTrackPiece = trackPiece;
        trackPiece.pulseRemaining = 0.3;
        marble.velocityY = BOOST_SPEED;
        marble.boosted = true;
        marble.isFalling = true;
        marble.fallDistance += BOOST_DISTANCE_BONUS;
      } else if (trackPiece.type === 'ring') {
        marble.lastTrackPiece = trackPiece;
        trackPiece.pulseRemaining = 0.3;
        game.state.crumbs += RING_REWARD;
        game.state.effects.push({
          x: laneCenterX(trackPiece.lane),
          y: trackPiece.y - 24,
          elapsed: 0,
          duration: 0.8,
          kind: 'dmg',
          text: '+' + RING_REWARD,
        });
      } else if (trackPiece.type === 'spring') {
        marble.lastTrackPiece = trackPiece;
        trackPiece.pulseRemaining = 0.3;
        marble.velocityY = -Math.sqrt(
          2 *
            GRAVITY *
            Math.max(
              40,
              (Math.max(60, marble.y - MIN_DROP_Y + 10) * (trackPiece.strength || 4)) / 4,
            ),
        );
        marble.isFalling = true;
        marble.fallDistance = 0;
      } else {
        const nextLane = marble.lane + ITEM_DEFINITIONS[trackPiece.type].direction;
        if (nextLane < 0 || nextLane >= LANE_COUNT) {
          continue;
        }
        marble.lastTrackPiece = trackPiece;
        trackPiece.pulseRemaining = 0.3;
        marble.laneOffsetX = laneCenterX(marble.lane) - laneCenterX(nextLane);
        marble.lane = nextLane;
      }
      break;
    }
  }
}

function updateMarbleAbility(game: Game, marble: Marble, deltaSeconds: number) {
  if (marble.twinShotRemaining) {
    // Counted down with game time, so a paused game never fires the follow-up shot.
    marble.twinShotRemaining = Math.max(0, marble.twinShotRemaining - deltaSeconds);
    if (marble.twinShotRemaining === 0) {
      fireProjectile(game, marble, false);
    }
  }
  const antBelow = game.state.ants.some(
    (ant) =>
      ant.health > 0 &&
      !ant.emergence &&
      (ant.spansAllLanes || ant.lane === marble.lane) &&
      ant.y > marble.y,
  );
  if (marble.type === 'gold' && marble.elapsed >= 10) {
    marble.elapsed = 0;
    game.state.crumbDrops.push({
      x: laneCenterX(marble.lane),
      y: marble.y,
      targetY: marble.y + 25,
      speed: 60,
      value: 25,
      lifeRemaining: 10,
    });
  }
  if ((marble.type === 'red' || marble.type === 'blue') && antBelow && marble.elapsed >= 1.4) {
    marble.elapsed = 0;
    fireProjectile(game, marble, marble.type === 'blue');
  }
  if (marble.type === 'twin' && antBelow && marble.elapsed >= 1.4) {
    marble.elapsed = 0;
    fireProjectile(game, marble, false);
    marble.twinShotRemaining = TWIN_SHOT_DELAY;
  }
  if (marble.type === 'bomb' && marble.touchingAnt) {
    marble.fuseRemaining -= deltaSeconds;
    if (marble.fuseRemaining <= 0) {
      explodeMarble(game, marble);
    }
  }
}

export function updateProjectiles(game: Game, deltaSeconds: number) {
  for (const projectile of game.state.projectiles) {
    projectile.y += 300 * deltaSeconds;
    for (const ant of game.state.ants) {
      if (
        (ant.lane === projectile.lane || ant.spansAllLanes) &&
        ant.health > 0 &&
        !ant.emergence &&
        !(ant.traversal && ant.traversal.dig) &&
        Math.abs(ant.y - projectile.y) < (ant.spansAllLanes ? 30 : 18)
      ) {
        damageAnt(ant, projectile.ice ? 20 : 25, true);
        if (projectile.ice) {
          ant.slowRemaining = 3;
        }
        projectile.dead = true;
        break;
      }
    }
    if (projectile.y > CANVAS_HEIGHT) {
      projectile.dead = true;
    }
  }
  game.state.projectiles = game.state.projectiles.filter((projectile) => !projectile.dead);
}
