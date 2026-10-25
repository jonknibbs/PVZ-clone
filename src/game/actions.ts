import {
  ANTEATER_COOLDOWN,
  BOARD_BOTTOM,
  GLOVE_COOLDOWN,
  INITIAL_ROLL_SPEED,
  LANE_COUNT,
  MIN_DROP_Y,
} from './constants';
import { ITEM_DEFINITIONS, isTrackType } from './definitions';
import type { Game, HeldItem, ItemType, NotificationTone } from './types';

/** Keeps a drop inside the playable part of a lane. */
export function clampDropY(y: number) {
  return Math.max(MIN_DROP_Y, Math.min(BOARD_BOTTOM - 60, y));
}

/**
 * Shared affordability check for buying a new item. Always explains itself, so a
 * click that cannot do anything never passes silently.
 */
function canAfford(game: Game, type: ItemType) {
  if (game.debug) {
    return true;
  }
  const definition = ITEM_DEFINITIONS[type];
  const cooldown = game.state.cooldowns[type];
  if (cooldown > 0) {
    showNotification(game, `${definition.name} is recharging: ${Math.ceil(cooldown)}s`);
    return false;
  }
  if (game.state.crumbs < definition.cost) {
    const short = Math.ceil(definition.cost - game.state.crumbs);
    showNotification(game, `${definition.name} costs ${definition.cost} — ${short} more crumbs.`);
    return false;
  }
  return true;
}

/**
 * Shared lane and overlap rules for both buying an item and putting down a
 * carried one. `y` must already be clamped with `clampDropY`.
 */
export function validatePlacement(game: Game, type: ItemType, lane: number, y: number) {
  if (!isTrackType(type)) {
    return true;
  }
  const definition = ITEM_DEFINITIONS[type];
  if (
    definition.direction &&
    (lane + definition.direction < 0 || lane + definition.direction >= LANE_COUNT)
  ) {
    showNotification(game, 'No lane that way!');
    return false;
  }
  if (game.state.trackPieces.some((piece) => piece.lane === lane && Math.abs(piece.y - y) < 44)) {
    showNotification(game, 'Track piece already there!');
    return false;
  }
  return true;
}

export function placeItem(game: Game, type: ItemType, lane: number, y: number) {
  const definition = ITEM_DEFINITIONS[type];
  if (!canAfford(game, type)) {
    return false;
  }
  y = clampDropY(y);
  if (!validatePlacement(game, type, lane, y)) {
    return false;
  }
  game.state.crumbs -= definition.cost;
  game.state.cooldowns[type] = definition.cooldown;
  if (isTrackType(type)) {
    game.state.trackPieces.push({ type: type, lane: lane, y: y, pulseRemaining: 0, strength: 4 });
    return true;
  }
  const marbleDefinition = ITEM_DEFINITIONS[type];
  game.state.marbles.push({
    type: type,
    lane: lane,
    y: y,
    health: marbleDefinition.health,
    maxHealth: marbleDefinition.health,
    elapsed: 0,
    fuseRemaining: 0.8,
    touchingAnt: false,
    poisonRemaining: 0,
    velocityY: INITIAL_ROLL_SPEED,
    fallDistance: 0,
    isFalling: true,
    lastTrackPiece:
      game.state.trackPieces.find(
        (candidate) => candidate.lane === lane && Math.abs(candidate.y - y) <= 16,
      ) || null,
    laneOffsetX: 0,
  });
  return true;
}

export function callAnteater(game: Game) {
  if (game.state.screen !== 'play' || game.state.anteater || !game.state.abilities.eater) {
    return;
  }
  if (game.state.anteaterCooldown > 0) {
    showNotification(game, 'Ant Eater is resting: ' + Math.ceil(game.state.anteaterCooldown) + 's');
    return;
  }
  game.state.anteater = { y: BOARD_BOTTOM + 120 };
  game.state.anteaterCooldown = ANTEATER_COOLDOWN;
}

