import test from 'node:test';
import assert from 'node:assert/strict';
import { createStoredValue, StorageConflictError } from '../src/persistence.ts';
import { isGame, isLibrary, isScript } from '../src/storage.ts';
import { newGame, togglePlayerEvent, type Game } from '../src/model.ts';
import { officialScripts, parseScript } from '../src/scripts.ts';

class MemoryStorage implements Storage {
  data = new Map<string, string>();
  failWrite = false;
  failRemove = false;
  get length() { return this.data.size; }
  key(index: number) { return [...this.data.keys()][index] ?? null; }
  clear() { this.data.clear(); }
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) {
    if (this.failWrite) throw new DOMException('Full', 'QuotaExceededError');
    this.data.set(key, value);
  }
  removeItem(key: string) {
    if (this.failRemove) throw new Error('Blocked');
    this.data.delete(key);
  }
}
const fresh = () => newGame(officialScripts[0], Array.from({ length: 5 }, () => ({ name: '', traveller: false })));

test('stale writers cannot overwrite or delete a newer tab snapshot', () => {
  const storage = new MemoryStorage();
  const a = createStoredValue('game', null, isGame, () => storage);
  const b = createStoredValue('game', null, isGame, () => storage);
  const game = fresh();
  a.write(game);
  assert.equal(a.isCurrent(), true);
  assert.equal(b.isCurrent(), false);
  assert.throws(() => b.write(fresh()), StorageConflictError);
  assert.throws(() => b.remove(), StorageConflictError);
  assert.deepEqual(JSON.parse(storage.getItem('game')!), game);
  a.remove();
  assert.equal(storage.getItem('game'), null);
});

test('failed writes and removals preserve the stored data and allow a safe retry', () => {
  const storage = new MemoryStorage();
  const game = fresh();
  storage.setItem('game', JSON.stringify(game));
  const store = createStoredValue('game', storage.getItem('game'), isGame, () => storage);
  const changed = { ...game, currentPhase: 'D1' as const };
  storage.failWrite = true;
  assert.throws(() => store.write(changed), /Full/);
  assert.equal(store.isCurrent(), true);
  assert.deepEqual(JSON.parse(storage.getItem('game')!), game);
  storage.failWrite = false;
  store.write(changed);
  storage.failRemove = true;
  assert.throws(() => store.remove(), /Blocked/);
  assert.equal(store.isCurrent(), true);
  storage.failRemove = false;
  store.remove();
  assert.equal(storage.getItem('game'), null);
});

test('invalid game state is rejected before writing to storage', () => {
  const storage = new MemoryStorage();
  const store = createStoredValue('game', null, isGame, () => storage);
  assert.throws(() => store.write({ ...fresh(), currentPhase: 'D999999999' } as Game), /형식/);
  assert.equal(storage.getItem('game'), null);
});

test('restoration validates unique IDs, safe images, bounded phases, and timeline order', () => {
  const game = fresh();
  assert.equal(isGame(game), true);
  assert.equal(isGame({ ...game, currentPhase: 'N9007199254740991' }), false);
  assert.equal(isScript({ ...game.script, characterIds: ['empath', 'empath'] }), false);
  assert.equal(isLibrary([game.script, game.script]), false);
  const script = parseScript('[{"id":"custom","name":"Custom","team":"townsfolk","ability":"Test","image":"https://example.com/icon.png"}]', 'custom.json');
  assert.equal(isScript(script), true);
  assert.equal(isScript({ ...script, homebrew: [...script.homebrew, script.homebrew[0]] }), false);
  assert.equal(isScript({ ...script, homebrew: [{ ...script.homebrew[0], image: 'javascript:alert(1)' }] }), false);
  assert.equal(isScript({ ...script, homebrew: [{ ...script.homebrew[0], alignmentImages: { evil: 'data:image/svg+xml,test' } }] }), false);

  const [a, b] = game.players;
  const event = { id: 'death', phaseId: 'D1', sequence: 1, playerId: a.id, kind: 'death', result: 'dead', reason: '' };
  const vote = { id: 'vote', phaseId: 'D1', sequence: 1, nominatorId: b.id, nomineeId: a.id, voterIds: [b.id] };
  const timeline = { ...game, currentPhase: 'D1', events: [event], nominations: [vote] };
  assert.equal(isGame(timeline), false);
  assert.equal(isGame({ ...timeline, nominations: [{ ...vote, sequence: 2 }] }), true);
  assert.equal(isGame({ ...timeline, nominations: [{ ...vote, sequence: 2, phaseId: 'N1' }] }), false);
  assert.equal(isGame({ ...timeline, nominations: [{ ...vote, sequence: 2, ghostOverrides: { [a.id]: true } }] }), false);
});

test('script imports fail safely for null, arrays, oversized entries, and malformed URLs', () => {
  for (const raw of ['[null]', '[1]', '[[]]', '[{}]']) {
    assert.throws(() => parseScript(raw, 'bad.json'), /캐릭터 ID/);
  }
  assert.throws(() => parseScript(JSON.stringify(Array(1025).fill('empath')), 'bad.json'), /배열/);
  for (const image of ['http://', 'https://user:password@example.com/icon.png', 'javascript:alert(1)', 'data:image/png,test']) {
    assert.throws(() => parseScript(JSON.stringify([{ id: 'empath', image }]), 'bad.json'), /HTTP/);
  }
});

test('player event toggles keep old records valid after cancelling and reapplying execution', () => {
  const game = fresh();
  game.currentPhase = 'D2';
  const player = game.players[0];
  const killed = togglePlayerEvent(game, player.id, 'D1', 'execution');
  const revived = togglePlayerEvent(killed, player.id, 'N2', 'life');
  assert.equal(isGame(revived), true);
  const undone = togglePlayerEvent(revived, player.id, 'D1', 'execution');
  assert.equal(undone.events.length, 0);
  const reapplied = togglePlayerEvent(undone, player.id, 'D1', 'execution');
  assert.equal(isGame(reapplied), true);
  assert.equal(reapplied.events.length, 1);
});
