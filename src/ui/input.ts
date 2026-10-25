import {
  callAnteater,
  cancelSelection,
  dropHeldItem,
  findNearestItem,
  placeItem,
  showNotification,
  toggleDebug,
  toggleGlove,
  togglePause,
} from '../game/actions';
import { spawnAnt } from '../game/combat';
import { CANVAS_HEIGHT, CANVAS_WIDTH, LANE_COUNT, TOOLBAR_HEIGHT } from '../game/constants';
import { ANT_TYPES } from '../game/definitions';
import { resetGame } from '../game/game';
import type { Game, Point } from '../game/types';
import {
  containsPoint,
  DEBUG_BUTTON,
  debugAntButton,
  laneAt,
  MENU_BUTTON,
  PAUSE_BUTTON,
  QUIT_CANCEL_BUTTON,
  QUIT_CONFIRM_BUTTON,
  TOOL_BUTTONS,
  toolbarSlot,
} from './layout';
import { getMenuButtons } from './menus';

export function canvasPoint(
  canvas: HTMLCanvasElement,
  event: Pick<PointerEvent, 'clientX' | 'clientY'>,
): Point {
  const bounds = canvas.getBoundingClientRect();
  // The bounding box includes the decorative border, so measure the content box instead.
  const innerWidth = canvas.clientWidth || bounds.width;
  const innerHeight = canvas.clientHeight || bounds.height;
  return {
    x: ((event.clientX - bounds.left - (canvas.clientLeft || 0)) * CANVAS_WIDTH) / innerWidth,
    y: ((event.clientY - bounds.top - (canvas.clientTop || 0)) * CANVAS_HEIGHT) / innerHeight,
  };
}

export function bindInput(canvas: HTMLCanvasElement, game: Game): () => void {
  const controller = new AbortController();
  const options = { signal: controller.signal };
  const movePointer = (point: Point) => {
    game.state.pointer = point;
    canvas.style.cursor = cursorFor(game, point);
  };
  canvas.addEventListener(
    'pointermove',
    (event) => {
      movePointer(canvasPoint(canvas, event as PointerEvent));
    },
    options,
  );
  canvas.addEventListener(
    'contextmenu',
    (event) => {
      event.preventDefault();
      cancelSelection(game);
    },
    options,
  );
  canvas.addEventListener(
    'pointerdown',
    (event) => {
      const pointerEvent = event as PointerEvent;
      if (pointerEvent.button === 0) {
        const point = canvasPoint(canvas, pointerEvent);
        // A tap has no hover, so move the pointer first: the placement preview
        // and button highlights then follow the finger.
        movePointer(point);
        handlePointerDown(game, point);
      }
    },
    options,
  );
  for (const name of ['pointerup', 'pointercancel', 'pointerleave'] as const) {
    canvas.addEventListener(
      name,
      (event) => {
        // Touch has no resting pointer, so clear it and leave no button looking hovered.
        if ((event as PointerEvent).pointerType !== 'mouse' || name === 'pointerleave') {
          movePointer(OFF_SCREEN_POINTER);
        }
      },
      options,
    );
  }
  window.addEventListener('keydown', (event) => handleKeyDown(game, event), options);
  // Losing the tab or window mid-wave should not cost the player a run.
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.hidden) {
        pauseForInterruption(game);
      }
    },
    options,
  );
  window.addEventListener('blur', () => pauseForInterruption(game), options);
  return () => controller.abort();
}

const OFF_SCREEN_POINTER: Point = { x: -1, y: -1 };

export function pauseForInterruption(game: Game) {
  if (game.state.screen === 'play' && !game.state.paused) {
    togglePause(game);
  }
}

