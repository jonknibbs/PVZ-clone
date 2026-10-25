import {
  BOARD_BOTTOM,
  BOARD_X,
  BOARD_Y,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  LANE_COUNT,
  LANE_LENGTH,
  LANE_WIDTH,
  laneCenterX,
  MIN_DROP_Y,
  TOOLBAR_HEIGHT,
} from '../game/constants';
import { ANT_TYPES, CAMPAIGN_LEVELS } from '../game/definitions';
import {
  currentTutorialStep,
  TUTORIAL_ANT_LANE,
  TUTORIAL_STEPS,
  type TutorialTarget,
} from '../game/tutorial';
import type { Game, Rectangle } from '../game/types';
import {
  containsPoint,
  debugAntButton,
  laneAt,
  MENU_BUTTON,
  PAUSE_BUTTON,
  toolbarSlot,
  TUTORIAL_CARD,
  TUTORIAL_NEXT_BUTTON,
  TUTORIAL_SKIP_BUTTON,
} from '../ui/layout';
import { activeTransform, DESKTOP_LAYOUT, type Layout, type ViewTransform } from '../ui/viewport';
import {
  DEBUG_BUTTON,
  INVASION_PANEL,
  QUIT_CANCEL_BUTTON,
  QUIT_CONFIRM_BUTTON,
  QUIT_DIALOG,
} from '../ui/layout';
import { drawAnt, drawAnteater } from './ants';
import { drawBoard } from './board';
import type { RenderContext } from './context';
import {
  drawControlPanel,
  drawDebugAntButtons,
  drawDebugButton,
  drawHudButton,
  drawInvasionPanel,
  drawMenuButton,
  drawPauseButton,
} from './controls';
import { drawDeathAnimation } from './effects';
import { drawMenuOverlay, drawToolbar, wrapText } from './hud';
import { drawMarble } from './marbles';
import { drawSphere, roundedRect } from './primitives';
import { drawItemPreview, drawTrackPiece } from './track';

export function renderGame(view: RenderContext, layout: Layout = DESKTOP_LAYOUT) {
  const { ctx, game } = view;
  const screen = game.state.screen;
  if (layout.kind === 'desktop' || screen !== 'play') {
    ctx.save();
    if (layout.menuClip) {
      // Menus show their panel region, letterboxed in the viewport.
      fillCanvas(view, layout, '#172820');
      const clip = layout.menuClip;
      ctx.beginPath();
      ctx.rect(clip.x, clip.y, clip.width, clip.height);
      ctx.clip();
    }
    applyTransform(ctx, activeTransform(layout, screen));
    drawBoard(view);
    drawDebugPanel(view);
    drawPlacementPreview(view);
    drawEntities(view);
    drawToolbar(view);
    drawStatus(view);
    drawQuitConfirmation(view, () => {
      ctx.fillStyle = QUIT_SHADE;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    });
    // Drawn last so a warning is never hidden behind the win or lose panel.
    drawNotification(view);
    ctx.restore();
    return;
  }
  renderCompactPlay(view, layout);
}

/** Compact play: the board through a clipped, scaled viewport, with the controls beside it. */
function renderCompactPlay(view: RenderContext, layout: Layout) {
  const { ctx, game } = view;
  const clip = layout.boardClip;
  const panel = layout.panel;
  if (!clip || !panel) {
    throw new Error('The compact layout needs a board area and a control panel.');
  }
  const backdrop = ctx.createLinearGradient(0, 0, 0, layout.height);
  backdrop.addColorStop(0, '#263c32');
  backdrop.addColorStop(1, '#172820');
  fillCanvas(view, layout, backdrop);
  ctx.save();
  ctx.beginPath();
  ctx.rect(clip.x, clip.y, clip.width, clip.height);
  ctx.clip();
  applyTransform(ctx, layout.world);
  drawBoard(view);
  drawPlacementPreview(view);
  drawEntities(view);
  drawPauseOverlay(view, 'Press P or tap Resume');
  ctx.restore();
  drawControlPanel(view, panel);
  drawCompactTutorial(view, layout);
  if (game.debug) {
    drawDebugAntButtons(view, layout.debugAnts);
  }
  ctx.save();
  applyTransform(ctx, layout.world);
  drawQuitConfirmation(view, () => {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = QUIT_SHADE;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  });
  drawNotification(view);
  ctx.restore();
}

