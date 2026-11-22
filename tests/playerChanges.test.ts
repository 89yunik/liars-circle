import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, renamePlayer, setTraveller, setCharacter, togglePlayerAlignment, playerAlignment } from '../src/model.ts';
import { officialScripts, characters } from '../src/scripts.ts';

const fresh = () => newGame(officialScripts[0], Array.from({ length: 5 }, () => ({ name: '', traveller: false })));

test('renaming normalizes names without changing player settings or other game data', () => {
  const game = fresh();
  const player = game.players[0];
  const configured = setCharacter(togglePlayerAlignment(game, player.id), player.id, 'imp');
  const renamed = renamePlayer(configured, player.id, '  민수  ');
  assert.deepEqual(renamed.players[0], { ...configured.players[0], name: '민수' });
  assert.equal(configured.players[0].name, 'P1');
  assert.equal(renamed.players[1], configured.players[1]);
  assert.equal(renamed.events, configured.events);
  assert.equal(renamePlayer(renamed, player.id, '  ').players[0].name, 'P1');
});

test('changing traveller status clears character and alignment in both directions', () => {
  for (const traveller of [false, true]) {
    const game = fresh();
    const playerId = game.players[0].id;
    const configured = setCharacter(togglePlayerAlignment(setTraveller(game, playerId, traveller), playerId), playerId, 'imp');
    assert.deepEqual(setTraveller(configured, playerId, traveller).players[0], configured.players[0]);
    const changed = setTraveller(configured, playerId, !traveller);
    assert.deepEqual(changed.players[0], { ...configured.players[0], traveller: !traveller, characterId: undefined, alignment: undefined });
    assert.equal(configured.players[0].characterId, 'imp');
    assert.equal(changed.players[1], configured.players[1]);
  }
});

test('clearing a character resets manual alignment while assigning one preserves it', () => {
  const game = fresh();
  const playerId = game.players[0].id;
  const configured = setCharacter(togglePlayerAlignment(game, playerId), playerId, 'imp');
  assert.equal(configured.players[0].alignment, 'good');
  const cleared = setCharacter(configured, playerId);
  assert.equal(cleared.players[0].characterId, undefined);
  assert.equal(cleared.players[0].alignment, undefined);
  assert.equal(playerAlignment(cleared.players[0]), undefined);
});

test('alignment toggles from character defaults, manual overrides, and unassigned tokens', () => {
  for (const characterId of ['imp', 'empath', undefined]) {
    const game = fresh();
    const playerId = game.players[0].id;
    const role = characters(game.script).find(role => role.id === characterId);
    const configured = setCharacter(game, playerId, characterId);
    const expected = playerAlignment(configured.players[0], role) === 'good' ? 'evil' : 'good';
    const changed = togglePlayerAlignment(configured, playerId, role);
    assert.equal(changed.players[0].alignment, expected);
    assert.equal(togglePlayerAlignment(changed, playerId, role).players[0].alignment, expected === 'good' ? 'evil' : 'good');
    assert.equal(changed.players[1], configured.players[1]);
  }
});

test('changes to an unknown player leave the game untouched', () => {
  const game = fresh();
  assert.equal(renamePlayer(game, 'missing', 'name'), game);
  assert.equal(setTraveller(game, 'missing', true), game);
  assert.equal(setCharacter(game, 'missing'), game);
  assert.equal(togglePlayerAlignment(game, 'missing'), game);
});
