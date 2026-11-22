import { useEffect, useRef, useState, type RefObject } from 'react';
import { gameKey, isGame, restoreGame } from './storage.ts';
import { createStoredValue, StorageConflictError } from './persistence.ts';
import { endStoredGame } from './endGame.ts';
import type { Game } from './model.ts';

export function useGameStorage(allowed: RefObject<boolean>) {
  const [initial] = useState(restoreGame);
  const [gameStore] = useState(() => createStoredValue<Game>(gameKey, initial.raw, isGame));
  const [game, setGame] = useState(initial.value);
  const [error, setError] = useState('');
  const current = useRef(game);
  const timer = useRef<number | undefined>(undefined);
  const pending = useRef(false);

  function flush() {
    window.clearTimeout(timer.current);
    if (!allowed.current || !pending.current || !current.current) return;
    try {
      gameStore.write(current.current);
      pending.current = false;
      setError('');
    } catch (error) {
      setError(error instanceof StorageConflictError ? error.message : error instanceof Error && error.name === 'QuotaExceededError'
        ? '저장 공간이 부족합니다. 최신 변경은 이 화면에 남아 있습니다.'
        : '게임을 저장할 수 없습니다. 최신 변경은 이 화면에 남아 있습니다.');
    }
  }

  useEffect(() => {
    const checkRevision = (event: StorageEvent) => {
      if (event.key === null || event.key === gameKey) {
        try { if (!gameStore.isCurrent()) setError(new StorageConflictError().message); } catch { /* A normal save will report storage access errors. */ }
      }
    };
    window.addEventListener('storage', checkRevision);
    const visibility = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('storage', checkRevision);
      document.removeEventListener('visibilitychange', visibility);
      window.clearTimeout(timer.current);
    };
  }, []);

  function commit(next: Game, debounce = false) {
    if (initial.error || !allowed.current) return;
    current.current = next;
    pending.current = true;
    setGame(next);
    window.clearTimeout(timer.current);
    if (debounce) timer.current = window.setTimeout(flush, 250);
    else flush();
  }

  function end(beforeRemove: (game: Game) => void) {
    if (initial.error || !allowed.current) return;
    try {
      endStoredGame(gameStore, current.current, beforeRemove);
      window.clearTimeout(timer.current);
      pending.current = false;
      current.current = null;
      setGame(null);
      setError('');
    } catch (error) { setError(error instanceof StorageConflictError ? error.message : '저장소에서 게임을 종료할 수 없습니다.'); }
  }

  return { game, commit, flush, end, error, restoreError: initial.error };
}