/** Picks the mouse cursor that matches whatever is under the pointer. */
export function cursorFor(game: Game, point: Point): string {
  if (game.state.screen !== 'play') {
    return getMenuButtons(game).some((button) => !button.locked && containsPoint(point, button))
      ? 'pointer'
      : 'default';
  }
  if (game.state.confirmQuit) {
    return containsPoint(point, QUIT_CONFIRM_BUTTON) || containsPoint(point, QUIT_CANCEL_BUTTON)
      ? 'pointer'
      : 'default';
  }
  if (
    containsPoint(point, MENU_BUTTON) ||
    containsPoint(point, PAUSE_BUTTON) ||
    containsPoint(point, DEBUG_BUTTON)
  ) {
    return 'pointer';
  }
  if (game.state.paused) {
    return 'default';
  }
  if (point.y < TOOLBAR_HEIGHT) {
    const overSlot = game.state.availableItems.some((_, index) =>
      containsPoint(point, toolbarSlot(index)),
    );
    return overSlot ||
      (game.state.abilities.glove && containsPoint(point, TOOL_BUTTONS.glove)) ||
      (game.state.abilities.eater && containsPoint(point, TOOL_BUTTONS.eater))
      ? 'pointer'
      : 'default';
  }
  if (
    game.state.crumbDrops.some((crumb) => Math.hypot(crumb.x - point.x, crumb.y - point.y) < 24)
  ) {
    return 'pointer';
  }
  if (laneAt(point) < 0) {
    return 'default';
  }
  if (game.state.gloveActive) {
    return game.state.heldItem ? 'grabbing' : 'grab';
  }
  return game.state.selectedItem ? 'copy' : 'default';
}

export function handlePointerDown(game: Game, point: Point) {
  if (game.state.screen !== 'play') {
    const button = getMenuButtons(game).find(
      (button) => !button.locked && containsPoint(point, button),
    );
    if (button) {
      button.onClick();
    }
    return;
  }
  if (game.state.confirmQuit) {
    if (containsPoint(point, QUIT_CONFIRM_BUTTON)) {
      resetGame(game);
    } else if (containsPoint(point, QUIT_CANCEL_BUTTON)) {
      cancelQuit(game);
    }
    return;
  }
  if (containsPoint(point, MENU_BUTTON)) {
    requestQuit(game);
    return;
  }
  if (containsPoint(point, PAUSE_BUTTON)) {
    togglePause(game);
    return;
  }
  if (containsPoint(point, DEBUG_BUTTON)) {
    toggleDebug(game);
    return;
  }
  if (game.state.paused) {
    return;
  }
  if (game.debug) {
    for (let index = 0; index < ANT_TYPES.length; index++) {
      if (containsPoint(point, debugAntButton(index))) {
        spawnAnt(game, ANT_TYPES[index], Math.floor(game.random() * LANE_COUNT));
        return;
      }
    }
  }
  // The toolbar is painted over the board, so it must win any click it covers.
  if (point.y < TOOLBAR_HEIGHT) {
    for (const key of game.state.availableItems) {
      const index = game.state.availableItems.indexOf(key);
      if (containsPoint(point, toolbarSlot(index))) {
        const wasActive = game.state.selectedItem === key;
        cancelSelection(game);
        game.state.selectedItem = wasActive ? null : key;
        return;
      }
    }
    if (containsPoint(point, TOOL_BUTTONS.glove)) {
      toggleGlove(game);
    } else if (containsPoint(point, TOOL_BUTTONS.eater)) {
      callAnteater(game);
    }
    return;
  }
  for (const crumb of game.state.crumbDrops) {
    if (Math.hypot(crumb.x - point.x, crumb.y - point.y) < 24) {
      game.state.crumbs += crumb.value;
      crumb.lifeRemaining = 0;
      return;
    }
  }
  const lane = laneAt(point);
  if (lane < 0) {
    return;
  }
  if (game.state.gloveActive) {
    if (game.state.heldItem) {
      dropHeldItem(game, lane, point.y);
    } else {
      const item = findNearestItem(game, lane, point.y);
      if (item) {
        game.state.heldItem = item;
        if (item.isPiece) {
          game.state.trackPieces.splice(game.state.trackPieces.indexOf(item.entity), 1);
        } else {
          game.state.marbles.splice(game.state.marbles.indexOf(item.entity), 1);
        }
      }
    }
  } else if (game.state.selectedItem) {
    if (placeItem(game, game.state.selectedItem, lane, point.y)) {
      game.state.selectedItem = null;
    }
  } else {
    // no tool active: click a spring to cycle its strength
    const trackPiece = game.state.trackPieces.find(
      (candidate) =>
        candidate.type === 'spring' &&
        candidate.lane === lane &&
        Math.abs(candidate.y - point.y) < 24,
    );
    if (trackPiece) {
      trackPiece.strength = ((trackPiece.strength || 4) % 4) + 1;
      trackPiece.pulseRemaining = 0.3;
      showNotification(game, 'Spring strength ' + trackPiece.strength + '/4', 'info');
    }
  }
}

