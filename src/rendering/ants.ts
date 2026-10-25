import { ANT_HILL_Y, CANVAS_WIDTH, TOOLBAR_HEIGHT } from '../game/constants';
import { ANT_DEFINITIONS } from '../game/definitions';
import type { AntAppearance, RenderContext } from './context';
import { roundedRect } from './primitives';

export function drawAnteater(
  view: RenderContext,
  x: number,
  y: number,
  scale: number,
  alpha: number,
) {
  const { ctx, game } = view;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  const sway = Math.sin((game.state.elapsed || 0) * 14) * 3;
  ctx.fillStyle = '#6d5a48';
  ctx.beginPath();
  ctx.ellipse(0, 18, 26, 36, 0, 0, 7);
  ctx.fill(); // body
  ctx.fillStyle = '#4e3f33';
  ctx.beginPath();
  ctx.moveTo(-16, -4);
  ctx.lineTo(16, -4);
  ctx.lineTo(10, 40);
  ctx.lineTo(-10, 40);
  ctx.fill();
  ctx.fillStyle = '#8a735d';
  ctx.beginPath();
  ctx.ellipse(0, -22, 14, 20, 0, 0, 7);
  ctx.fill(); // head
  ctx.beginPath();
  ctx.moveTo(-7, -30);
  ctx.lineTo(7, -30);
  ctx.lineTo(3, -70);
  ctx.lineTo(-3, -70);
  ctx.fill(); // snout
  ctx.strokeStyle = '#e57373';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -70);
  ctx.lineTo(sway, -84);
  ctx.stroke(); // tongue
  ctx.fillStyle = '#fff';
  ctx.fillRect(-10, -28, 5, 5);
  ctx.fillRect(5, -28, 5, 5);
  ctx.fillStyle = '#000';
  ctx.fillRect(-8, -27, 2, 3);
  ctx.fillRect(7, -27, 2, 3);
  ctx.fillStyle = '#3e2f24';
  ctx.fillRect(-32, 10 + sway, 8, 16);
  ctx.fillRect(24, 10 - sway, 8, 16); // legs
  ctx.strokeStyle = '#4e3f33';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 52);
  ctx.quadraticCurveTo(sway * 3, 70, 0, 86);
  ctx.stroke(); // tail
  ctx.restore();
}

export function drawQueen(view: RenderContext, ant: AntAppearance) {
  const { ctx } = view;
  const x = ant.x;
  const y = ant.y;
  const definition = ANT_DEFINITIONS.queen;
  const flashing = ant.flashRemaining > 0;
  const sway = Math.sin(ant.animationPhase) * 6;
  const color = flashing ? '#fff' : definition.color;
  const dark = flashing ? '#eee' : '#4a1010';
  ctx.save();
  ctx.strokeStyle = dark;
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  for (let index = 0; index < 3; index++) {
    const sy = y + 40 + index * 34;
    const legOffset = Math.sin(ant.animationPhase + index * 2) * 8;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + side * 40, sy);
      ctx.lineTo(x + side * (150 + legOffset), sy - 14);
      ctx.lineTo(x + side * (235 + legOffset), sy + 8);
      ctx.stroke();
    }
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y + 135, 115, 80, 0, 0, 7);
  ctx.fill(); // abdomen
  ctx.fillStyle = dark;
  for (let index = 0; index < 4; index++) {
    ctx.beginPath();
    ctx.ellipse(x, y + 105 + index * 22, 100 - index * 8, 3, 0, 0, 7);
    ctx.fill();
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y + 60, 48, 36, 0, 0, 7);
  ctx.fill(); // thorax
  ctx.beginPath();
  ctx.ellipse(x, y + 5, 44, 34, 0, 0, 7);
  ctx.fill(); // head
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + side * 14, y - 24);
    ctx.quadraticCurveTo(x + side * (50 + sway), y - 70, x + side * (80 + sway), y - 60);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + side * 16, y - 22);
    ctx.lineTo(x + side * (30 - sway / 3), y - 48);
    ctx.lineTo(x + side * 8, y - 38);
    ctx.stroke();
  } // antennae & mandibles
  ctx.fillStyle = '#ff1744';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(x + side * 20, y - 2, 7, 0, 7);
    ctx.fill();
  }
  ctx.fillStyle = '#ffd54f';
  ctx.beginPath();
  ctx.moveTo(x - 26, y + 18);
  ctx.lineTo(x - 26, y - 26);
  ctx.lineTo(x - 13, y - 8);
  ctx.lineTo(x, y - 34);
  ctx.lineTo(x + 13, y - 8);
  ctx.lineTo(x + 26, y - 26);
  ctx.lineTo(x + 26, y + 18);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#b8860b';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
  if (ant.emergence) {
    return;
  }
  const barWidth = 300;
  const barY = Math.max(TOOLBAR_HEIGHT + 6, y - 40);
  ctx.fillStyle = '#400';
  ctx.fillRect(x - barWidth / 2, barY, barWidth, 10);
  ctx.fillStyle = '#e44';
  ctx.fillRect(x - barWidth / 2, barY, barWidth * Math.max(0, ant.health / ant.maxHealth), 10);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.strokeRect(x - barWidth / 2, barY, barWidth, 10);
}

