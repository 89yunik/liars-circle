import { useEffect, useState } from 'react';
import { id, type Game, type Nomination, type PhaseId, type Whisper } from './model.ts';

import { transitionSelection, completeSelection, type Selection, type SelectionAction, type RecordKind } from './tableSelection.ts';

export function useTableSelection(game: Game, phase: PhaseId, commit: (game: Game) => void) {
  const [selection, setSelection] = useState<Selection>(null);
  const dispatch = (action: SelectionAction) => setSelection(previous => transitionSelection(previous, action));
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
      if (event.target instanceof Element && event.target.closest('[data-selection-interactive]')) return;
      event.preventDefault();
      event.stopPropagation();
      dispatch({ type: 'cancel' });
    }
    function dismissOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') dispatch({ type: 'cancel' });
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
    dispatch({ type: 'selectPlayer', playerId, newId: id(), game, phase });
    return true;
  }

  function complete(kind: 'vote' | 'whisper') {
    if (selection?.kind !== kind) return;
    const next = completeSelection(game, selection);
    if (!next) return;
    commit(next);
    dispatch({ type: 'cancel' });
  }

  return {
    vote, whisper, selectSource, sourcePlayerId, selecting, tap,
    completeVote: () => complete('vote'),
    completeWhisper: () => complete('whisper'),
    begin: (source: RecordKind) => dispatch({ type: 'begin', source }),
    editVote: (record: Nomination) => dispatch({ type: 'editVote', record }),
    editWhisper: (record: Whisper) => dispatch({ type: 'editWhisper', record }),
  };
}