/** Pauses and asks before throwing away a run, so a stray tap cannot end it. */
export function requestQuit(game: Game) {
  if (game.state.screen !== 'play') {
    return;
  }
  game.state.confirmQuit = true;
  game.state.paused = true;
}

export function cancelQuit(game: Game) {
  game.state.confirmQuit = false;
  game.state.paused = false;
}

export type GameKeyEvent = Pick<KeyboardEvent, 'key' | 'preventDefault'> &
  Partial<Pick<KeyboardEvent, 'ctrlKey' | 'metaKey' | 'altKey'>>;

export function handleKeyDown(game: Game, event: GameKeyEvent) {
  // Browser and OS shortcuts such as Cmd+1 or Ctrl+- are not game input.
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }
  if (event.key === 'F2') {
    event.preventDefault();
    toggleDebug(game);
    return;
  }
  if (game.state.screen !== 'play') {
    handleMenuKeyDown(game, event);
    return;
  }
  if (game.state.confirmQuit) {
    if (event.key === 'Escape') {
      cancelQuit(game);
    } else if (event.key === 'Enter') {
      resetGame(game);
    }
    return;
  }
  if (event.key === 'p' || event.key === 'P') {
    togglePause(game);
    return;
  }
  if (game.state.paused) {
    return;
  }
  if (event.key === 'Escape') {
    cancelSelection(game);
  }
  if (event.key === 'g' || event.key === 'G') {
    toggleGlove(game);
  }
  if (event.key === 'e' || event.key === 'E') {
    callAnteater(game);
  }
  const index =
    event.key === '0'
      ? 9
      : event.key === '-'
        ? 10
        : event.key === '='
          ? 11
          : parseInt(event.key) - 1;
  if (index >= 0 && index < game.state.availableItems.length) {
    cancelSelection(game);
    game.state.selectedItem = game.state.availableItems[index];
  }
}

/** Arrow keys move between menu buttons and Enter presses the focused one. */
function handleMenuKeyDown(game: Game, event: GameKeyEvent) {
  const buttons = getMenuButtons(game).filter((button) => !button.locked);
  if (!buttons.length) {
    return;
  }
  const current = focusedMenuIndex(game);
  const step =
    event.key === 'ArrowDown' || event.key === 'ArrowRight' || event.key === 'Tab'
      ? 1
      : event.key === 'ArrowUp' || event.key === 'ArrowLeft'
        ? -1
        : 0;
  if (step) {
    event.preventDefault();
    const next = current < 0 ? (step > 0 ? 0 : buttons.length - 1) : current + step;
    game.state.menuFocus = {
      screen: game.state.screen,
      index: (next + buttons.length) % buttons.length,
    };
    return;
  }
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    game.state.menuFocus = null;
    buttons[Math.max(0, current)].onClick();
  }
}

/** The focused button index for the current screen, or -1 when nothing is focused. */
export function focusedMenuIndex(game: Game) {
  const focus = game.state.menuFocus;
  return focus && focus.screen === game.state.screen ? focus.index : -1;
}
