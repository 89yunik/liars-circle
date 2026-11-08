import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { aliveAt, evenlySpacedSeats, newGame, nextSequence, phaseAt, phaseIndex, putRecord, removeLifeEvent, removePlayer, seatPosition, usedGhostVote, writeMemo,
  type GameEvent, type Nomination } from '../src/model.ts';
import { characters, officialScripts, parseScript } from '../src/scripts.ts';
import { gameKey, libraryKey, restoreGame, restoreLibrary } from '../src/storage.ts';

const fresh = () => newGame(officialScripts[0], Array.from({ length: 5 }, () => ({ name: '', traveller: false })));

test('5–20 seats have stable clockwise coordinates and enough separation for touch', () => {
  for (let count = 5; count <= 20; count++) {
    const radius = Math.max(111, Math.ceil(76 / (2 * Math.sin(Math.PI / count))));
    const positions = Array.from({ length: count }, (_, i) => seatPosition(i, count, radius));
    for (const [i, a] of positions.entries()) {
      const b = positions[(i + 1) % count];
      assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= 75.99);
      assert.ok(Math.abs(Math.hypot(a.x, a.y) - radius) < 0.0001);
    }
  }
});

test('tall ellipses distribute seats more evenly without changing clockwise order', () => {
  const count = 10;
  const rx = 110;
  const ry = 240;
  const spread = (positions: ReturnType<typeof evenlySpacedSeats>) => {
    const gaps = positions.map((point, i) => {
      const next = positions[(i + 1) % count];
      return Math.hypot((point.x - next.x) * rx, (point.y - next.y) * ry);
    });
    return Math.max(...gaps) / Math.min(...gaps);
  };
  const positions = evenlySpacedSeats(count, rx, ry);
  assert.equal(positions[0].y, -1);
  assert.ok(positions[1].x > 0);
  assert.ok(spread(positions) < 1.1);
  assert.ok(spread(Array.from({ length: count }, (_, i) => seatPosition(i, count, 1))) > 1.5);
});

test('removing a seat cleans up its records and preserves other participants', () => {
  const game = newGame(officialScripts[0], Array.from({ length: 6 }, () => ({ name: '', traveller: false })));
  const [removed, a, b] = game.players;
  const vote: Nomination = { id: 'vote', phaseId: 'D1', sequence: 1, nominatorId: a.id, nomineeId: b.id,
    voterIds: [removed.id, b.id], ghostOverrides: { [removed.id]: true, [b.id]: false } };
  game.nominations = [vote, { ...vote, id: 'removed-vote', nomineeId: removed.id }];
  game.whispers = [
    { id: 'keep', phaseId: 'D1', sequence: 1, playerId: a.id, partnerIds: [removed.id, b.id] },
    { id: 'empty', phaseId: 'D1', sequence: 2, playerId: a.id, partnerIds: [removed.id] },
    { id: 'owner', phaseId: 'D1', sequence: 3, playerId: removed.id, partnerIds: [a.id] },
  ];
  game.events = [{ id: 'death', phaseId: 'N1', playerId: removed.id, sequence: 1, kind: 'death', result: 'dead', reason: '' }];
  game.memos = [
    { id: 'player', target: 'player', playerId: removed.id, phaseId: 'N1', text: 'removed' },
    { id: 'general', target: 'general', phaseId: 'N1', text: 'kept' },
  ];

  const next = removePlayer(game, removed.id);
  assert.deepEqual(next.players.map(player => [player.id, player.seat]),
    game.players.slice(1).map((player, seat) => [player.id, seat]));
  assert.deepEqual(next.nominations, [{ ...vote, voterIds: [b.id], ghostOverrides: { [b.id]: false } }]);
  assert.deepEqual(next.whispers, [{ ...game.whispers[0], partnerIds: [b.id] }]);
  assert.deepEqual(next.events, []);
  assert.deepEqual(next.memos, [game.memos[1]]);
  assert.equal(removePlayer(next, a.id), next);
});

