import { characters } from './scripts.ts';
import { MAX_PLAYERS, MIN_PLAYERS, phaseIndex, teams, type Game, type Script } from './model.ts';

export const gameKey = 'liars-circle.game';
export const libraryKey = 'liars-circle.scripts';

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function script(value: unknown): value is Script {
  if (!object(value) || typeof value.id !== 'string' || typeof value.name !== 'string' ||
      !Array.isArray(value.characterIds) || !value.characterIds.length ||
      !value.characterIds.every(id => typeof id === 'string') || !Array.isArray(value.homebrew)) return false;
  return value.homebrew.every(role => object(role) && typeof role.id === 'string' &&
    typeof role.name === 'string' && typeof role.ability === 'string' &&
    teams.some(team => team === role.team) && (role.image === undefined || typeof role.image === 'string')) &&
    characters(value as unknown as Script).length === value.characterIds.length;
}

function phase(value: unknown): value is Game['currentPhase'] {
  return typeof value === 'string' && /^[ND][1-9]\d*$/.test(value) &&
    Number.isSafeInteger(phaseIndex(value as Game['currentPhase']));
}

function game(value: unknown): value is Game {
  if (!object(value) || value.schemaVersion !== 1 || value.status !== 'active' ||
      typeof value.id !== 'string' || !phase(value.currentPhase) || !script(value.script)) return false;
  const maxPhase = phaseIndex(value.currentPhase);
  const ids = new Set<string>();
  const roleIds = new Set(value.script.characterIds);
  if (!Array.isArray(value.players) || value.players.length < MIN_PLAYERS || value.players.length > MAX_PLAYERS ||
    !value.players.every((p, seat) => {
      if (!object(p) || typeof p.id !== 'string' || ids.has(p.id) || p.seat !== seat ||
          typeof p.name !== 'string' || typeof p.traveller !== 'boolean' ||
          (p.alignment !== undefined && p.alignment !== 'good' && p.alignment !== 'evil') ||
          (p.characterId !== undefined && (typeof p.characterId !== 'string' || !roleIds.has(p.characterId)))) return false;
      ids.add(p.id);
      return true;
    })) return false;
  const player = (id: unknown) => typeof id === 'string' && ids.has(id);
  const records = (items: unknown, valid: (item: Record<string, unknown>) => boolean) => {
    const recordIds = new Set<string>();
    return Array.isArray(items) && items.every(item => {
      if (!object(item) || typeof item.id !== 'string' || recordIds.has(item.id) ||
          !phase(item.phaseId) || phaseIndex(item.phaseId) > maxPhase || !valid(item)) return false;
      recordIds.add(item.id);
      return true;
    });
  };
  const sequence = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
  const targets = new Set<string>();
  return records(value.memos, memo => {
    const key = JSON.stringify([memo.phaseId, memo.target, memo.playerId]);
    if (targets.has(key) || typeof memo.text !== 'string' ||
      !(memo.target === 'general' ? memo.playerId === undefined : memo.target === 'player' && player(memo.playerId))) return false;
    targets.add(key);
    return true;
  }) && (value.whispers === undefined || records(value.whispers, whisper =>
    typeof whisper.phaseId === 'string' && whisper.phaseId.startsWith('D') &&
    sequence(whisper.sequence) && player(whisper.playerId) &&
    Array.isArray(whisper.partnerIds) && whisper.partnerIds.length > 0 &&
    whisper.partnerIds.every(id => player(id) && id !== whisper.playerId) &&
    new Set(whisper.partnerIds).size === whisper.partnerIds.length
  )) && records(value.events, event => player(event.playerId) && sequence(event.sequence) &&
    typeof event.reason === 'string' && (
      (event.kind === 'execution' && (event.result === 'dead' || event.result === 'survived')) ||
      (event.kind === 'death' && event.result === 'dead') || (event.kind === 'revival' && event.result === 'alive')
    )) && records(value.nominations, vote => player(vote.nominatorId) && player(vote.nomineeId) &&
    sequence(vote.sequence) && Array.isArray(vote.voterIds) && vote.voterIds.every(player) &&
    new Set(vote.voterIds).size === vote.voterIds.length &&
    (vote.countedVotes === undefined || (typeof vote.countedVotes === 'number' &&
      Number.isSafeInteger(vote.countedVotes) && vote.countedVotes >= 0)) &&
    (vote.ghostOverrides === undefined || (object(vote.ghostOverrides) &&
      Object.entries(vote.ghostOverrides).every(([id, used]) => player(id) && typeof used === 'boolean'))));
}

function read<T>(key: string, fallback: T, validate: (value: unknown) => value is T) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return { value: fallback, error: '' };
    const value: unknown = JSON.parse(raw);
    if (object(value) && 'schemaVersion' in value && value.schemaVersion !== 1) {
      throw new Error(`지원하지 않는 데이터 버전 (${String(value.schemaVersion)})`);
    }
    if (!validate(value)) throw new Error('저장 데이터의 형식이 올바르지 않습니다.');
    return { value, error: '' };
  } catch (error) {
    return { value: fallback, error: error instanceof Error ? error.message : '알 수 없는 오류' };
  }
}
export const restoreGame = () => read<Game | null>(gameKey, null, game);
export const restoreLibrary = () => read<Script[]>(libraryKey, [], (value): value is Script[] =>
  Array.isArray(value) && value.every(script));
