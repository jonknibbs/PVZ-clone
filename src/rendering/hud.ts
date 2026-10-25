import {
  ANTEATER_COOLDOWN,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  GLOVE_COOLDOWN,
  TOOLBAR_HEIGHT,
} from '../game/constants';
import {
  ANT_DEFINITIONS,
  CAMPAIGN_LEVELS,
  isTrackType,
  ITEM_DEFINITIONS,
} from '../game/definitions';
import { focusedMenuIndex } from '../ui/input';
import { containsPoint, TOOL_BUTTONS, toolbarSlot } from '../ui/layout';
import { getIntroductionRows, getMenuButtons } from '../ui/menus';
import { drawAnt, drawAnteater } from './ants';
import type { RenderContext } from './context';
import { drawMarble } from './marbles';
import { roundedRect } from './primitives';
import { drawItemPreview, drawTrackPiece } from './track';

export function drawToolbar(view: RenderContext) {
  const { ctx, game } = view;
  const bar = ctx.createLinearGradient(0, 0, 0, TOOLBAR_HEIGHT);
  bar.addColorStop(0, '#263c32');
  bar.addColorStop(1, '#192e28');
  ctx.fillStyle = bar;
  ctx.fillRect(0, 0, CANVAS_WIDTH, TOOLBAR_HEIGHT);
  ctx.fillStyle = 'rgba(240,218,158,.18)';
  ctx.fillRect(0, TOOLBAR_HEIGHT - 2, CANVAS_WIDTH, 2);
  ctx.fillStyle = '#e8d09a';
  ctx.font = 'bold 10px "Trebuchet MS",sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ANTS  /  MARBLES', 16, 16);
  const bank = ctx.createLinearGradient(10, 10, 96, 90);
  bank.addColorStop(0, '#e7ca7a');
  bank.addColorStop(0.55, '#ba9657');
  bank.addColorStop(1, '#76583d');
  ctx.fillStyle = bank;
  roundedRect(view, 10, 19, 86, 73, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,243,198,.52)';
  ctx.lineWidth = 1;
  roundedRect(view, 10.5, 19.5, 85, 72, 12);
  ctx.stroke();
  ctx.fillStyle = '#39452f';
  ctx.font = 'bold 10px "Trebuchet MS",sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CRUMBS', 53, 36);
  ctx.fillStyle = '#fff4d0';
  ctx.font = 'bold 26px Georgia,serif';
  ctx.fillText(game.debug ? '∞' : String(Math.floor(game.state.crumbs)), 53, 68);
  if (game.debug) {
    ctx.fillStyle = '#fff2c4';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('DEBUG (F2)', 53, 84);
  }
  game.state.availableItems.forEach((type, index) => {
    const slot = toolbarSlot(index);
    const definition = ITEM_DEFINITIONS[type];
    const affordable = game.state.crumbs >= definition.cost;
    const cooldown = game.state.cooldowns[type];
    const selected = game.state.selectedItem === type;
    const hot = !selected && containsPoint(game.state.pointer, slot);
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
    const iconY = slot.y + 34;
    // Item art is drawn at board size, so shrink it to fit inside the slot.
    const artWidth = isTrackType(type) ? 70 : 54;
    const scale = Math.min(1, (slot.width - 4) / artWidth);
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
    ctx.font = 'bold 10px "Trebuchet MS",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(definition.name, slot.x + slot.width / 2, slot.y + 64);
    ctx.fillStyle = affordable ? '#f1d58e' : '#d28b79';
    ctx.font = 'bold 12px "Trebuchet MS",sans-serif';
    ctx.fillText(String(definition.cost), slot.x + slot.width / 2, slot.y + 81);
    if (cooldown > 0) {
      ctx.fillStyle = 'rgba(8,19,16,.72)';
      ctx.save();
      roundedRect(view, slot.x, slot.y, slot.width, slot.height, 8);
      ctx.clip();
      ctx.fillRect(slot.x, slot.y, slot.width, (slot.height * cooldown) / definition.cooldown);
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(246,240,219,.65)';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText(
      index < 9 ? String(index + 1) : index === 9 ? '0' : index === 10 ? '-' : '=',
      slot.x + 8,
      slot.y + 10,
    );
  });
  // ant eater special weapon and tools
  if (game.state.abilities.eater) {
    const eaterX = TOOL_BUTTONS.eater.x;
    const ready = game.state.anteaterCooldown <= 0 && !game.state.anteater;
    ctx.fillStyle = ready ? '#6c7750' : '#314b3a';
    roundedRect(view, eaterX, 8, TOOL_BUTTONS.eater.width, 88, 9);
    ctx.fill();
    ctx.strokeStyle = ready ? '#e6d18e' : 'rgba(235,218,165,.3)';
    ctx.lineWidth = ready ? 2 : 1;
    roundedRect(view, eaterX + 0.5, 8.5, TOOL_BUTTONS.eater.width - 1, 87, 9);
    ctx.stroke();
    drawAnteater(view, eaterX + TOOL_BUTTONS.eater.width / 2, 52, 0.45, ready ? 1 : 0.4);
    ctx.fillStyle = '#f4eed7';
    ctx.font = 'bold 9px "Trebuchet MS",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      ready
        ? 'EATER (E)'
        : game.state.anteater
          ? 'EATING...'
          : Math.ceil(game.state.anteaterCooldown) + 's',
      eaterX + TOOL_BUTTONS.eater.width / 2,
      88,
    );
    if (!ready && !game.state.anteater) {
      ctx.fillStyle = 'rgba(0,0,0,.42)';
      ctx.save();
      roundedRect(view, eaterX + 2, 10, TOOL_BUTTONS.eater.width - 4, 84, 7);
      ctx.clip();
      ctx.fillRect(
        eaterX + 2,
        10,
        TOOL_BUTTONS.eater.width - 4,
        (84 * game.state.anteaterCooldown) / ANTEATER_COOLDOWN,
      );
      ctx.restore();
    }
  }
  if (game.state.abilities.glove) {
    const button = TOOL_BUTTONS.glove;
    const on = game.state.gloveActive;
    ctx.fillStyle = on ? '#677b50' : '#314b3a';
    roundedRect(view, button.x, 8, button.width, 88, 9);
    ctx.fill();
    ctx.strokeStyle = on ? '#f1d58e' : 'rgba(235,218,165,.3)';
    ctx.lineWidth = on ? 2 : 1;
    roundedRect(view, button.x + 0.5, 8.5, button.width - 1, 87, 9);
    ctx.stroke();
    ctx.font = '32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🧤', button.x + button.width / 2, 56);
    ctx.fillStyle = '#f4eed7';
    ctx.font = 'bold 10px "Trebuchet MS",sans-serif';
    const gloveResting = game.state.gloveCooldown > 0 && !game.state.gloveActive;
    ctx.fillText(
      gloveResting ? Math.ceil(game.state.gloveCooldown) + 's' : 'Glove (G)',
      button.x + button.width / 2,
      84,
    );
    if (gloveResting) {
      ctx.fillStyle = 'rgba(0,0,0,.42)';
      ctx.save();
      roundedRect(view, button.x + 2, 10, button.width - 4, 84, 7);
      ctx.clip();
      ctx.fillRect(
        button.x + 2,
        10,
        button.width - 4,
        (84 * game.state.gloveCooldown) / GLOVE_COOLDOWN,
      );
      ctx.restore();
    }
  }
}

