import { nextSequence, putRecord, type Game, type Nomination, type PhaseId, type Whisper } from './model.ts';

export type RecordKind = 'votes' | 'whispers';
export type VoteDraft = Nomination & { step: 1 | 2 };
export type Selection =
  | { kind: 'source'; source: 'votes'; record?: Nomination }
  | { kind: 'source'; source: 'whispers'; record?: Whisper }
  | { kind: 'vote'; draft: VoteDraft }
  | { kind: 'whisper'; draft: Whisper }
  | null;

export type SelectionAction =
  | { type: 'begin'; source: RecordKind }
  | { type: 'editVote'; record: Nomination }
  | { type: 'editWhisper'; record: Whisper }
  | { type: 'cancel' }
  | { type: 'selectPlayer'; playerId: string; newId: string; game: Game; phase: PhaseId };

export function transitionSelection(selection: Selection, action: SelectionAction): Selection {
  switch (action.type) {
    case 'begin': return action.source === 'votes'
      ? { kind: 'source', source: 'votes' } : { kind: 'source', source: 'whispers' };
    case 'editVote': return { kind: 'source', source: 'votes', record: action.record };
    case 'editWhisper': return { kind: 'source', source: 'whispers', record: action.record };
    case 'cancel': return null;
  }
  if (!selection) return null;
  const { playerId, newId, game, phase } = action;
  const vote = selection.kind === 'vote' ? selection.draft : null;
  const whisper = selection.kind === 'whisper' ? selection.draft : null;
  if (selection.kind === 'source' && selection.source === 'votes' && phase.startsWith('D')) {
    return { kind: 'vote', draft: {
      id: newId, phaseId: phase, sequence: nextSequence([...game.events, ...game.nominations], phase),
      nomineeId: '', voterIds: [], ...selection.record, nominatorId: playerId, step: 1,
    } };
  } else if (selection.kind === 'source' && selection.source === 'whispers' && phase.startsWith('D')) {
    return { kind: 'whisper', draft: {
      id: newId, phaseId: phase as Whisper['phaseId'], sequence: nextSequence(game.whispers ?? [], phase),
      ...selection.record, playerId, partnerIds: (selection.record?.partnerIds ?? []).filter(id => id !== playerId),
    } };
  } else if (whisper && playerId !== whisper.playerId) {
    return { kind: 'whisper', draft: { ...whisper, partnerIds: toggle(whisper.partnerIds, playerId) } };
  } else if (vote) {
    return { kind: 'vote', draft: vote.step === 1
      ? { ...vote, step: 2, nomineeId: playerId }
      : { ...vote, voterIds: toggle(vote.voterIds, playerId) } };
  }
  return selection;
}

export function completeSelection(game: Game, selection: Selection): Game | null {
  if (selection?.kind === 'vote') {
    const vote = selection.draft;
    if (vote.step !== 2) return null;
    const { step: _step, ghostOverrides, ...record } = vote;
    const overrides = Object.fromEntries(Object.entries(ghostOverrides ?? {})
      .filter(([playerId]) => record.voterIds.includes(playerId)));
    return { ...game, nominations: putRecord(game.nominations, {
      ...record, ghostOverrides: Object.keys(overrides).length ? overrides : undefined,
    }) };
  }
  if (selection?.kind === 'whisper' && selection.draft.partnerIds.length) {
    return { ...game, whispers: putRecord(game.whispers ?? [], selection.draft) };
  }
  return null;
}

function toggle(ids: string[], id: string) {
  return ids.includes(id) ? ids.filter(current => current !== id) : [...ids, id];
}