export function showNotification(game: Game, text: string, tone: NotificationTone = 'error') {
  // Errors linger a little longer than neutral status messages.
  game.state.notification = { text, lifeRemaining: tone === 'error' ? 2.4 : 1.5, tone };
}

export function toggleDebug(game: Game) {
  game.debug = !game.debug;
  if (game.debug) {
    // Remember the real crumb count so switching debug off does not hand out 9,999 crumbs.
    game.debugCrumbsBackup = game.state.crumbs;
    game.state.crumbs = 9999;
    game.state.debugUsed = true;
  } else {
    game.state.crumbs = game.debugCrumbsBackup ?? game.state.crumbs;
    game.debugCrumbsBackup = null;
  }
  showNotification(
    game,
    'Debug mode ' + (game.debug ? 'ON: infinite crumbs' : 'OFF'),
    game.debug ? 'error' : 'info',
  );
}

export function togglePause(game: Game) {
  if (game.state.screen === 'play') {
    game.state.paused = !game.state.paused;
  }
}

export function toggleGlove(game: Game) {
  if (game.state.screen !== 'play' || !game.state.abilities.glove) {
    return;
  }
  const wasActive = game.state.gloveActive;
  if (!wasActive && game.state.gloveCooldown > 0) {
    showNotification(game, 'Glove is resting: ' + Math.ceil(game.state.gloveCooldown) + 's');
    return;
  }
  cancelSelection(game);
  game.state.gloveActive = !wasActive;
}

export function cancelSelection(game: Game) {
  if (game.state.heldItem) {
    // put a carried item back where it came from
    const heldItem = game.state.heldItem;
    if (heldItem.isPiece) {
      game.state.trackPieces.push(heldItem.entity);
    } else {
      game.state.marbles.push(heldItem.entity);
    }
  }
  game.state.heldItem = null;
  game.state.selectedItem = null;
  game.state.gloveActive = false;
}

export function findNearestItem(game: Game, lane: number, y: number): HeldItem | null {
  let nearest: HeldItem | null = null;
  for (const marble of game.state.marbles) {
    if (
      marble.lane === lane &&
      Math.abs(marble.y - y) < 34 &&
      (!nearest || Math.abs(marble.y - y) < Math.abs(nearest.entity.y - y))
    ) {
      nearest = { isPiece: false, entity: marble };
    }
  }
  for (const piece of game.state.trackPieces) {
    if (
      piece.lane === lane &&
      Math.abs(piece.y - y) < 24 &&
      (!nearest || Math.abs(piece.y - y) < Math.abs(nearest.entity.y - y))
    ) {
      nearest = { isPiece: true, entity: piece };
    }
  }
  return nearest;
}

export function dropHeldItem(game: Game, lane: number, y: number) {
  const heldItem = game.state.heldItem;
  if (!heldItem) {
    showNotification(game, 'Pick up an item before putting it down.');
    return;
  }
  y = clampDropY(y);
  if (!validatePlacement(game, heldItem.entity.type, lane, y)) {
    return;
  }
  if (heldItem.isPiece) {
    const entity = heldItem.entity;
    entity.lane = lane;
    entity.y = y;
    game.state.trackPieces.push(entity);
  } else {
    const entity = heldItem.entity;
    entity.lane = lane;
    entity.y = y;
    entity.velocityY = INITIAL_ROLL_SPEED;
    entity.isFalling = false;
    entity.fallDistance = 0;
    entity.boosted = false;
    entity.laneOffsetX = 0;
    entity.lastTrackPiece =
      game.state.trackPieces.find(
        (candidate) => candidate.lane === lane && Math.abs(candidate.y - y) <= 16,
      ) || null;
    game.state.marbles.push(entity);
  }
  game.state.heldItem = null;
  game.state.gloveActive = false;
  game.state.gloveCooldown = GLOVE_COOLDOWN; // cooldown starts once an item is put down
}