export function drawAnt(view: RenderContext, ant: AntAppearance) {
  const { ctx } = view;
  if (ant.emergence) {
    if (ant.emergence.elapsed <= 0) {
      return;
    }
    ctx.save();
    // Soil hides the underground body while the head crawls out first.
    ctx.beginPath();
    ctx.rect(0, 0, CANVAS_WIDTH, ANT_HILL_Y);
    ctx.clip();
    if (ant.spansAllLanes) {
      drawQueen(view, ant);
    } else {
      drawAntBody(view, ant);
    }
    ctx.restore();
    return;
  }
  const render = ant;
  if (render.spansAllLanes) {
    return drawQueen(view, render);
  }
  if (render.traversal && render.traversal.dig) {
    const key = render.traversal.progress;
    const x = render.x;
    ctx.fillStyle = '#5d4037';
    ctx.beginPath();
    ctx.ellipse(x, render.y + 6, 20, 9, 0, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#795548';
    ctx.beginPath();
    ctx.ellipse(x, render.y + 2, 13, 8, 0, 0, 7);
    ctx.fill();
    if (key < 0.15 || key > 0.85) {
      ctx.globalAlpha = 0.7;
      drawAntBody(view, render);
      ctx.globalAlpha = 1;
    }
    for (let index = 1; index < 4; index++) {
      ctx.fillStyle = 'rgba(93,64,55,' + (0.5 - index * 0.12) + ')';
      ctx.beginPath();
      ctx.arc(x + (index % 2 ? 5 : -5), render.y + index * 14, 5 - index, 0, 7);
      ctx.fill();
    }
    return;
  }
  drawAntBody(view, render);
}

export function drawAntHill(view: RenderContext, x: number, y: number, active: boolean) {
  const { ctx, game } = view;
  const wobble = active ? Math.sin(game.state.elapsed * 18) * 2 : 0;
  ctx.save();
  ctx.fillStyle = 'rgba(22,38,27,.28)';
  ctx.beginPath();
  ctx.ellipse(x, y + 10, 34, 8, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = '#6b4934';
  ctx.beginPath();
  ctx.ellipse(x, y, 29, 14 + wobble, 0, Math.PI, Math.PI * 2);
  ctx.lineTo(x + 29, y + 5);
  ctx.quadraticCurveTo(x, y + 19, x - 29, y + 5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#8b6243';
  ctx.beginPath();
  ctx.ellipse(x, y - 3, 20, 8, 0, Math.PI, Math.PI * 2);
  ctx.lineTo(x + 20, y);
  ctx.quadraticCurveTo(x, y + 10, x - 20, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#3f2b24';
  ctx.beginPath();
  ctx.ellipse(x, y - 1, 7, 3.5, 0, 0, 7);
  ctx.fill();
  if (active) {
    ctx.fillStyle = '#b88a5b';
    for (let index = 0; index < 4; index++) {
      const ant = game.state.elapsed * 4 + index * 1.7;
      ctx.beginPath();
      ctx.arc(x + Math.cos(ant) * 22, y - 8 + Math.sin(ant) * 5, 2.5, 0, 7);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function drawAntBody(view: RenderContext, ant: AntAppearance) {
  const { ctx } = view;
  const definition = ANT_DEFINITIONS[ant.type];
  const scale = definition.size;
  const x = ant.x;
  const y = ant.y - (ant.jumpHeight || 0);
  if (ant.jumpHeight) {
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath();
    ctx.ellipse(ant.x, ant.y + 8, 14 * scale, 5, 0, 0, 7);
    ctx.fill();
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.scale(scale, scale); // head points up the lane
  const color = ant.flashRemaining > 0 ? '#fff' : definition.color;
  const shade = ctx.createLinearGradient(0, -12, 0, 12);
  shade.addColorStop(0, '#fff7');
  shade.addColorStop(0.35, color);
  shade.addColorStop(1, '#17251f');
  ctx.strokeStyle = '#342821';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (let index = 0; index < 3; index++) {
    const legOffset = Math.sin(ant.animationPhase + index * 2) * 5;
    ctx.beginPath();
    ctx.moveTo(6 - index * 6, 0);
    ctx.lineTo(10 - index * 6 + legOffset, 14);
    ctx.moveTo(6 - index * 6, 0);
    ctx.lineTo(10 - index * 6 - legOffset, -14);
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(6 - index * 6, 1);
    ctx.lineTo(10 - index * 6 + legOffset, 13);
    ctx.moveTo(6 - index * 6, 1);
    ctx.lineTo(10 - index * 6 - legOffset, -13);
    ctx.stroke();
    ctx.strokeStyle = '#342821';
    ctx.lineWidth = 3;
  }
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.ellipse(-16, 0, 13, 9, 0, 0, 7);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, 0, 8, 7, 0, 0, 7);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(14, 0, 8, 7, 0, 0, 7);
  ctx.fill();
  ctx.strokeStyle = 'rgba(35,24,20,.65)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(-16, 0, 13, 9, 0, 0, 7);
  ctx.ellipse(0, 0, 8, 7, 0, 0, 7);
  ctx.ellipse(14, 0, 8, 7, 0, 0, 7);
  ctx.stroke();
  ctx.fillStyle = '#f4c7a0';
  ctx.beginPath();
  ctx.arc(18, -4, 3, 0, 7);
  ctx.arc(18, 4, 3, 0, 7);
  ctx.fill();
  ctx.fillStyle = '#211d19';
  ctx.beginPath();
  ctx.arc(19, -4, 1.4, 0, 7);
  ctx.arc(19, 4, 1.4, 0, 7);
  ctx.fill();
  ctx.strokeStyle = '#342821';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(20, -3);
  ctx.lineTo(28, -8);
  ctx.moveTo(20, 3);
  ctx.lineTo(28, 8);
  ctx.stroke();
  if (ant.type === 'jumper') {
    ctx.fillStyle = '#b9e3a0';
    ctx.beginPath();
    ctx.ellipse(-24, 0, 5, 3, 0, 0, 7);
    ctx.fill();
  }
  if (ant.type === 'digger') {
    ctx.fillStyle = '#f2c86a';
    ctx.beginPath();
    ctx.moveTo(23, -8);
    ctx.lineTo(29, -10);
    ctx.lineTo(27, -4);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(23, 8);
    ctx.lineTo(29, 10);
    ctx.lineTo(27, 4);
    ctx.closePath();
    ctx.fill();
  }
  if (definition.shiny) {
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.beginPath();
    ctx.ellipse(-19, -4, 5, 2.5, -0.3, 0, 7);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-1, -3, 3, 1.8, -0.3, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#76ff03';
    ctx.beginPath();
    ctx.arc(-18, 3, 3, 0, 7);
    ctx.fill();
  }
  if (ant.armor > 0) {
    const armor = ctx.createLinearGradient(0, -12, 0, 12);
    armor.addColorStop(0, '#eff4e5');
    armor.addColorStop(0.5, '#78929a');
    armor.addColorStop(1, '#354c50');
    ctx.strokeStyle = armor;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(14, 0, 12, -1.4, 1.4);
    ctx.stroke();
  }
  if (ant.slowRemaining > 0) {
    ctx.strokeStyle = 'rgba(149,223,242,.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-2, 0, 22, 0, 7);
    ctx.stroke();
  }
  ctx.restore();
  if (!ant.emergence && ant.health > 0 && ant.maxHealth > 0) {
    const barY = Math.max(TOOLBAR_HEIGHT + 6, y - 28 * scale - 10);
    ctx.fillStyle = 'rgba(20,30,25,.75)';
    roundedRect(view, x - 16, barY, 32, 6, 2);
    ctx.fill();
    ctx.fillStyle = '#e47b61';
    ctx.fillRect(x - 15, barY + 1, 30 * Math.min(1, ant.health / ant.maxHealth), 4);
  }
}