test('memo upsert and deletion preserve target and phase isolation', () => {
  const game = fresh();
  const player = { target: 'player', playerId: game.players[0].id } as const;
  const general = { target: 'general' } as const;
  let next = writeMemo(game, 'N1', player, 'claim');
  const memoId = next.memos[0].id;
  next = writeMemo(next, 'N1', general, 'announcement');
  next = writeMemo(next, 'D1', player, 'new claim');
  next = writeMemo(next, 'N1', player, 'revised claim');
  assert.equal(next.memos.length, 3);
  assert.equal(next.memos.find(memo => memo.id === memoId)?.text, 'revised claim');
  assert.equal('playerId' in next.memos.find(memo => memo.target === 'general')!, false);
  next = writeMemo(next, 'N1', player, '');
  assert.equal(next.memos.length, 2);
  assert.equal(game.memos.length, 0);
  assert.equal(phaseAt(phaseIndex('D42') + 1), 'N43');
});

test('same-phase death, ghost vote, revival, execution edit and deletion recompute independently', () => {
  const game = fresh();
  const [a, b] = game.players;
  const death: GameEvent = { id: 'death', phaseId: 'D1', sequence: 1, playerId: a.id, kind: 'death', result: 'dead', reason: '' };
  const vote: Nomination = { id: 'vote', phaseId: 'D1', sequence: 2, nominatorId: a.id, nomineeId: b.id, voterIds: [a.id] };
  const revival: GameEvent = { ...death, id: 'revival', sequence: 3, kind: 'revival', result: 'alive' };
  game.events = [revival, death];
  assert.equal(nextSequence([...game.events, vote], 'D1'), 4);
  assert.equal(aliveAt(game, a.id, 'N1'), true);
  assert.equal(aliveAt(game, a.id, 'D1'), true);
  assert.equal(aliveAt(game, b.id, 'D1'), true);
  assert.equal(usedGhostVote(game, vote, a.id), true);
  assert.equal(usedGhostVote(game, { ...vote, ghostOverrides: { [a.id]: false } }, a.id), false);
  game.events = putRecord(game.events, { ...death, kind: 'execution', result: 'survived' });
  assert.equal(usedGhostVote(game, vote, a.id), false);
  game.events = [death];
  assert.equal(aliveAt(game, a.id, 'N2'), false);
  game.events = [];
  assert.equal(aliveAt(game, a.id, 'N2'), true);
});

test('cancelling an earlier death removes redundant revivals before reapplying execution', () => {
  const game = fresh();
  const [a, b] = game.players;
  const execution: GameEvent = { id: 'execution', phaseId: 'D1', sequence: 1, playerId: a.id,
    kind: 'execution', result: 'dead', reason: '' };
  const revival: GameEvent = { ...execution, id: 'revival', phaseId: 'N2', kind: 'revival', result: 'alive' };
  const otherDeath: GameEvent = { ...execution, id: 'other-death', playerId: b.id };
  game.events = [revival, otherDeath, execution];
  assert.equal(aliveAt(game, a.id, 'D2'), true);
  const cancelled = removeLifeEvent(game, execution.id);
  assert.deepEqual(cancelled.events, [otherDeath]);
  assert.equal(aliveAt(cancelled, a.id, 'D1'), true);
  const reapplied = { ...cancelled, events: [...cancelled.events, { ...execution, id: 'reapplied' }] };
  assert.equal(aliveAt(reapplied, a.id, 'N2'), false);
  assert.equal(aliveAt(reapplied, a.id, 'D2'), false);
  assert.equal(removeLifeEvent(game, 'missing'), game);

  const laterDeath: GameEvent = { ...execution, id: 'later-death', phaseId: 'N2' };
  const laterRevival: GameEvent = { ...revival, id: 'later-revival', phaseId: 'D2' };
  const separateRevival = removeLifeEvent({
    ...game, events: [laterRevival, otherDeath, laterDeath, execution],
  }, execution.id);
  assert.ok(separateRevival.events.some(event => event.id === laterRevival.id));
  assert.equal(aliveAt(separateRevival, a.id, 'N2'), false);
  assert.equal(aliveAt(separateRevival, a.id, 'D2'), true);

  const undoneRevival = removeLifeEvent(game, revival.id);
  assert.equal(aliveAt(undoneRevival, a.id, 'D2'), false);
  const survived: GameEvent = { ...execution, id: 'survived', phaseId: 'D2', result: 'survived' };
  const withSurvived = { ...game, events: [execution, survived] };
  assert.equal(aliveAt(withSurvived, a.id, 'D2'), false);
});

