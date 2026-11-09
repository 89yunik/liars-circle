import test from 'node:test';
import assert from 'node:assert/strict';
import { localizeCharacter, localizeError, scriptName, teamLabels, translate } from '../src/locale.ts';
import { characters, officialScripts, parseScript } from '../src/scripts.ts';
import originalRoles from '../src/roles.json' with { type: 'json' };
import korean from '../src/roles.ko.json' with { type: 'json' };
import type { Character } from '../src/model.ts';

test('Korean official names and abilities cover the complete local catalog without changing source data', () => {
  const translations: Record<string, { name: string; ability: string }> = korean.roles;
  for (const original of originalRoles) {
    const role = original as Character;
    const localized = localizeCharacter(role, 'ko');
    assert.equal(localized.name, translations[role.id].name);
    assert.equal(localized.ability, translations[role.id].ability);
    assert.equal(localized.id, original.id);
    assert.equal(localized.team, original.team);
    assert.equal(localizeCharacter(role, 'en'), role);
    assert.equal(role.name, original.name);
  }
});

test('custom names and abilities are preserved even if they reuse an official character ID', () => {
  const [role] = characters(officialScripts[0]);
  const custom = { ...role, name: 'My custom character', ability: 'My own ability' };
  assert.equal(localizeCharacter(custom, 'ko'), custom);
  const unknown = { ...custom, id: 'homebrew-test' };
  assert.equal(localizeCharacter(unknown, 'ko'), unknown);
  const customScript = parseScript('["empath"]', 'My script.json');
  assert.equal(scriptName(customScript, 'ko'), 'My script');
  assert.equal(scriptName(officialScripts[0], 'ko'), korean.editions.tb);
  assert.equal(scriptName(officialScripts[0], 'en'), 'Trouble Brewing');
});

test('UI templates and recorded import errors switch languages and consistently name Travellers', () => {
  assert.equal(translate('ko', teamLabels.traveller), '여행자');
  assert.equal(translate('en', teamLabels.traveller), 'Traveller');
  assert.equal(translate('en', '좌석 {seat} 여행자', { seat: 2 }), 'Seat 2 Traveller');
  assert.equal(translate('ko', '좌석 {seat} 여행자', { seat: 2 }), '좌석 2 여행자');
  assert.equal(localizeError('en', '알 수 없는 캐릭터 ID: custom'), 'Unknown character ID: custom');
  assert.equal(localizeError('en', '지원하지 않는 데이터 버전 (2)'), 'Unsupported data version (2)');
  assert.equal(localizeError('en', 'custom의 이미지에는 HTTP(S) URL을 사용하세요.'), 'Use an HTTP(S) URL for the image of custom.');
  assert.equal(localizeError('ko', '지원하지 않는 데이터 버전 (2)'), '지원하지 않는 데이터 버전 (2)');
});
