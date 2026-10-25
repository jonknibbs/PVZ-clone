import {
  ANT_HILL_Y,
  BOARD_BOTTOM,
  BOARD_X,
  BOARD_Y,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  LANE_COUNT,
  LANE_LENGTH,
  LANE_WIDTH,
  laneCenterX,
  TOOLBAR_HEIGHT,
} from '../game/constants';
import { drawAntHill } from './ants';
import type { RenderContext } from './context';
import { roundedRect } from './primitives';

export function drawBoard(view: RenderContext) {
  const { ctx, game } = view;
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  const backdrop = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  backdrop.addColorStop(0, '#314b3e');
  backdrop.addColorStop(0.55, '#253d32');
  backdrop.addColorStop(1, '#1b3029');
  ctx.fillStyle = backdrop;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  for (let index = 0; index < 18; index++) {
    const x = (index * 97 + 31) % CANVAS_WIDTH;
    const y = TOOLBAR_HEIGHT + ((index * 137 + 67) % (CANVAS_HEIGHT - TOOLBAR_HEIGHT));
    ctx.fillStyle = index % 2 ? 'rgba(206,205,134,.08)' : 'rgba(140,190,125,.1)';
    ctx.beginPath();
    ctx.ellipse(x, y, 2 + (index % 3), 7 + (index % 4), index * 0.7, 0, 7);
    ctx.fill();
  }
  ctx.save();
  ctx.shadowColor = 'rgba(9,22,17,.55)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 10;
  const frame = ctx.createLinearGradient(0, BOARD_Y, 0, BOARD_BOTTOM);
  frame.addColorStop(0, '#c9a16a');
  frame.addColorStop(0.5, '#896140');
  frame.addColorStop(1, '#503d32');
  ctx.fillStyle = frame;
  roundedRect(view, BOARD_X - 12, BOARD_Y - 8, LANE_COUNT * LANE_WIDTH + 24, LANE_LENGTH + 18, 18);
  ctx.fill();
  ctx.restore();
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    const x = BOARD_X + lane * LANE_WIDTH;
    const turf = ctx.createLinearGradient(x, BOARD_Y, x + LANE_WIDTH, BOARD_Y);
    turf.addColorStop(0, lane % 2 ? '#527a4d' : '#5e8650');
    turf.addColorStop(0.48, lane % 2 ? '#729653' : '#80a45c');
    turf.addColorStop(1, lane % 2 ? '#4a7048' : '#557b4a');
    ctx.fillStyle = turf;
    ctx.fillRect(x, BOARD_Y, LANE_WIDTH, LANE_LENGTH);
    const shade = ctx.createLinearGradient(x, BOARD_Y, x, BOARD_BOTTOM);
    shade.addColorStop(0, 'rgba(255,242,183,.10)');
    shade.addColorStop(0.48, 'rgba(255,255,255,0)');
    shade.addColorStop(1, 'rgba(19,43,31,.18)');
    ctx.fillStyle = shade;
    ctx.fillRect(x, BOARD_Y, LANE_WIDTH, LANE_LENGTH);
    for (let detailIndex = 0; detailIndex < 9; detailIndex++) {
      const gx = x + 12 + ((detailIndex * 37 + lane * 11) % 76);
      const gy = BOARD_Y + 32 + ((detailIndex * 83 + lane * 47) % 475);
      ctx.strokeStyle = detailIndex % 2 ? 'rgba(221,231,158,.19)' : 'rgba(27,61,38,.17)';
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(gx, gy + 3);
      ctx.quadraticCurveTo(gx - 3, gy - 3, gx - 4, gy - 6);
      ctx.moveTo(gx, gy + 3);
      ctx.quadraticCurveTo(gx + 2, gy - 2, gx + 4, gy - 5);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(235,229,171,.12)';
    for (let y = BOARD_Y + 72; y < BOARD_BOTTOM; y += 108) {
      ctx.fillRect(x + 7, y, LANE_WIDTH - 14, 1);
    }
  }
  for (let lane = 0; lane <= LANE_COUNT; lane++) {
    const x = BOARD_X + lane * LANE_WIDTH - 4;
    const rail = ctx.createLinearGradient(x, 0, x + 8, 0);
    rail.addColorStop(0, '#563c30');
    rail.addColorStop(0.35, '#dbb37a');
    rail.addColorStop(0.65, '#8d6345');
    rail.addColorStop(1, '#49372f');
    ctx.fillStyle = rail;
    roundedRect(view, x, BOARD_Y - 1, 8, LANE_LENGTH + 3, 4);
    ctx.fill();
    for (let y = BOARD_Y + 24; y < BOARD_BOTTOM - 8; y += 74) {
      ctx.fillStyle = 'rgba(47,36,29,.45)';
      ctx.beginPath();
      ctx.arc(x + 4, y, 1.7, 0, 7);
      ctx.fill();
    }
  }
  const chute = ctx.createLinearGradient(0, BOARD_Y - 15, 0, BOARD_Y + 9);
  chute.addColorStop(0, '#f4d68e');
  chute.addColorStop(0.35, '#b27a4e');
  chute.addColorStop(1, '#503c32');
  ctx.fillStyle = chute;
  roundedRect(view, BOARD_X - 7, BOARD_Y - 15, LANE_COUNT * LANE_WIDTH + 14, 26, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,242,199,.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(BOARD_X + 4, BOARD_Y - 11);
  ctx.lineTo(BOARD_X + LANE_COUNT * LANE_WIDTH - 4, BOARD_Y - 11);
  ctx.stroke();
  ctx.fillStyle = '#fff2ca';
  ctx.font = 'bold 11px "Trebuchet MS",sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#382c25';
  ctx.shadowBlur = 3;
  ctx.fillText('MARBLE DROP ZONE', BOARD_X + (LANE_COUNT * LANE_WIDTH) / 2, BOARD_Y + 3);
  ctx.shadowBlur = 0;
  const exit = ctx.createLinearGradient(0, BOARD_BOTTOM, 0, BOARD_BOTTOM + 48);
  exit.addColorStop(0, '#324b3b');
  exit.addColorStop(1, '#1e322b');
  ctx.fillStyle = exit;
  roundedRect(view, BOARD_X - 3, BOARD_BOTTOM - 2, LANE_COUNT * LANE_WIDTH + 6, 48, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(224,204,145,.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(BOARD_X + 12, BOARD_BOTTOM + 4);
  ctx.lineTo(BOARD_X + LANE_COUNT * LANE_WIDTH - 12, BOARD_BOTTOM + 4);
  ctx.stroke();
  ctx.fillStyle = '#edcf89';
  ctx.font = 'bold 12px "Trebuchet MS",sans-serif';
  // Sits below the ant hills, which used to cover it.
  ctx.fillText('ANT TRAIL  ·  EXIT', BOARD_X + (LANE_COUNT * LANE_WIDTH) / 2, BOARD_BOTTOM + 41);
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    const active = game.state.ants.some(
      (ant) =>
        (ant.spansAllLanes || ant.lane === lane) &&
        ant.health > 0 &&
        ant.emergence &&
        ant.emergence.elapsed >= 0,
    );
    drawAntHill(view, laneCenterX(lane), ANT_HILL_Y, active);
  }
}