export function drawMenuOverlay(view: RenderContext) {
  const { ctx, game } = view;
  const screen = game.state.screen;
  const centerX = CANVAS_WIDTH / 2;
  ctx.fillStyle =
    screen === 'menu' || screen === 'levels' || screen === 'intro'
      ? 'rgba(16,35,28,.91)'
      : 'rgba(12,25,21,.78)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  const panel = ctx.createLinearGradient(200, 110, 700, 590);
  panel.addColorStop(0, 'rgba(63,86,60,.96)');
  panel.addColorStop(1, 'rgba(34,59,48,.97)');
  ctx.fillStyle = panel;
  const panelBounds =
    screen === 'intro'
      ? { x: 174, y: 68, width: 552, height: 610 }
      : { x: 174, y: 105, width: 552, height: 500 };
  roundedRect(view, panelBounds.x, panelBounds.y, panelBounds.width, panelBounds.height, 24);
  ctx.fill();
  ctx.strokeStyle = 'rgba(230,204,142,.55)';
  ctx.lineWidth = 2;
  roundedRect(
    view,
    panelBounds.x + 1,
    panelBounds.y + 1,
    panelBounds.width - 2,
    panelBounds.height - 2,
    23,
  );
  ctx.stroke();
  ctx.fillStyle = '#fff4d8';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(10,24,18,.55)';
  ctx.shadowBlur = 8;
  if (screen === 'menu') {
    ctx.font = 'bold 47px "Trebuchet MS",sans-serif';
    ctx.fillText('ANTS vs MARBLES', centerX, 205);
    ctx.fillStyle = '#e8d99f';
    ctx.font = '18px "Trebuchet MS",sans-serif';
    ctx.fillText('A tiny garden. A very big invasion.', centerX, 247);
  } else if (screen === 'settings') {
    ctx.font = 'bold 42px "Trebuchet MS",sans-serif';
    ctx.fillText('Settings', centerX, 164);
    ctx.fillStyle = '#e8d99f';
    ctx.font = '17px "Trebuchet MS",sans-serif';
    ctx.fillText('Choose the marble style you like best', centerX, 190);
    drawMarble(view, { type: 'gold', elapsed: 0, health: 1, maxHealth: 1 }, centerX - 48, 234, 0.9);
    drawMarble(view, { type: 'red', elapsed: 0, health: 1, maxHealth: 1 }, centerX + 48, 234, 0.9);
    ctx.fillStyle = '#f5eed8';
    ctx.font = '14px "Trebuchet MS",sans-serif';
    ctx.fillText('Your choice is saved on this device.', centerX, 260);
  } else if (screen === 'levels') {
    ctx.font = 'bold 42px "Trebuchet MS",sans-serif';
    ctx.fillText('Campaign', centerX, 161);
    ctx.fillStyle = '#e8d99f';
    ctx.font = '17px "Trebuchet MS",sans-serif';
    ctx.fillText('Choose your next garden challenge', centerX, 194);
  } else if (screen === 'intro') {
    const level = CAMPAIGN_LEVELS[game.levelIndex];
    const rows = getIntroductionRows(level);
    ctx.font = 'bold 34px "Trebuchet MS",sans-serif';
    ctx.fillText(`Level ${game.levelIndex + 1}: ${level.name}`, centerX, 139);
    ctx.font = '16px "Trebuchet MS",sans-serif';
    ctx.fillStyle = '#f1d58e';
    drawWrappedText(ctx, level.tip, centerX, 174, 500, 18);
    ctx.fillStyle = '#fff';
    if (rows.length) {
      ctx.font = 'bold 14px "Trebuchet MS",sans-serif';
      ctx.fillStyle = '#e8d99f';
      ctx.fillText('NEW THIS LEVEL', centerX, 218);
    }
    rows.forEach((row, index) => {
      const y = 270 + index * 60;
      if (row.kind === 'item') {
        drawItemPreview(view, row.itemType, 290, y);
      } else if (row.kind === 'ant') {
        drawAnt(view, {
          type: row.antType,
          x: 290,
          y: y,
          health: 1,
          maxHealth: 1,
          armor: ANT_DEFINITIONS[row.antType].armor || 0,
          slowRemaining: 0,
          flashRemaining: 0,
          animationPhase: 0,
        });
      } else if (row.kind === 'anteater') {
        drawAnteater(view, 290, y, 0.4, 1);
      } else {
        ctx.font = '34px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(row.icon, 290, y + 10);
      }
      ctx.textAlign = 'left';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(row.title, 350, y - 2);
      ctx.fillStyle = '#ccc';
      ctx.font = '15px sans-serif';
      ctx.fillText(row.description, 350, y + 20);
      ctx.textAlign = 'center';
    });
  } else {
    const isCampaign = game.mode === 'campaign';
    const isLastLevel = isCampaign && game.levelIndex === CAMPAIGN_LEVELS.length - 1;
    const messages =
      screen === 'lose'
        ? ['The ants broke through!']
        : isLastLevel
          ? ['Campaign complete!']
          : isCampaign
            ? ['Level ' + (game.levelIndex + 1) + ' complete!']
            : ['You defended the maze!'];
    ctx.font = 'bold 42px "Trebuchet MS",sans-serif';
    ctx.fillText(messages[0], centerX, CANVAS_HEIGHT / 2 - 20);
  }
  ctx.shadowBlur = 0;
  const focusedIndex = focusedMenuIndex(game);
  let unlockedIndex = -1;
  for (const button of getMenuButtons(game)) {
    if (!button.locked) {
      unlockedIndex++;
    }
    const focused = !button.locked && unlockedIndex === focusedIndex;
    const hot = !button.locked && (focused || containsPoint(game.state.pointer, button));
    const background = ctx.createLinearGradient(0, button.y, 0, button.y + button.height);
    background.addColorStop(0, button.locked ? '#394438' : hot ? '#e8cd80' : '#bf985c');
    background.addColorStop(1, button.locked ? '#25352d' : hot ? '#ad824f' : '#77583d');
    ctx.fillStyle = background;
    roundedRect(view, button.x, button.y, button.width, button.height, 10);
    ctx.fill();
    ctx.strokeStyle = hot ? '#fff0bd' : 'rgba(255,240,192,.4)';
    ctx.lineWidth = hot ? 2 : 1;
    roundedRect(view, button.x + 0.5, button.y + 0.5, button.width - 1, button.height - 1, 10);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = button.locked ? '#666' : hot ? '#ffd54f' : '#fff';
    if (button.subtitle) {
      ctx.fillStyle = button.locked ? '#879083' : '#fff4d8';
      const compact = button.height < 70;
      ctx.font = `bold ${compact ? 20 : 32}px "Trebuchet MS",sans-serif`;
      ctx.fillText(
        button.locked ? '🔒' : button.label,
        button.x + button.width / 2,
        button.y + (compact ? 25 : 48),
      );
      ctx.fillStyle = '#e6d8b5';
      ctx.font = `${compact ? 12 : 10}px "Trebuchet MS",sans-serif`;
      ctx.fillText(
        button.subtitle,
        button.x + button.width / 2,
        button.y + (compact ? 46 : button.height - 12),
      );
    } else {
      ctx.fillStyle = '#fff4d8';
      ctx.font = 'bold 18px "Trebuchet MS",sans-serif';
      ctx.fillText(button.label, button.x + button.width / 2, button.y + 29);
    }
    if (focused) {
      ctx.strokeStyle = '#fff6cf';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      roundedRect(view, button.x - 4, button.y - 4, button.width + 8, button.height + 8, 12);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) {
    lines.push(line);
  }
  lines.forEach((line, index) => ctx.fillText(line, centerX, y + index * lineHeight));
}
