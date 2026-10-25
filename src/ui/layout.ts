import {
  BOARD_BOTTOM,
  BOARD_X,
  BOARD_Y,
  LANE_COUNT,
  LANE_WIDTH,
  TOOLBAR_HEIGHT,
} from '../game/constants';
import type { Point, Rectangle } from '../game/types';

export const PAUSE_BUTTON = { x: 20, y: BOARD_Y + 69, width: 130, height: 28 };
export const MENU_BUTTON = { x: 20, y: BOARD_Y + 103, width: 130, height: 28 };
export const DEBUG_BUTTON = { x: 20, y: BOARD_Y + 137, width: 130, height: 38 };
export const TOOL_BUTTONS = {
  eater: { x: 680, y: 8, width: 68, height: 88 },
  glove: { x: 752, y: 8, width: 138, height: 88 },
};
export const toolbarSlot = (index: number) => ({
  x: 103 + index * 48,
  y: 8,
  width: 44,
  height: 88,
});
export const debugAntButton = (index: number) => ({
  x: 4 + index * 74,
  y: BOARD_BOTTOM + 14,
  width: 70,
  height: 30,
});
export const QUIT_DIALOG = { x: 280, y: 286, width: 340, height: 164 };
export const QUIT_CONFIRM_BUTTON = { x: 300, y: 388, width: 140, height: 42 };
export const QUIT_CANCEL_BUTTON = { x: 460, y: 388, width: 140, height: 42 };
export const containsPoint = (point: Point, bounds: Rectangle) =>
  point.x >= bounds.x &&
  point.x <= bounds.x + bounds.width &&
  point.y >= bounds.y &&
  point.y <= bounds.y + bounds.height;

export function laneAt(point: Point) {
  const lane = Math.floor((point.x - BOARD_X) / LANE_WIDTH);
  return lane >= 0 && lane < LANE_COUNT && point.y >= TOOLBAR_HEIGHT && point.y <= BOARD_BOTTOM + 30
    ? lane
    : -1;
}
