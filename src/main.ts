import { CANVAS_HEIGHT, CANVAS_WIDTH } from './game/constants';
import { createGame } from './game/game';
import { createBrowserPreferenceStore, createMemoryPreferenceStore } from './game/preferences';
import { updateGame } from './game/simulation';
import type { PreferenceStore } from './game/types';
import type { RenderContext } from './rendering/context';
import { renderGame } from './rendering/renderer';
import './styles.css';
import { bindInput } from './ui/input';

function required<T>(value: T | null, message: string): T {
  if (!value) {
    throw new Error(message);
  }
  return value;
}

const canvas = required(
  document.querySelector<HTMLCanvasElement>('#c'),
  'The game canvas is missing.',
);
const ctx = required(canvas.getContext('2d'), 'This browser does not support 2D canvas rendering.');
let preferenceStore: PreferenceStore;
try {
  preferenceStore = createBrowserPreferenceStore(localStorage);
  preferenceStore.load();
} catch (error) {
  console.warn('Local storage is unavailable. Preferences will be kept in memory.', error);
  preferenceStore = createMemoryPreferenceStore();
}
const game = createGame({ preferenceStore });
const view: RenderContext = { game, ctx };
const unbindInput = bindInput(canvas, game);
let previousFrame = performance.now();
let frameRequest = 0;

/**
 * Gives the canvas a bitmap that matches the display, then scales the context so
 * the rest of the game can keep drawing in logical 900x700 coordinates.
 */
function matchDisplayDensity() {
  const ratio = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
  const width = Math.round(CANVAS_WIDTH * ratio);
  const height = Math.round(CANVAS_HEIGHT * ratio);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  ctx.setTransform(width / CANVAS_WIDTH, 0, 0, height / CANVAS_HEIGHT, 0, 0);
}

function frame(now: number) {
  const deltaSeconds = Math.min(0.05, (now - previousFrame) / 1000);
  previousFrame = now;
  updateGame(game, deltaSeconds);
  matchDisplayDensity();
  renderGame(view);
  frameRequest = requestAnimationFrame(frame);
}

frameRequest = requestAnimationFrame(frame);
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cancelAnimationFrame(frameRequest);
    unbindInput();
  });
}