const QUIT_SHADE = 'rgba(8,19,16,.72)';

function fillCanvas(view: RenderContext, layout: Layout, style: string | CanvasGradient) {
  view.ctx.fillStyle = style;
  view.ctx.fillRect(0, 0, layout.width, layout.height);
}

function applyTransform(ctx: CanvasRenderingContext2D, transform: ViewTransform) {
  ctx.translate(transform.x, transform.y);
  ctx.scale(transform.scale, transform.scale);
}

function drawNotification(view: RenderContext) {
  const { ctx, game } = view;
  const notification = game.state.notification;
  if (!notification) {
    return;
  }
  const centerX = BOARD_X + (LANE_COUNT * LANE_WIDTH) / 2;
  // Menu panels own the middle of the board, so sit above them when one is open.
  const centerY = game.state.screen === 'play' ? BOARD_Y + LANE_LENGTH / 2 : 40;
  const accent = notification.tone === 'info' ? '#cfe8a8' : '#ff8a80';
  ctx.font = 'bold 18px sans-serif';
  const width = Math.min(560, ctx.measureText(notification.text).width + 40);
  ctx.fillStyle = 'rgba(10,22,18,.88)';
  roundedRect(view, centerX - width / 2, centerY - 25, width, 36, 10);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  roundedRect(view, centerX - width / 2, centerY - 25, width, 36, 10);
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.textAlign = 'center';
  ctx.fillText(notification.text, centerX, centerY);
}

