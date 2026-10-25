import { CAMPAIGN_LEVELS } from './definitions';
import type { Game, MarbleStyle, Preferences, PreferenceStore } from './types';

export function createMemoryPreferenceStore(): PreferenceStore {
  let preferences: Preferences = { marbleStyle: 'character', unlockedLevels: 1 };
  return {
    load: () => ({ ...preferences }),
    save: (next) => {
      preferences = { ...next };
    },
  };
}

export function createBrowserPreferenceStore(storage: Storage): PreferenceStore {
  return {
    load() {
      const savedStyle = storage.getItem('avm_marble_style');
      const savedLevels = Number.parseInt(storage.getItem('avm_unlocked') ?? '', 10);
      return {
        marbleStyle: isMarbleStyle(savedStyle) ? savedStyle : 'character',
        unlockedLevels: Number.isFinite(savedLevels)
          ? Math.max(1, Math.min(CAMPAIGN_LEVELS.length, savedLevels))
          : 1,
      };
    },
    save(preferences) {
      storage.setItem('avm_marble_style', preferences.marbleStyle);
      storage.setItem('avm_unlocked', String(preferences.unlockedLevels));
    },
  };
}

export function isMarbleStyle(value: string | null): value is MarbleStyle {
  return value === 'original' || value === 'classic' || value === 'character';
}

function persistPreferences(game: Game) {
  try {
    game.preferenceStore.save(game.preferences);
  } catch (error) {
    console.warn(
      'Unable to save game preferences. Changes will last for this session only.',
      error,
    );
    game.state.notification = {
      text: 'Progress could not be saved on this device.',
      lifeRemaining: 4,
      tone: 'error',
    };
  }
}

export function setMarbleStyle(game: Game, style: MarbleStyle) {
  game.preferences.marbleStyle = style;
  persistPreferences(game);
}

export function unlockLevel(game: Game, levelCount: number) {
  if (levelCount <= game.preferences.unlockedLevels) {
    return;
  }
  game.preferences.unlockedLevels = Math.min(levelCount, CAMPAIGN_LEVELS.length);
  persistPreferences(game);
}
