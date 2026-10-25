import { ANT_TYPES } from './game/definitions';
import { createGame } from './game/game';
import { createBrowserPreferenceStore, createMemoryPreferenceStore } from './game/preferences';
import { updateGame } from './game/simulation';
import type { PreferenceStore } from './game/types';
import type { RenderContext } from './rendering/context';
import { renderGame } from './rendering/renderer';
import './styles.css';
import { bindInput } from './ui/input';
import { chooseLayoutKind, computeCompactLayout, DESKTOP_LAYOUT, type Layout } from './ui/viewport';

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
const game = createGame({ preferenceStore, debugAvailable: import.meta.env.DEV });
const view: RenderContext = { game, ctx };
const coarsePointer = window.matchMedia('(pointer: coarse)');
let layout: Layout = DESKTOP_LAYOUT;
const unbindInput = bindInput(canvas, game, () => layout);
let previousFrame = performance.now();
let frameRequest = 0;

/**
 * Landscape phones and tablets get the compact layout: the canvas fills the
 * viewport and its logical size is the CSS size, so controls are sized in real
 * pixels. Everything else keeps the fixed 900x700 desktop page.
 */
function chooseLayout(): Layout {
  const kind = chooseLayoutKind(window.innerWidth, window.innerHeight, coarsePointer.matches);
  document.documentElement.classList.toggle('compact', kind === 'compact');
  if (kind === 'desktop') {
    return DESKTOP_LAYOUT;
  }
  return computeCompactLayout(
    canvas.clientWidth || window.innerWidth,
    canvas.clientHeight || window.innerHeight,
    ANT_TYPES.length,
  );
}

/**
 * Gives the canvas a bitmap that matches the display, then scales the context so
 * the rest of the game can draw in the layout's logical coordinates.
 */
function matchDisplayDensity() {
  const ratio = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
  const width = Math.round(layout.width * ratio);
  const height = Math.round(layout.height * ratio);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  ctx.setTransform(width / layout.width, 0, 0, height / layout.height, 0, 0);
}

function frame(now: number) {
  const deltaSeconds = Math.min(0.05, (now - previousFrame) / 1000);
  previousFrame = now;
  layout = chooseLayout();
  matchDisplayDensity();
  updateGame(game, deltaSeconds);
  renderGame(view, layout);
  frameRequest = requestAnimationFrame(frame);
}

frameRequest = requestAnimationFrame(frame);
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cancelAnimationFrame(frameRequest);
    unbindInput();
  });
}