function drawQuitConfirmation(view: RenderContext, shade: () => void) {
  const { ctx, game } = view;
  if (game.state.screen !== 'play' || !game.state.confirmQuit) {
    return;
  }
  const centerX = QUIT_DIALOG.x + QUIT_DIALOG.width / 2;
  shade();
  ctx.fillStyle = 'rgba(34,59,48,.98)';
  roundedRect(view, QUIT_DIALOG.x, QUIT_DIALOG.y, QUIT_DIALOG.width, QUIT_DIALOG.height, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(230,204,142,.55)';
  ctx.lineWidth = 2;
  roundedRect(view, QUIT_DIALOG.x, QUIT_DIALOG.y, QUIT_DIALOG.width, QUIT_DIALOG.height, 18);
  ctx.stroke();
  ctx.fillStyle = '#fff4d8';
  ctx.textAlign = 'center';
  ctx.font = 'bold 22px "Trebuchet MS",sans-serif';
  ctx.fillText('Leave this game?', centerX, QUIT_DIALOG.y + 48);
  ctx.fillStyle = '#e2e7d4';
  ctx.font = '14px "Trebuchet MS",sans-serif';
  ctx.fillText('This run will be lost.', centerX, QUIT_DIALOG.y + 74);
  for (const [button, label] of [
    [QUIT_CONFIRM_BUTTON, 'Main menu'],
    [QUIT_CANCEL_BUTTON, 'Keep playing'],
  ] as const) {
    const hot = containsPoint(game.state.pointer, button);
    ctx.fillStyle = hot ? '#e8cd80' : '#77583d';
    roundedRect(view, button.x, button.y, button.width, button.height, 10);
    ctx.fill();
    ctx.strokeStyle = hot ? '#fff0bd' : 'rgba(255,240,192,.4)';
    ctx.lineWidth = 1;
    roundedRect(view, button.x + 0.5, button.y + 0.5, button.width - 1, button.height - 1, 10);
    ctx.stroke();
    ctx.fillStyle = hot ? '#2c2415' : '#fff4d8';
    ctx.font = 'bold 15px "Trebuchet MS",sans-serif';
    ctx.fillText(label, button.x + button.width / 2, button.y + 27);
  }
}

function drawDebugPanel(view: RenderContext) {
  const { ctx, game } = view;
  if (game.debug && game.state.screen === 'play') {
    ctx.fillStyle = '#222';
    ctx.fillRect(0, BOARD_BOTTOM + 8, CANVAS_WIDTH, CANVAS_HEIGHT - BOARD_BOTTOM - 8);
    drawDebugAntButtons(
      view,
      ANT_TYPES.map((_, index) => debugAntButton(index)),
    );
  }
}

function drawPlacementPreview(view: RenderContext) {
  const { ctx, game } = view;
  if ((game.state.selectedItem || game.state.gloveActive) && game.state.screen === 'play') {
    const lane = laneAt(game.state.pointer);
    if (lane >= 0) {
      if (game.state.heldItem) {
        ctx.fillStyle = 'rgba(255,255,255,.18)';
        ctx.fillRect(BOARD_X + lane * LANE_WIDTH, BOARD_Y, LANE_WIDTH, LANE_LENGTH);
        const previewY = Math.max(MIN_DROP_Y, Math.min(BOARD_BOTTOM - 60, game.state.pointer.y));
        if (game.state.heldItem.isPiece) {
          drawTrackPiece(
            view,
            game.state.heldItem.entity.type,
            laneCenterX(lane),
            previewY,
            0.7,
            game.state.heldItem.entity,
          );
        } else {
          drawMarble(view, game.state.heldItem.entity, laneCenterX(lane), previewY, 0.7);
        }
      } else if (game.state.gloveActive) {
        ctx.fillStyle = 'rgba(100,200,255,.2)';
        ctx.fillRect(BOARD_X + lane * LANE_WIDTH, BOARD_Y, LANE_WIDTH, LANE_LENGTH);
      } else if (game.state.selectedItem) {
        ctx.fillStyle = 'rgba(255,255,255,.18)';
        ctx.fillRect(BOARD_X + lane * LANE_WIDTH, BOARD_Y, LANE_WIDTH, LANE_LENGTH);
        const previewY = Math.max(MIN_DROP_Y, Math.min(BOARD_BOTTOM - 60, game.state.pointer.y));
        drawItemPreview(view, game.state.selectedItem, laneCenterX(lane), previewY);
      }
    }
  }
}

function drawEntities(view: RenderContext) {
  const { ctx, game } = view;
  for (const shard of game.state.shards) {
    ctx.save();
    ctx.translate(shard.x, shard.y);
    ctx.rotate(shard.rotation);
    ctx.globalAlpha = Math.min(1, shard.lifeRemaining / 5);
    ctx.fillStyle = 'rgba(179,229,252,.85)';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -shard.size);
    ctx.lineTo(shard.size * 0.7, shard.size * 0.6);
    ctx.lineTo(-shard.size * 0.7, shard.size * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  for (const trackPiece of game.state.trackPieces) {
    drawTrackPiece(
      view,
      trackPiece.type,
      laneCenterX(trackPiece.lane),
      trackPiece.y,
      1,
      trackPiece,
    );
  }
  for (const marble of game.state.marbles) {
    drawMarble(view, marble, laneCenterX(marble.lane) + (marble.laneOffsetX || 0), marble.y);
  }
  for (const drop of game.state.deaths) {
    drawDeathAnimation(view, drop);
  }
  for (const ant of game.state.ants) {
    drawAnt(view, ant);
  }
  if (game.state.anteater) {
    for (let lane = 0; lane < LANE_COUNT; lane++) {
      drawAnteater(view, laneCenterX(lane), game.state.anteater.y, 1, 1);
    }
  }
  for (const projectile of game.state.projectiles) {
    drawSphere(view, projectile.x, projectile.y, 6, projectile.ice ? '#8cf' : '#f66');
  }
  for (const effect of game.state.effects) {
    const type = effect.elapsed / effect.duration;
    if (effect.kind === 'boom') {
      ctx.fillStyle = `rgba(255,${(180 - type * 150) | 0},0,${1 - type})`;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, 40 + type * 120, 0, 7);
      ctx.fill();
    } else if (effect.kind === 'spit') {
      ctx.fillStyle = '#76ff03';
      ctx.beginPath();
      ctx.arc(
        effect.x + (effect.targetX - effect.x) * type,
        effect.y + (effect.targetY - effect.y) * type,
        6,
        0,
        7,
      );
      ctx.fill();
    } else if (effect.kind === 'dmg') {
      ctx.fillStyle = `rgba(255,235,59,${1 - type})`;
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(effect.text, effect.x, effect.y - type * 30);
    } else {
      ctx.fillStyle = `rgba(200,200,200,${1 - type})`;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, 10 + type * 20, 0, 7);
      ctx.fill();
    }
  }
  for (const drop of game.state.crumbDrops) {
    drawSphere(view, drop.x, drop.y, 14, '#ffd54f');
    ctx.fillStyle = '#000';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('25', drop.x, drop.y + 5);
  }
}

