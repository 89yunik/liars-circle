import test from 'node:test';
import assert from 'node:assert/strict';
import { transitionSelection, completeSelection, type Selection } from '../src/tableSelection.ts';
import { newGame, type Game, type Nomination, type Whisper } from '../src/model.ts';
import { officialScripts } from '../src/scripts.ts';

const fresh = (): Game => ({ ...newGame(officialScripts[0], Array.from({ length: 5 }, () => ({ name: '', traveller: false }))), currentPhase: 'D1' });
function tap(state: Selection, game: Game, playerId: string) {
  return transitionSelection(state, { type: 'selectPlayer', game, phase: 'D1', playerId, newId: 'new-record' });
}

test('new nomination progresses through source, nominee, voters and completion', () => {
  const game = fresh();
  const [a, b, c] = game.players.map(player => player.id);
  let state = transitionSelection(null, { type: 'begin', source: 'votes' });
  assert.equal(completeSelection(game, state), null);
  state = tap(state, game, a);
  assert.equal(completeSelection(game, state), null);
  state = tap(state, game, b);
  state = tap(state, game, c);
  const next = completeSelection(game, state)!;
  assert.deepEqual(next.nominations[0], { id: 'new-record', phaseId: 'D1', sequence: 1, nominatorId: a, nomineeId: b, voterIds: [c], ghostOverrides: undefined });
  assert.deepEqual(game.nominations, []);
});

test('editing nomination retains identity and sequence, replaces record, and filters ghost overrides', () => {
  const game = fresh();
  const [a, b, c] = game.players.map(player => player.id);
  const record: Nomination = { id: 'original', phaseId: 'D1', sequence: 7, nominatorId: a, nomineeId: b, voterIds: [a, c], ghostOverrides: { [a]: true, [c]: false } };
  game.nominations = [record];
  let state = transitionSelection(null, { type: 'editVote', record });
  assert.deepEqual(state, { kind: 'source', source: 'votes', record });
  state = tap(state, game, b);
  state = tap(state, game, a);
  state = tap(state, game, c);
  const next = completeSelection(game, state)!;
  assert.equal(next.nominations.length, 1);
  assert.deepEqual(next.nominations[0], { ...record, nominatorId: b, nomineeId: a, voterIds: [a], ghostOverrides: { [a]: true } });
  assert.deepEqual(record.voterIds, [a, c]);
});

test('new whisper requires a partner and source taps cannot add self', () => {
  const game = fresh();
  const [a, b] = game.players.map(player => player.id);
  let state = transitionSelection(null, { type: 'begin', source: 'whispers' });
  state = tap(state, game, a);
  state = tap(state, game, a);
  assert.equal(completeSelection(game, state), null);
  state = tap(state, game, b);
  assert.deepEqual(completeSelection(game, state)!.whispers[0].partnerIds, [b]);
});

test('editing whisper removes the new source from partners and cancellation preserves original', () => {
  const game = fresh();
  const [a, b, c] = game.players.map(player => player.id);
  const record: Whisper = { id: 'original', phaseId: 'D1', sequence: 4, playerId: a, partnerIds: [b, c] };
  game.whispers = [record];
  let state = transitionSelection(null, { type: 'editWhisper', record });
  assert.deepEqual(state, { kind: 'source', source: 'whispers', record });
  state = tap(state, game, b);
  const next = completeSelection(game, state)!;
  assert.deepEqual(next.whispers, [{ ...record, playerId: b, partnerIds: [c] }]);
  assert.equal(transitionSelection(state, { type: 'cancel' }), null);
  assert.deepEqual(game.whispers, [record]);
  assert.deepEqual(record.partnerIds, [b, c]);
});
