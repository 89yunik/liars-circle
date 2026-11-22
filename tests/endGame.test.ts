import test from 'node:test';
import assert from 'node:assert/strict';
import { endStoredGame } from '../src/endGame.ts';
import { createStoredValue, StorageConflictError } from '../src/persistence.ts';
import { isGame, isSetupSettings } from '../src/storage.ts';
import { defaultSetupSettings, setupFromGame } from '../src/setupSettings.ts';
import { newGame } from '../src/model.ts';
import { officialScripts } from '../src/scripts.ts';

function fixture() {
  const data = new Map<string, string>();
  const failures = { settings: false, removal: false };
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, raw: string) => {
      if (key === 'settings' && failures.settings) throw new Error('Settings write failed');
      data.set(key, raw);
    },
    removeItem: (key: string) => {
      if (failures.removal) throw new Error('Game removal failed');
      data.delete(key);
    },
  } as Storage;
  const game = newGame(officialScripts[0], Array.from({ length: 5 }, (_, i) => ({ name: `이름${i}`, traveller: false })));
  const games = createStoredValue('game', null, isGame, () => storage);
  const settings = createStoredValue('settings', null, isSetupSettings, () => storage);
  games.write(game);
  const savePlayers = () => settings.write(setupFromGame(defaultSetupSettings(), game));
  return { data, failures, game, games, savePlayers };
}

test('ending saves player settings before removing the game', () => {
  const f = fixture();
  endStoredGame(f.games, f.game, f.savePlayers);
  assert.equal(f.data.has('game'), false);
  assert.equal(JSON.parse(f.data.get('settings')!).names[0], '이름0');
});

test('settings failure keeps the game and permits retry', () => {
  const f = fixture();
  f.failures.settings = true;
  assert.throws(() => endStoredGame(f.games, f.game, f.savePlayers), /Settings write failed/);
  assert.ok(f.data.has('game'));
  f.failures.settings = false;
  endStoredGame(f.games, f.game, f.savePlayers);
  assert.equal(f.data.has('game'), false);
});

test('removal failure preserves the game and permits retry after settings were saved', () => {
  const f = fixture();
  f.failures.removal = true;
  assert.throws(() => endStoredGame(f.games, f.game, f.savePlayers), /Game removal failed/);
  assert.ok(f.data.has('game'));
  assert.ok(f.data.has('settings'));
  f.failures.removal = false;
  endStoredGame(f.games, f.game, f.savePlayers);
  assert.equal(f.data.has('game'), false);
});

test('a newer game revision blocks settings changes and removal', () => {
  const f = fixture();
  f.data.set('game', 'newer revision');
  assert.throws(() => endStoredGame(f.games, f.game, f.savePlayers), StorageConflictError);
  assert.equal(f.data.get('game'), 'newer revision');
  assert.equal(f.data.has('settings'), false);
});