function drawPauseOverlay(view: RenderContext, hint = 'Press P or click Resume') {
  const { ctx, game } = view;
  if (game.state.screen === 'play' && game.state.paused && !game.state.confirmQuit) {
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(0, TOOLBAR_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT - TOOLBAR_HEIGHT);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 48px sans-serif';
    ctx.fillText('Paused', BOARD_X + (LANE_COUNT * LANE_WIDTH) / 2, BOARD_Y + LANE_LENGTH / 2);
    ctx.font = '18px sans-serif';
    ctx.fillText(hint, BOARD_X + (LANE_COUNT * LANE_WIDTH) / 2, BOARD_Y + LANE_LENGTH / 2 + 34);
  }
}

function drawCompactTutorial(view: RenderContext, layout: Layout) {
  const step = currentTutorialStep(view.game);
  const panel = layout.panel;
  const clip = layout.boardClip;
  if (!step || !panel || !clip || view.game.state.paused) {
    return;
  }
  const { ctx } = view;
  const card = {
    x: clip.x + 8,
    y: clip.y + 8,
    width: Math.max(0, clip.width - 16),
    height: Math.min(clip.height * 0.4, 116),
  };
  ctx.fillStyle = 'rgba(16,31,25,.94)';
  roundedRect(view, card.x, card.y, card.width, card.height, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(230,204,142,.7)';
  ctx.lineWidth = 1;
  roundedRect(view, card.x + 0.5, card.y + 0.5, card.width - 1, card.height - 1, 10);
  ctx.stroke();
  ctx.fillStyle = '#e8d09a';
  ctx.font = 'bold 12px "Trebuchet MS",sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(
    `How to play · ${(view.game.state.tutorial?.step ?? 0) + 1} of ${TUTORIAL_STEPS.length}`,
    card.x + 8,
    card.y + 18,
  );
  ctx.fillStyle = '#fff4d8';
  ctx.font = '12px "Trebuchet MS",sans-serif';
  wrapText(step.text, card.width - 16, (text) => ctx.measureText(text).width).forEach(
    (line, index) => ctx.fillText(line, card.x + 8, card.y + 37 + index * 14),
  );
  const nextLabel = step.isComplete
    ? (step.waitingHint ?? 'Your turn')
    : (step.nextLabel ?? 'Next');
  drawHudButton(view, panel.pause, nextLabel, 'rgba(21,39,31,.94)');
  drawHudButton(view, panel.menu, 'Skip tutorial', 'rgba(21,39,31,.94)');
}

function drawButton(view: RenderContext, bounds: Rectangle, label: string, primary: boolean) {
  const { ctx, game } = view;
  const hot = containsPoint(game.state.pointer, bounds);
  ctx.fillStyle = primary ? (hot ? '#e8cd80' : '#c9a463') : hot ? '#526b4b' : 'rgba(21,39,31,.9)';
  roundedRect(view, bounds.x, bounds.y, bounds.width, bounds.height, 9);
  ctx.fill();
  ctx.strokeStyle = 'rgba(239,220,168,.6)';
  ctx.lineWidth = 1;
  roundedRect(view, bounds.x + 0.5, bounds.y + 0.5, bounds.width - 1, bounds.height - 1, 9);
  ctx.stroke();
  ctx.fillStyle = primary ? '#2a2418' : '#f7f0dc';
  ctx.font = 'bold 14px "Trebuchet MS",sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, bounds.x + bounds.width / 2, bounds.y + bounds.height / 2 + 5);
}

