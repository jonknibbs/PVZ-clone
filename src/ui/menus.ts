import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../game/constants';
import { ANT_DESCRIPTIONS, CAMPAIGN_LEVELS, ITEM_DEFINITIONS } from '../game/definitions';
import { resetGame, startGame } from '../game/game';
import { setMarbleStyle } from '../game/preferences';
import type { AntType, CampaignLevel, Game, ItemType, Rectangle } from '../game/types';

export interface MenuButton extends Rectangle {
  label: string;
  subtitle?: string;
  locked?: boolean;
  onClick: () => void;
}

export type IntroductionRow = {
  title: string;
  description: string;
} & (
  | {
      kind: 'item';
      itemType: ItemType;
    }
  | {
      kind: 'ant';
      antType: AntType;
    }
  | {
      kind: 'anteater';
    }
  | {
      kind: 'glove';
      icon: string;
    }
);

export function getMenuButtons(game: Game): MenuButton[] {
  const centerX = CANVAS_WIDTH / 2;
  const button = (label: string, y: number, onClick: () => void): MenuButton => ({
    x: centerX - 110,
    y,
    width: 220,
    height: 44,
    label,
    onClick,
  });
  const isCampaign = game.mode === 'campaign';
  const startY = CANVAS_HEIGHT / 2 + 50;
  switch (game.state.screen) {
    case 'menu':
      return [
        button('Campaign', 330, () => {
          game.state.screen = 'levels';
        }),
        button('Free Play', 392, () => startGame(game, 'free', 0)),
        button('How to Play', 454, () => startGame(game, 'tutorial', 0)),
        button('Settings', 516, () => {
          game.state.screen = 'settings';
        }),
      ];
    case 'settings':
      return [
        button(game.preferences.marbleStyle === 'original' ? 'Original  ✓' : 'Original', 300, () =>
          setMarbleStyle(game, 'original'),
        ),
        button(
          game.preferences.marbleStyle === 'classic' ? 'Classic glossy  ✓' : 'Classic glossy',
          360,
          () => setMarbleStyle(game, 'classic'),
        ),
        button(
          game.preferences.marbleStyle === 'character'
            ? 'Character marbles  ✓'
            : 'Character marbles',
          420,
          () => setMarbleStyle(game, 'character'),
        ),
        button('Back', 520, () => {
          game.state.screen = 'menu';
        }),
      ];
    case 'levels':
      return [
        ...CAMPAIGN_LEVELS.map((level, levelIndex) => ({
          x: (CANVAS_WIDTH - (2 * 220 + 18)) / 2 + (levelIndex % 2) * (220 + 18),
          y: 220 + Math.floor(levelIndex / 2) * 60,
          width: 220,
          height: 54,
          label: String(levelIndex + 1),
          subtitle: level.name,
          locked: levelIndex >= game.preferences.unlockedLevels,
          onClick: () =>
            levelIndex === 0 && !game.preferences.tutorialDone
              ? startGame(game, 'tutorial', 0)
              : startGame(game, 'campaign', levelIndex),
        })),
        button('Back', 540, () => resetGame(game)),
      ];
    case 'intro':
      return [
        button('Start', 548, () => {
          game.state.screen = 'play';
        }),
        button('Back', 600, () => {
          resetGame(game);
          game.state.screen = 'levels';
        }),
      ];
    case 'win': {
      const buttons = [];
      if (isCampaign && game.levelIndex < CAMPAIGN_LEVELS.length - 1) {
        buttons.push(
          button('Next Level', startY, () => startGame(game, 'campaign', game.levelIndex + 1)),
        );
      }
      if (isCampaign) {
        buttons.push(
          button('Level Select', startY + 56 * buttons.length, () => {
            resetGame(game);
            game.state.screen = 'levels';
          }),
        );
      } else {
        buttons.push(button('Play Again', startY, () => startGame(game, 'free', 0)));
      }
      buttons.push(button('Main Menu', startY + 56 * buttons.length, () => resetGame(game)));
      return buttons;
    }
    case 'lose': {
      const buttons = [
        button('Try Again', startY, () => startGame(game, game.mode, game.levelIndex)),
      ];
      if (isCampaign) {
        buttons.push(
          button('Level Select', startY + 56, () => {
            resetGame(game);
            game.state.screen = 'levels';
          }),
        );
      }
      buttons.push(button('Main Menu', startY + 56 * buttons.length, () => resetGame(game)));
      return buttons;
    }
  }
  return [];
}

export function getIntroductionRows(level: CampaignLevel): IntroductionRow[] {
  const rows: IntroductionRow[] = [];
  for (const type of level.newItems) {
    rows.push({
      kind: 'item',
      itemType: type,
      title: `${ITEM_DEFINITIONS[type].name} (${ITEM_DEFINITIONS[type].cost})`,
      description: ITEM_DEFINITIONS[type].description,
    });
  }
  if (level.newGlove) {
    rows.push({
      kind: 'glove',
      icon: '🧤',
      title: 'Glove (G)',
      description: 'Pick up and move marbles and track pieces.',
    });
  }
  if (level.newEater) {
    rows.push({
      kind: 'anteater',
      title: 'Ant Eater (E)',
      description: 'Sweeps the whole maze clean, then rests 90 s.',
    });
  }
  for (const antType of level.newAntTypes) {
    rows.push({
      kind: 'ant',
      antType,
      title: ANT_DESCRIPTIONS[antType][0],
      description: ANT_DESCRIPTIONS[antType][1],
    });
  }
  return rows;
}
