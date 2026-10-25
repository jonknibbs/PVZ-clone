import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGame } from '../src/game/game';
import {
  createBrowserPreferenceStore,
  createMemoryPreferenceStore,
  setMarbleStyle,
  unlockLevel,
} from '../src/game/preferences';

class MemoryStorage implements Storage {
  private readonly items = new Map<string, string>();
  get length() {
    return this.items.size;
  }
  clear() {
    this.items.clear();
  }
  getItem(key: string) {
    return this.items.get(key) ?? null;
  }
  key(index: number) {
    return [...this.items.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.items.delete(key);
  }
  setItem(key: string, value: string) {
    this.items.set(key, value);
  }
}

test('existing save keys and all three marble styles survive reload', () => {
  const storage = new MemoryStorage();
  for (const style of ['original', 'classic', 'character'] as const) {
    storage.setItem('avm_marble_style', style);
    storage.setItem('avm_unlocked', '6');
    const game = createGame({ preferenceStore: createBrowserPreferenceStore(storage) });
    assert.equal(game.preferences.marbleStyle, style);
    assert.equal(game.preferences.unlockedLevels, 6);
    unlockLevel(game, 7);
    assert.equal(storage.getItem('avm_unlocked'), '7');
    setMarbleStyle(game, 'character');
    assert.equal(storage.getItem('avm_marble_style'), 'character');
  }
});

test('invalid saved preferences use documented defaults and bounded level progress', () => {
  const storage = new MemoryStorage();
  const store = createBrowserPreferenceStore(storage);
  assert.deepEqual(store.load(), {
    marbleStyle: 'character',
    unlockedLevels: 1,
    tutorialDone: false,
  });
  storage.setItem('avm_marble_style', 'unknown');
  storage.setItem('avm_unlocked', '999');
  assert.deepEqual(store.load(), {
    marbleStyle: 'character',
    unlockedLevels: 10,
    tutorialDone: false,
  });
  storage.setItem('avm_unlocked', '-3');
  assert.equal(store.load().unlockedLevels, 1);
});

test('progress never decreases and never exceeds the last level', () => {
  const game = createGame({ preferenceStore: createMemoryPreferenceStore() });
  unlockLevel(game, 5);
  unlockLevel(game, 2);
  assert.equal(game.preferences.unlockedLevels, 5);
  unlockLevel(game, 100);
  assert.equal(game.preferences.unlockedLevels, 10);
});

test('storage write failures are logged and shown instead of silently losing progress', (context) => {
  const warning = context.mock.method(console, 'warn', () => {});
  const store = createMemoryPreferenceStore();
  store.save = () => {
    throw new Error('Storage denied');
  };
  const game = createGame({ preferenceStore: store });
  unlockLevel(game, 2);
  assert.equal(game.preferences.unlockedLevels, 2);
  assert.equal(warning.mock.callCount(), 1);
  assert.match(game.state.notification?.text ?? '', /could not be saved/);
});