function drawTutorial(view: RenderContext) {
  const { ctx, game } = view;
  const step = currentTutorialStep(game);
  if (!step) {
    return;
  }
  const target = tutorialTargetBounds(game, step.target);
  if (target) {
    const pulse = 0.55 + 0.45 * Math.sin(game.state.elapsed * 5);
    ctx.save();
    ctx.strokeStyle = `rgba(255,222,120,${pulse})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    roundedRect(view, target.x - 4, target.y - 4, target.width + 8, target.height + 8, 10);
    ctx.stroke();
    ctx.restore();
  }
  const card = TUTORIAL_CARD;
  ctx.fillStyle = 'rgba(16,31,25,.94)';
  roundedRect(view, card.x, card.y, card.width, card.height, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(230,204,142,.7)';
  ctx.lineWidth = 2;
  roundedRect(view, card.x + 1, card.y + 1, card.width - 2, card.height - 2, 13);
  ctx.stroke();
  const stepNumber = (game.state.tutorial?.step ?? 0) + 1;
  ctx.fillStyle = '#e8d09a';
  ctx.font = 'bold 12px "Trebuchet MS",sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`How to play · ${stepNumber} of ${TUTORIAL_STEPS.length}`, card.x + 14, card.y + 26);
  ctx.fillStyle = '#fff4d8';
  ctx.font = '16px "Trebuchet MS",sans-serif';
  wrapText(step.text, card.width - 28, (text) => ctx.measureText(text).width).forEach(
    (line, index) => ctx.fillText(line, card.x + 14, card.y + 56 + index * 22),
  );
  if (step.isComplete) {
    ctx.fillStyle = '#c9d4b8';
    ctx.font = 'italic 13px "Trebuchet MS",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      step.waitingHint ?? 'Your turn',
      TUTORIAL_NEXT_BUTTON.x + TUTORIAL_NEXT_BUTTON.width / 2,
      TUTORIAL_NEXT_BUTTON.y + 22,
    );
  } else {
    drawButton(view, TUTORIAL_NEXT_BUTTON, step.nextLabel ?? 'Next (Enter)', true);
  }
  drawButton(view, TUTORIAL_SKIP_BUTTON, 'Skip tutorial', false);
}

function tutorialTargetBounds(game: Game, target: TutorialTarget): Rectangle | null {
  const boardWidth = LANE_COUNT * LANE_WIDTH;
  switch (target) {
    case 'hills':
      return { x: BOARD_X, y: BOARD_BOTTOM - 4, width: boardWidth, height: 42 };
    case 'crumbs':
      return { x: 10, y: 19, width: 86, height: 73 };
    case 'firstSlot':
      return toolbarSlot(0);
    case 'board':
      return { x: BOARD_X, y: BOARD_Y, width: boardWidth, height: LANE_LENGTH };
    case 'antLane':
      return {
        x: BOARD_X + TUTORIAL_ANT_LANE * LANE_WIDTH,
        y: BOARD_Y,
        width: LANE_WIDTH,
        height: LANE_LENGTH,
      };
    case 'ants': {
      const ant = game.state.ants[0];
      return ant ? { x: ant.x - 28, y: ant.y - 30, width: 56, height: 60 } : null;
    }
    case 'crumbDrop': {
      const drop = game.state.crumbDrops[0];
      return drop ? { x: drop.x - 20, y: drop.y - 20, width: 40, height: 40 } : null;
    }
    default:
      return null;
  }
}

/** The desktop HUD column to the left of the board, plus the menu overlay. */
function drawStatus(view: RenderContext) {
  const { ctx, game } = view;
  if (!game.state.tutorial) {
    drawInvasionPanel(view, INVASION_PANEL);
  }
  drawPauseOverlay(view);
  if (game.state.screen === 'play') {
    drawPauseButton(view, PAUSE_BUTTON);
    drawMenuButton(view, MENU_BUTTON);
    if (game.debugAvailable) {
      drawDebugButton(view, DEBUG_BUTTON);
    }
    if (game.mode === 'campaign') {
      ctx.fillStyle = '#f7f0dc';
      ctx.textAlign = 'left';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('Level ' + (game.levelIndex + 1), 20, BOARD_Y + 201);
      ctx.font = '12px sans-serif';
      ctx.fillText(CAMPAIGN_LEVELS[game.levelIndex].name, 20, BOARD_Y + 219);
    }
    if (!game.state.paused) {
      drawTutorial(view);
    }
  }
  if (game.state.screen !== 'play') {
    drawMenuOverlay(view);
  }
}
