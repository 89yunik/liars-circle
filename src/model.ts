export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 20;

export type PhaseId = `N${number}` | `D${number}`;
export const teams = ['townsfolk', 'outsider', 'minion', 'demon', 'traveller', 'fabled', 'loric'] as const;
export type Team = typeof teams[number];

export interface Character {
  id: string;
  name: string;
  team: Team;
  ability: string;
  image?: string;
}
export interface Script {
  id: string;
  name: string;
  characterIds: string[];
  homebrew: Character[];
}
export interface Player {
  id: string;
  name: string;
  seat: number;
  traveller: boolean;
  characterId?: string;
}
export type MemoTarget = { target: 'general' } | { target: 'player'; playerId: string };
export type Memo = MemoTarget & { id: string; phaseId: PhaseId; text: string };
export interface Nomination {
  id: string;
  phaseId: PhaseId;
  sequence: number;
  nominatorId: string;
  nomineeId: string;
  voterIds: string[];
  countedVotes?: number;
  ghostOverrides?: Record<string, boolean>;
}
export interface Whisper {
  id: string;
  phaseId: `D${number}`;
  sequence: number;
  playerId: string;
  partnerIds: string[];
}
export type EventResult =
  | { kind: 'execution'; result: 'dead' | 'survived' }
  | { kind: 'death'; result: 'dead' }
  | { kind: 'revival'; result: 'alive' };
export type GameEvent = EventResult & {
  id: string;
  phaseId: PhaseId;
  playerId: string;
  sequence: number;
  reason: string;
};
export interface Game {
  schemaVersion: 1;
  id: string;
  status: 'active';
  currentPhase: PhaseId;
  script: Script;
  players: Player[];
  memos: Memo[];
  nominations: Nomination[];
  whispers?: Whisper[];
  events: GameEvent[];
}

export const id = () => crypto.randomUUID();
export const phaseIndex = (phase: PhaseId) => (Number(phase.slice(1)) - 1) * 2 + Number(phase[0] === 'D');
export const phaseAt = (index: number): PhaseId => `${index % 2 === 0 ? 'N' : 'D'}${Math.floor(index / 2) + 1}`;
export const byTime = (a: { phaseId: PhaseId; sequence: number }, b: typeof a) =>
  phaseIndex(a.phaseId) - phaseIndex(b.phaseId) || a.sequence - b.sequence;

export function newGame(script: Script, seats: Pick<Player, 'name' | 'traveller'>[]): Game {
  return {
    id: id(), schemaVersion: 1, status: 'active', currentPhase: 'N1', script,
    players: seats.map((seat, index) => ({
      ...seat, name: seat.name.trim() || `P${index + 1}`, seat: index, id: id(),
    })),
    memos: [], nominations: [], whispers: [], events: [],
  };
}

export function reorderPlayer(game: Game, playerId: string, seat: number): Game {
  const previousSeat = game.players.findIndex(player => player.id === playerId);
  if (previousSeat < 0 || !Number.isInteger(seat) || seat < 0 || seat >= game.players.length || previousSeat === seat) return game;
  const players = [...game.players];
  const [player] = players.splice(previousSeat, 1);
  players.splice(seat, 0, player);
  return { ...game, players: players.map((player, index) => ({ ...player, seat: index })) };
}

export function removePlayer(game: Game, playerId: string): Game {
  if (game.players.length <= MIN_PLAYERS) return game;
  const keep = (id: string) => id !== playerId;
  const players = game.players.filter(player => keep(player.id));
  if (players.length === game.players.length) return game;
  return {
    ...game,
    players: players.map((player, seat) => ({ ...player, seat })),
    memos: game.memos.filter(memo => memo.target === 'general' || keep(memo.playerId)),
    events: game.events.filter(event => keep(event.playerId)),
    nominations: game.nominations
      .filter(record => keep(record.nominatorId) && keep(record.nomineeId))
      .map(record => ({
        ...record,
        voterIds: record.voterIds.filter(keep),
        ghostOverrides: record.ghostOverrides && Object.fromEntries(
          Object.entries(record.ghostOverrides).filter(([id]) => keep(id)),
        ),
      })),
    whispers: game.whispers
      ?.filter(record => keep(record.playerId))
      .map(record => ({ ...record, partnerIds: record.partnerIds.filter(keep) }))
      .filter(record => record.partnerIds.length > 0),
  };
}

export function sameTarget(a: MemoTarget, b: MemoTarget) {
  return a.target === 'general' ? b.target === 'general' : b.target === 'player' && a.playerId === b.playerId;
}

export function writeMemo(game: Game, phaseId: PhaseId, target: MemoTarget, text: string): Game {
  const existing = game.memos.find(memo => memo.phaseId === phaseId && sameTarget(memo, target));
  const remaining = game.memos.filter(memo => memo !== existing);
  return {
    ...game,
    memos: text ? [...remaining, { ...target, phaseId, text, id: existing?.id ?? id() }] : remaining,
  };
}

export function nextSequence(items: { phaseId: PhaseId; sequence: number }[], phaseId: PhaseId) {
  return 1 + Math.max(0, ...items.filter(item => item.phaseId === phaseId).map(item => item.sequence));
}

export function putRecord<T extends { id: string }>(items: T[], record: T) {
  return [...items.filter(item => item.id !== record.id), record];
}

export function aliveAt(game: Game, playerId: string, phase: PhaseId, sequence = Infinity) {
  const latest = game.events.filter(event =>
    event.playerId === playerId && event.result !== 'survived' &&
    byTime(event, { phaseId: phase, sequence }) < 0,
  ).sort(byTime).at(-1);
  return latest?.result !== 'dead';
}

export function removeLifeEvent(game: Game, eventId: string): Game {
  const removed = game.events.find(event => event.id === eventId);
  if (!removed) return game;
  let alive = true;
  const redundantRevivals = new Set<string>();
  for (const event of game.events.filter(event => event.id !== eventId && event.playerId === removed.playerId).sort(byTime)) {
    if (event.result === 'survived') continue;
    if (event.kind === 'revival' && alive && byTime(event, removed) > 0) redundantRevivals.add(event.id);
    alive = event.result !== 'dead';
  }
  return { ...game, events: game.events.filter(event => event.id !== eventId && !redundantRevivals.has(event.id)) };
}

export function usedGhostVote(game: Game, vote: Nomination, playerId: string) {
  return vote.voterIds.includes(playerId) &&
    (vote.ghostOverrides?.[playerId] ?? !aliveAt(game, playerId, vote.phaseId, vote.sequence));
}

export function seatPosition(seat: number, count: number, radius: number) {
  const angle = seat * 2 * Math.PI / count - Math.PI / 2;
  return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
}


export function evenlySpacedSeats(count: number, radiusX: number, radiusY: number) {
  // Sample the ellipse once, then place each seat at a fixed fraction of its perimeter.
  const segments = 360;
  const points = Array.from({ length: segments + 1 }, (_, index) => seatPosition(index, segments, 1));
  const lengths = [0];
  for (let i = 1; i <= segments; i++) {
    const dx = (points[i].x - points[i - 1].x) * radiusX;
    const dy = (points[i].y - points[i - 1].y) * radiusY;
    lengths.push(lengths[i - 1] + Math.hypot(dx, dy));
  }
  let segment = 1;
  return Array.from({ length: count }, (_, seat) => {
    const target = lengths[segments] * seat / count;
    while (lengths[segment] < target) segment++;
    const fraction = (target - lengths[segment - 1]) / (lengths[segment] - lengths[segment - 1]);
    return seatPosition(segment - 1 + fraction, segments, 1);
  });
}
