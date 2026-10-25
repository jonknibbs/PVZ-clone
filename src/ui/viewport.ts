import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../game/constants';
import type { Point, Rectangle, Screen } from '../game/types';

/** Maps world (900x700) coordinates onto the canvas: canvas = world * scale + offset. */
export interface ViewTransform {
  x: number;
  y: number;
  scale: number;
}

export interface ControlPanel {
  crumbs: Rectangle;
  invasion: Rectangle;
  /** One cell per toolbar position; positions stay fixed whatever is unlocked. */
  slots: Rectangle[];
  eater: Rectangle;
  glove: Rectangle;
  pause: Rectangle;
  menu: Rectangle;
  debug: Rectangle;
}

export interface Layout {
  kind: 'desktop' | 'compact';
  /** Logical canvas size: 900x700 on desktop, CSS pixels in compact mode. */
  width: number;
  height: number;
  /** Used while playing. */
  world: ViewTransform;
  /** Used on menu screens, which show the menu panel region of the world. */
  menuWorld: ViewTransform;
  /** The canvas area menus are drawn into in compact mode. */
  menuClip: Rectangle | null;
  /** The canvas area the board is drawn into in compact mode. */
  boardClip: Rectangle | null;
  panel: ControlPanel | null;
  debugAnts: Rectangle[];
}

const IDENTITY: ViewTransform = { x: 0, y: 0, scale: 1 };

export const DESKTOP_LAYOUT: Layout = {
  kind: 'desktop',
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  world: IDENTITY,
  menuWorld: IDENTITY,
  menuClip: null,
  boardClip: null,
  panel: null,
  debugAnts: [],
};

/** The part of the world that holds the board, from the drop chute to the ant hills. */
export const BOARD_CROP: Rectangle = { x: 184, y: 90, width: 532, height: 610 };

/** Menu panels, their buttons and the notification line above them. */
export const MENU_CROP: Rectangle = { x: 174, y: 20, width: 552, height: 680 };

export const TOOLBAR_SLOT_COUNT = 12;
const PAD = 8;
const GAP = 6;
const MAX_SLOT_WIDTH = 140;
const MAX_SLOT_HEIGHT = 120;

/**
 * Landscape phones and tablets get the compact layout; desktop and laptop keep
 * the original page. Portrait phones keep it too, with a hint to rotate.
 */
export function chooseLayoutKind(
  width: number,
  height: number,
  coarsePointer: boolean,
): Layout['kind'] {
  const landscapePhone = width > height && height <= 540;
  const shortSide = Math.min(width, height);
  const tablet = coarsePointer && shortSide >= 600 && shortSide <= 1024;
  return landscapePhone || tablet ? 'compact' : 'desktop';
}

