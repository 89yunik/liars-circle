import { useEffect, useState } from 'react';
import { id, nextSequence, putRecord, type Game, type Nomination, type PhaseId, type Whisper } from './model.ts';

export type RecordKind = 'votes' | 'whispers';
export type VoteDraft = Nomination & { step: 1 | 2 };
type Selection =
  | { kind: 'source'; source: 'votes'; record?: Nomination }
  | { kind: 'source'; source: 'whispers'; record?: Whisper }
  | { kind: 'vote'; draft: VoteDraft }
  | { kind: 'whisper'; draft: Whisper }
  | null;

export function useTableSelection(game: Game, phase: PhaseId, commit: (game: Game) => void) {
  const [selection, setSelection] = useState<Selection>(null);
  const vote = selection?.kind === 'vote' ? selection.draft : null;
  const whisper = selection?.kind === 'whisper' ? selection.draft : null;
  const selectSource = selection?.kind === 'source' ? selection.source : null;
  const sourcePlayerId = selection?.kind === 'source'
    ? selection.source === 'votes' ? selection.record?.nominatorId : selection.record?.playerId
    : undefined;
  const selecting = selection !== null;

  useEffect(() => {
    if (!selecting) return;
    function dismissOutside(event: MouseEvent) {
      if (event.target instanceof Element && event.target.closest('.token, .vote-complete, .token-label, .record-start')) return;
      event.preventDefault();
      event.stopPropagation();
      setSelection(null);
    }
    function dismissOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setSelection(null);
    }
    document.addEventListener('click', dismissOutside, true);
    document.addEventListener('keydown', dismissOnEscape);
    return () => {
      document.removeEventListener('click', dismissOutside, true);
      document.removeEventListener('keydown', dismissOnEscape);
    };
  }, [selecting]);

  function tap(playerId: string) {
    if (!selection) return false;
    if (selection.kind === 'source' && selection.source === 'votes' && phase.startsWith('D')) {
      setSelection({ kind: 'vote', draft: {
        id: id(), phaseId: phase, sequence: nextSequence([...game.events, ...game.nominations], phase),
        nomineeId: '', voterIds: [], ...selection.record, nominatorId: playerId, step: 1,
      } });
    } else if (selection.kind === 'source' && selection.source === 'whispers' && phase.startsWith('D')) {
      setSelection({ kind: 'whisper', draft: {
        id: id(), phaseId: phase as Whisper['phaseId'], sequence: nextSequence(game.whispers ?? [], phase),
        ...selection.record, playerId, partnerIds: (selection.record?.partnerIds ?? []).filter(id => id !== playerId),
      } });
    } else if (whisper && playerId !== whisper.playerId) {
      setSelection({ kind: 'whisper', draft: { ...whisper, partnerIds: toggle(whisper.partnerIds, playerId) } });
    } else if (vote) {
      setSelection({ kind: 'vote', draft: vote.step === 1
        ? { ...vote, step: 2, nomineeId: playerId }
        : { ...vote, voterIds: toggle(vote.voterIds, playerId) } });
    }
    return true;
  }

  function completeVote() {
    if (!vote || vote.step !== 2) return;
    const { step: _step, ghostOverrides, ...record } = vote;
    const overrides = Object.fromEntries(Object.entries(ghostOverrides ?? {})
      .filter(([playerId]) => record.voterIds.includes(playerId)));
    commit({ ...game, nominations: putRecord(game.nominations, {
      ...record, ghostOverrides: Object.keys(overrides).length ? overrides : undefined,
    }) });
    setSelection(null);
  }

  function completeWhisper() {
    if (!whisper?.partnerIds.length) return;
    commit({ ...game, whispers: putRecord(game.whispers ?? [], whisper) });
    setSelection(null);
  }

  return {
    vote, whisper, selectSource, sourcePlayerId, selecting, tap, completeVote, completeWhisper,
    begin: (source: RecordKind) => setSelection(source === 'votes'
      ? { kind: 'source', source: 'votes' } : { kind: 'source', source: 'whispers' }),
    editVote: (record: Nomination) => setSelection({ kind: 'source', source: 'votes', record }),
    editWhisper: (record: Whisper) => setSelection({ kind: 'source', source: 'whispers', record }),
  };
}

function toggle(ids: string[], id: string) {
  return ids.includes(id) ? ids.filter(current => current !== id) : [...ids, id];
}