test('three editions and their Traveller images are available locally', () => {
  assert.deepEqual(officialScripts.map(sheet => characters(sheet).length), [27, 30, 30]);
  for (const sheet of officialScripts) {
    assert.equal(characters(sheet).filter(role => role.team === 'traveller').length, 5);
    for (const role of characters(sheet)) assert.ok(existsSync('public/' + role.image!.slice(2)));
  }
});

test('Script Tool formats and invalid imports', () => {
  const script = parseScript(JSON.stringify([
    { id: '_meta', name: 'Test Script', firstNight: ['dusk', 'empath'] },
    'empath', { id: 'imp' }, 'empath', 'bootlegger',
    { id: 'helper', name: 'Helper', ability: 'A test.', team: 'traveller', image: ['https://example.com/image.png'] },
  ]), 'example.json');
  assert.equal(script.name, 'Test Script');
  assert.deepEqual(characters(script).map(role => role.id), ['empath', 'imp', 'bootlegger', 'helper']);
  assert.equal(characters(script).at(-1)?.image, 'https://example.com/image.png');
  assert.throws(() => parseScript('bad', 'invalid.json'), /JSON/);
  assert.throws(() => parseScript('["unknown"]', 'invalid.json'), /unknown/);
  assert.throws(() => parseScript('[{"id":"bad","name":"Bad"}]', 'invalid.json'), /bad/);
});

test('stored game and library restore independently and malformed input stays in storage', () => {
  const script = parseScript('["empath"]', 'custom.json');
  const game = { ...fresh(), script };
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
      removeItem: (key: string) => data.delete(key),
    },
  });
  const { whispers: _whispers, ...legacyGame } = game;
  localStorage.setItem(gameKey, JSON.stringify(legacyGame));
  assert.deepEqual(restoreGame().value, legacyGame);

  const [player, partner] = game.players;
  const whisper = { id: 'whisper', phaseId: 'D1', sequence: 1, playerId: player.id, partnerIds: [partner.id] };
  const withWhisper = { ...game, currentPhase: 'D1', whispers: [whisper] };
  localStorage.setItem(gameKey, JSON.stringify(withWhisper));
  assert.deepEqual(restoreGame().value, withWhisper);
  for (const invalid of [
    { ...whisper, phaseId: 'N1' },
    { ...whisper, phaseId: 'D2' },
    { ...whisper, partnerIds: [] },
    { ...whisper, partnerIds: [player.id] },
    { ...whisper, partnerIds: [partner.id, partner.id] },
  ]) {
    localStorage.setItem(gameKey, JSON.stringify({ ...withWhisper, whispers: [invalid] }));
    assert.ok(restoreGame().error);
  }

  localStorage.setItem(gameKey, JSON.stringify(game));
  localStorage.setItem(libraryKey, JSON.stringify([script]));
  assert.deepEqual(restoreGame().value, game);
  assert.deepEqual(restoreLibrary().value, [script]);
  localStorage.removeItem(libraryKey);
  assert.deepEqual(restoreGame().value?.script, script);
  localStorage.setItem(libraryKey, JSON.stringify([script]));
  localStorage.removeItem(gameKey);
  assert.equal(restoreGame().value, null);
  assert.deepEqual(restoreLibrary().value, [script]);
  localStorage.setItem(gameKey, '{"schemaVersion":0}');
  assert.match(restoreGame().error, /버전/);
  assert.equal(localStorage.getItem(gameKey), '{"schemaVersion":0}');
  localStorage.setItem(gameKey, '{');
  assert.ok(restoreGame().error);
  assert.equal(localStorage.getItem(gameKey), '{');
});