export function computeCompactLayout(width: number, height: number, antCount: number): Layout {
  const landscape = width > height;
  const scale = landscape
    ? Math.min(height / BOARD_CROP.height, (width * 0.5) / BOARD_CROP.width)
    : Math.min(width / BOARD_CROP.width, (height * 0.6) / BOARD_CROP.height);
  const boardWidth = BOARD_CROP.width * scale;
  const boardHeight = BOARD_CROP.height * scale;
  let boardClip: Rectangle;
  let panel: ControlPanel;
  if (landscape) {
    // Utilities on the left thumb, the item grid on the right thumb, board between.
    const leftWidth = Math.round((width - boardWidth) * 0.4);
    boardClip = {
      x: leftWidth,
      y: (height - boardHeight) / 2,
      width: boardWidth,
      height: boardHeight,
    };
    const left = inset({ x: 0, y: 0, width: leftWidth, height });
    const right = inset({
      x: leftWidth + boardWidth,
      y: 0,
      width: width - leftWidth - boardWidth,
      height,
    });
    const [crumbs, invasion, tools, play, debug] = splitRows(left, [0.22, 0.14, 0.28, 0.2, 0.16]);
    const [eater, glove] = splitColumns(tools, 2);
    const [pause, menu] = splitColumns(play, 2);
    panel = { crumbs, invasion, eater, glove, pause, menu, debug, slots: grid(right, 3, 4) };
  } else {
    boardClip = { x: (width - boardWidth) / 2, y: 0, width: boardWidth, height: boardHeight };
    const below = inset({ x: 0, y: boardHeight, width, height: height - boardHeight });
    const [invasion, controls, items] = splitRows(below, [0.1, 0.28, 0.62]);
    const [crumbs, eater, glove, pause, menu, debug] = splitColumns(controls, 6);
    panel = { crumbs, invasion, eater, glove, pause, menu, debug, slots: grid(items, 6, 2) };
  }
  const world: ViewTransform = {
    scale,
    x: boardClip.x - BOARD_CROP.x * scale,
    y: boardClip.y - BOARD_CROP.y * scale,
  };
  const menuScale = Math.min(width / MENU_CROP.width, height / MENU_CROP.height);
  const menuClip: Rectangle = {
    x: (width - MENU_CROP.width * menuScale) / 2,
    y: (height - MENU_CROP.height * menuScale) / 2,
    width: MENU_CROP.width * menuScale,
    height: MENU_CROP.height * menuScale,
  };
  const menuWorld: ViewTransform = {
    scale: menuScale,
    x: menuClip.x - MENU_CROP.x * menuScale,
    y: menuClip.y - MENU_CROP.y * menuScale,
  };
  // Debug-only spawn buttons sit over the bottom of the board, two rows deep.
  const debugRows = 2;
  const debugArea = {
    x: boardClip.x,
    y: boardClip.y + boardClip.height - debugRows * 30,
    width: boardClip.width,
    height: debugRows * 30,
  };
  const debugAnts = splitGrid(debugArea, Math.ceil(antCount / debugRows), debugRows, 2).slice(
    0,
    antCount,
  );
  return {
    kind: 'compact',
    width,
    height,
    world,
    menuWorld,
    menuClip,
    boardClip,
    panel,
    debugAnts,
  };
}

export function activeTransform(layout: Layout, screen: Screen) {
  return screen === 'play' ? layout.world : layout.menuWorld;
}

export function toWorld(transform: ViewTransform, point: Point): Point {
  return {
    x: (point.x - transform.x) / transform.scale,
    y: (point.y - transform.y) / transform.scale,
  };
}

function inset(area: Rectangle, by = PAD): Rectangle {
  return {
    x: area.x + by,
    y: area.y + by,
    width: Math.max(0, area.width - 2 * by),
    height: Math.max(0, area.height - 2 * by),
  };
}

function splitRows(area: Rectangle, weights: number[]): Rectangle[] {
  const free = area.height - GAP * (weights.length - 1);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let y = area.y;
  return weights.map((weight) => {
    const height = (free * weight) / total;
    const row = { x: area.x, y, width: area.width, height };
    y += height + GAP;
    return row;
  });
}

function splitColumns(area: Rectangle, count: number): Rectangle[] {
  const width = (area.width - GAP * (count - 1)) / count;
  return Array.from({ length: count }, (_, index) => ({
    x: area.x + index * (width + GAP),
    y: area.y,
    width,
    height: area.height,
  }));
}

function splitGrid(area: Rectangle, columns: number, rows: number, gap: number): Rectangle[] {
  const width = (area.width - gap * (columns - 1)) / columns;
  const height = (area.height - gap * (rows - 1)) / rows;
  const cells: Rectangle[] = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      cells.push({
        x: area.x + column * (width + gap),
        y: area.y + row * (height + gap),
        width,
        height,
      });
    }
  }
  return cells;
}

/** A grid of toolbar slots, capped in size and centred so big tablets don't get giant cards. */
function grid(area: Rectangle, columns: number, rows: number): Rectangle[] {
  const width = Math.min(MAX_SLOT_WIDTH, (area.width - GAP * (columns - 1)) / columns);
  const height = Math.min(MAX_SLOT_HEIGHT, (area.height - GAP * (rows - 1)) / rows);
  const gridWidth = columns * width + GAP * (columns - 1);
  const gridHeight = rows * height + GAP * (rows - 1);
  return splitGrid(
    {
      x: area.x + (area.width - gridWidth) / 2,
      y: area.y + (area.height - gridHeight) / 2,
      width: gridWidth,
      height: gridHeight,
    },
    columns,
    rows,
    GAP,
  );
}
