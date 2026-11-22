import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultSetupSettings, changeSetupName, setupFromGame } from '../src/setupSettings.ts';
import { isSetupSettings, restoreSetupSettings, playerNamesKey, setupSettingsKey } from '../src/storage.ts';
import { createStoredValue } from '../src/persistence.ts';
import { newGame } from '../src/model.ts';
import { officialScripts } from '../src/scripts.ts';

test('participant count is independent of stored names and hidden names survive a game', () => {
  const initial = defaultSetupSettings();
  const named = changeSetupName(initial, 14, '숨겨진 이름');
  const reduced = { ...named, count: 5 };
  assert.equal(reduced.names[14], '숨겨진 이름');
  assert.equal(initial.names[14], '');
  const game = newGame(officialScripts[0], Array.from({ length: 5 }, (_, i) => ({ name: `이름${i}`, traveller: false })));
  const ended = setupFromGame(reduced, game);
  assert.equal(ended.count, 5);
  assert.equal(ended.names[0], '이름0');
  assert.equal(ended.names[14], '숨겨진 이름');
  assert.equal(reduced.names[0], '');
});

test('legacy names migrate without writes and new settings restore count independently', () => {
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
  } });
  assert.deepEqual(restoreSetupSettings().value, defaultSetupSettings());
  const names = ['가', '나', '다', '라', '마', '바'];
  data.set(playerNamesKey, JSON.stringify(names));
  const migrated = restoreSetupSettings();
  assert.equal(migrated.raw, null);
  assert.equal(migrated.value.count, 6);
  assert.deepEqual(migrated.value.names.slice(0, 6), names);
  assert.equal(data.has(setupSettingsKey), false);
  const settings = { ...migrated.value, count: 5 };
  createStoredValue(setupSettingsKey, migrated.raw, isSetupSettings).write(settings);
  assert.deepEqual(restoreSetupSettings().value, settings);
  assert.equal(data.get(playerNamesKey), JSON.stringify(names));
  for (const invalid of [{ ...settings, count: 21 }, { ...settings, count: 5.5 }, { ...settings, names: [1] }]) {
    data.set(setupSettingsKey, JSON.stringify(invalid));
    assert.ok(restoreSetupSettings().error);
    assert.deepEqual(restoreSetupSettings().value, defaultSetupSettings());
  }
});
