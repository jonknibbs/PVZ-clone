import { ANTEATER_COOLDOWN, GLOVE_COOLDOWN } from '../game/constants';
import { ANT_DEFINITIONS, ANT_TYPES, isTrackType, ITEM_DEFINITIONS } from '../game/definitions';
import type { ItemType, Rectangle } from '../game/types';
import type { ControlPanel } from '../ui/viewport';
import { drawAnteater } from './ants';
import type { RenderContext } from './context';
import { drawMarble } from './marbles';
import { roundedRect } from './primitives';
import { drawTrackPiece } from './track';

// Each control is drawn into a rectangle. Proportions come from the desktop
// sizes, so the desktop toolbar looks exactly as before and the compact panel
// simply passes larger rectangles.

export function slotKeyLabel(index: number) {
  return index < 9 ? String(index + 1) : index === 9 ? '0' : index === 10 ? '-' : '=';
}

export function drawCrumbBank(view: RenderContext, area: Rectangle) {
  const { ctx, game } = view;
  const k = area.height / 73;
  const centerX = area.x + area.width / 2;
  const bank = ctx.createLinearGradient(
    area.x,
    area.y - 9 * k,
    area.x + area.width,
    area.y + 71 * k,
  );
  bank.addColorStop(0, '#e7ca7a');
  bank.addColorStop(0.55, '#ba9657');
  bank.addColorStop(1, '#76583d');
  ctx.fillStyle = bank;
  roundedRect(view, area.x, area.y, area.width, area.height, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,243,198,.52)';
  ctx.lineWidth = 1;
  roundedRect(view, area.x + 0.5, area.y + 0.5, area.width - 1, area.height - 1, 12);
  ctx.stroke();
  ctx.fillStyle = '#39452f';
  ctx.font = `bold ${10 * k}px "Trebuchet MS",sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('CRUMBS', centerX, area.y + 17 * k);
  ctx.fillStyle = '#fff4d0';
  ctx.font = `bold ${26 * k}px Georgia,serif`;
  ctx.fillText(game.debug ? '∞' : String(Math.floor(game.state.crumbs)), centerX, area.y + 49 * k);
  if (game.debug) {
    ctx.fillStyle = '#fff2c4';
    ctx.font = `bold ${9 * k}px sans-serif`;
    ctx.fillText('DEBUG (F2)', centerX, area.y + 65 * k);
  }
}

export function drawItemSlot(
  view: RenderContext,
  type: ItemType,
  index: number,
  slot: Rectangle,
  options: { hot?: boolean; textScale?: number } = {},
) {
  const { ctx, game } = view;
  const k = slot.height / 88;
  const text = options.textScale ?? 1;
  const definition = ITEM_DEFINITIONS[type];
  const affordable = game.state.crumbs >= definition.cost;
  const cooldown = game.state.cooldowns[type];
  const selected = game.state.selectedItem === type;
  const hot = !selected && options.hot;
  const card = ctx.createLinearGradient(slot.x, slot.y, slot.x, slot.y + slot.height);
  card.addColorStop(0, selected ? '#526b4b' : hot ? '#43603f' : '#344d3d');
  card.addColorStop(1, '#20382f');
  ctx.fillStyle = card;
  roundedRect(view, slot.x, slot.y, slot.width, slot.height, 8);
  ctx.fill();
  ctx.strokeStyle = selected ? '#f3d98c' : hot ? 'rgba(243,217,140,.7)' : 'rgba(235,218,165,.3)';
  ctx.lineWidth = selected ? 2 : 1;
  roundedRect(view, slot.x + 0.5, slot.y + 0.5, slot.width - 1, slot.height - 1, 8);
  ctx.stroke();
  const iconX = slot.x + slot.width / 2;
  const iconY = slot.y + 34 * k;
  // Item art is drawn at board size, so shrink it to fit inside the slot.
  const artWidth = isTrackType(type) ? 70 : 54;
  const scale = Math.min(k, (slot.width - 4) / artWidth);
  ctx.save();
  roundedRect(view, slot.x, slot.y, slot.width, slot.height, 8);
  ctx.clip();
  ctx.translate(iconX, iconY);
  ctx.scale(scale, scale);
  ctx.translate(-iconX, -iconY);
  if (isTrackType(type)) {
    drawTrackPiece(view, type, iconX, iconY, affordable ? 1 : 0.4);
  } else {
    drawMarble(
      view,
      { type: type, elapsed: 0, health: 1, maxHealth: 1, touchingAnt: false },
      iconX,
      iconY,
      affordable ? 1 : 0.4,
    );
  }
  ctx.restore();
  ctx.fillStyle = '#f6f0db';
  ctx.font = `bold ${10 * text}px "Trebuchet MS",sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(definition.name, iconX, slot.y + 64 * k);
  ctx.fillStyle = affordable ? '#f1d58e' : '#d28b79';
  ctx.font = `bold ${12 * text}px "Trebuchet MS",sans-serif`;
  ctx.fillText(String(definition.cost), iconX, slot.y + 81 * k);
  if (cooldown > 0) {
    ctx.fillStyle = 'rgba(8,19,16,.72)';
    ctx.save();
    roundedRect(view, slot.x, slot.y, slot.width, slot.height, 8);
    ctx.clip();
    ctx.fillRect(slot.x, slot.y, slot.width, (slot.height * cooldown) / definition.cooldown);
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(246,240,219,.65)';
  ctx.font = `bold ${9 * text}px sans-serif`;
  ctx.fillText(slotKeyLabel(index), slot.x + 8 * text, slot.y + 10 * text);
}

export function drawEaterButton(view: RenderContext, area: Rectangle, textScale = 1) {
  const { ctx, game } = view;
  const k = area.height / 88;
  const centerX = area.x + area.width / 2;
  const ready = game.state.anteaterCooldown <= 0 && !game.state.anteater;
  ctx.fillStyle = ready ? '#6c7750' : '#314b3a';
  roundedRect(view, area.x, area.y, area.width, area.height, 9);
  ctx.fill();
  ctx.strokeStyle = ready ? '#e6d18e' : 'rgba(235,218,165,.3)';
  ctx.lineWidth = ready ? 2 : 1;
  roundedRect(view, area.x + 0.5, area.y + 0.5, area.width - 1, area.height - 1, 9);
  ctx.stroke();
  const artScale = 0.45 * Math.min(k, area.width / 68);
  drawAnteater(view, centerX, area.y + 44 * k, artScale, ready ? 1 : 0.4);
  ctx.fillStyle = '#f4eed7';
  ctx.font = `bold ${9 * textScale}px "Trebuchet MS",sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(
    ready
      ? 'EATER (E)'
      : game.state.anteater
        ? 'EATING...'
        : Math.ceil(game.state.anteaterCooldown) + 's',
    centerX,
    area.y + area.height - 8 * k,
  );
  if (!ready && !game.state.anteater) {
    drawRestingShade(
      view,
      area,
      (area.height - 4) * (game.state.anteaterCooldown / ANTEATER_COOLDOWN),
    );
  }
}

export function drawGloveButton(view: RenderContext, area: Rectangle, textScale = 1) {
  const { ctx, game } = view;
  const k = area.height / 88;
  const centerX = area.x + area.width / 2;
  const on = game.state.gloveActive;
  ctx.fillStyle = on ? '#677b50' : '#314b3a';
  roundedRect(view, area.x, area.y, area.width, area.height, 9);
  ctx.fill();
  ctx.strokeStyle = on ? '#f1d58e' : 'rgba(235,218,165,.3)';
  ctx.lineWidth = on ? 2 : 1;
  roundedRect(view, area.x + 0.5, area.y + 0.5, area.width - 1, area.height - 1, 9);
  ctx.stroke();
  ctx.font = `${32 * Math.min(k, area.width / 68)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('🧤', centerX, area.y + 48 * k);
  ctx.fillStyle = '#f4eed7';
  ctx.font = `bold ${10 * textScale}px "Trebuchet MS",sans-serif`;
  const resting = game.state.gloveCooldown > 0 && !game.state.gloveActive;
  ctx.fillText(
    resting ? Math.ceil(game.state.gloveCooldown) + 's' : 'Glove (G)',
    centerX,
    area.y + area.height - 12 * k,
  );
  if (resting) {
    drawRestingShade(view, area, (area.height - 4) * (game.state.gloveCooldown / GLOVE_COOLDOWN));
  }
}

function drawRestingShade(view: RenderContext, area: Rectangle, height: number) {
  const { ctx } = view;
  ctx.fillStyle = 'rgba(0,0,0,.42)';
  ctx.save();
  roundedRect(view, area.x + 2, area.y + 2, area.width - 4, area.height - 4, 7);
  ctx.clip();
  ctx.fillRect(area.x + 2, area.y + 2, area.width - 4, height);
  ctx.restore();
}

export function drawHudButton(
  view: RenderContext,
  area: Rectangle,
  label: string,
  fill: string,
  textScale = 1,
) {
  const { ctx } = view;
  ctx.fillStyle = fill;
  roundedRect(view, area.x, area.y, area.width, area.height, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(239,220,168,.55)';
  ctx.lineWidth = 1;
  roundedRect(view, area.x + 0.5, area.y + 0.5, area.width - 1, area.height - 1, 8);
  ctx.stroke();
  ctx.fillStyle = '#f7f0dc';
  let size = 12 * textScale;
  ctx.font = `bold ${size}px "Trebuchet MS",sans-serif`;
  const fit = (area.width - 10) / ctx.measureText(label).width;
  if (fit < 1) {
    size *= fit;
    ctx.font = `bold ${size}px "Trebuchet MS",sans-serif`;
  }
  ctx.textAlign = 'center';
  ctx.fillText(label, area.x + area.width / 2, area.y + area.height / 2 + (5 * size) / 12);
}

export function drawPauseButton(view: RenderContext, area: Rectangle, textScale = 1) {
  const paused = view.game.state.paused;
  drawHudButton(
    view,
    area,
    paused ? '▶ Resume (P)' : '⏸ Pause (P)',
    paused ? '#e3cb88' : 'rgba(21,39,31,.82)',
    textScale,
  );
}

export function drawMenuButton(view: RenderContext, area: Rectangle, textScale = 1) {
  drawHudButton(view, area, '☰  Main menu', 'rgba(21,39,31,.82)', textScale);
}

export function drawDebugButton(view: RenderContext, area: Rectangle, textScale = 1) {
  const debug = view.game.debug;
  drawHudButton(
    view,
    area,
    debug ? 'Debug: ON' : 'Debug: OFF',
    debug ? '#647746' : 'rgba(21,39,31,.82)',
    textScale,
  );
}

export function drawInvasionPanel(view: RenderContext, area: Rectangle, textScale = 1) {
  const { ctx, game } = view;
  const k = area.height / 51;
  const progress = Math.min(1, game.state.elapsed / game.state.invasionDuration);
  ctx.fillStyle = 'rgba(21,39,31,.8)';
  roundedRect(view, area.x, area.y, area.width, area.height, 12);
  ctx.fill();
  ctx.fillStyle = '#e7e9cd';
  ctx.font = `bold ${11 * textScale}px "Trebuchet MS",sans-serif`;
  ctx.textAlign = 'left';
  // Once the schedule is empty the bar is full, so count the ants still standing.
  const lastAnts = !game.state.spawnQueue.length && game.state.ants.length;
  ctx.fillText(
    lastAnts ? 'ANTS LEFT: ' + game.state.ants.length : 'INVASION',
    area.x + 12,
    area.y + 18 * k,
  );
  const barWidth = area.width - 24;
  ctx.fillStyle = 'rgba(8,22,17,.75)';
  roundedRect(view, area.x + 12, area.y + 26 * k, barWidth, 8, 4);
  ctx.fill();
  const bar = ctx.createLinearGradient(area.x + 12, 0, area.x + 12 + barWidth, 0);
  bar.addColorStop(0, '#e78b54');
  bar.addColorStop(1, '#e6c46b');
  ctx.fillStyle = bar;
  roundedRect(view, area.x + 12, area.y + 26 * k, barWidth * progress, 8, 4);
  ctx.fill();
}

export function drawDebugAntButtons(view: RenderContext, buttons: Rectangle[]) {
  const { ctx } = view;
  ANT_TYPES.forEach((type, index) => {
    const button = buttons[index];
    if (!button) {
      return;
    }
    ctx.fillStyle = ANT_DEFINITIONS[type].color;
    ctx.fillRect(button.x, button.y, button.width, button.height);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(button.x + 0.5, button.y + 0.5, button.width - 1, button.height - 1);
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.min(12, button.width / 5)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(type, button.x + button.width / 2, button.y + button.height / 2 + 4);
  });
}

/** The compact layout's control panel: everything the desktop toolbar and left HUD offer. */
export function drawControlPanel(view: RenderContext, panel: ControlPanel) {
  const { game } = view;
  const text = 1.25;
  drawCrumbBank(view, panel.crumbs);
  drawInvasionPanel(view, panel.invasion, text);
  game.state.availableItems.forEach((type, index) => {
    const slot = panel.slots[index];
    if (slot) {
      drawItemSlot(view, type, index, slot, { textScale: text });
    }
  });
  if (game.state.abilities.eater) {
    drawEaterButton(view, panel.eater, text);
  }
  if (game.state.abilities.glove) {
    drawGloveButton(view, panel.glove, text);
  }
  drawPauseButton(view, panel.pause, text);
  drawMenuButton(view, panel.menu, text);
  if (game.debugAvailable) {
    drawDebugButton(view, panel.debug, text);
  }
}
