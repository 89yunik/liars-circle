import { useEffect, useState } from 'react';
import { aliveAt, id, nextSequence, putRecord, type Game, type Nomination, type PhaseId, type Whisper } from './model.ts';

export type RecordKind = 'votes' | 'whispers';
export type VoteDraft = Nomination & { step: 1 | 2 };
type Selection =
  | { kind: 'source'; source: RecordKind }
  | { kind: 'vote'; draft: VoteDraft }
  | { kind: 'whisper'; draft: Whisper }
  | null;

export function useTableSelection(game: Game, phase: PhaseId, commit: (game: Game) => void) {
  const [selection, setSelection] = useState<Selection>(null);
  const vote = selection?.kind === 'vote' ? selection.draft : null;
  const whisper = selection?.kind === 'whisper' ? selection.draft : null;
  const selectSource = selection?.kind === 'source' ? selection.source : null;
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

  const canNominate = (playerId: string) => phase.startsWith('D') && aliveAt(game, playerId, phase) &&
    !game.nominations.some(record => record.phaseId === phase && record.nominatorId === playerId);

  function tap(playerId: string) {
    if (!selection) return false;
    if (selectSource === 'votes' && canNominate(playerId)) {
      setSelection({ kind: 'vote', draft: {
        id: id(), phaseId: phase, sequence: nextSequence([...game.events, ...game.nominations], phase),
        nominatorId: playerId, nomineeId: '', voterIds: [], step: 1,
      } });
    } else if (selectSource === 'whispers' && phase.startsWith('D')) {
      setSelection({ kind: 'whisper', draft: {
        id: id(), phaseId: phase as Whisper['phaseId'], sequence: nextSequence(game.whispers ?? [], phase),
        playerId, partnerIds: [],
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
    vote, whisper, selectSource, selecting, canNominate, tap, completeVote, completeWhisper,
    begin: (source: RecordKind) => setSelection({ kind: 'source', source }),
    editVote: (record: Nomination) => setSelection({ kind: 'vote', draft: { ...record, step: 1 } }),
    editWhisper: (record: Whisper) => setSelection({ kind: 'whisper', draft: record }),
  };
}

function toggle(ids: string[], id: string) {
  return ids.includes(id) ? ids.filter(current => current !== id) : [...ids, id];
}
