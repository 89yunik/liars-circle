import { useEffect, useRef, useState } from 'react';
import { gameKey, isGame, isLibrary, libraryKey, restoreGame, restoreLibrary } from './storage.ts';
import { createStoredValue, StorageConflictError } from './persistence.ts';
import { useWriteLock } from './useWriteLock.ts';
import type { Game, Script } from './model.ts';

export function useGame() {
  const [initial] = useState(restoreGame);
  const [initialLibrary] = useState(restoreLibrary);
  const [gameStore] = useState(() => createStoredValue<Game>(gameKey, initial.raw, isGame));
  const [libraryStore] = useState(() => createStoredValue<Script[]>(libraryKey, initialLibrary.raw, isLibrary));
  const { allowed, readOnly } = useWriteLock();
  const [game, setGame] = useState(initial.value);
  const [library, setLibrary] = useState(initialLibrary.value);
  const [error, setError] = useState('');
  const [libraryError, setLibraryError] = useState('');
  const current = useRef(game);
  const currentLibrary = useRef(library);
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
      if (event.key === null || event.key === libraryKey) {
        try { if (!libraryStore.isCurrent()) setLibraryError(new StorageConflictError().message); } catch { /* Retain the current library. */ }
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

  function end() {
    if (initial.error || !allowed.current) return;
    try {
      gameStore.remove();
      window.clearTimeout(timer.current);
      pending.current = false;
      current.current = null;
      setGame(null);
      setError('');
    } catch (error) { setError(error instanceof StorageConflictError ? error.message : '저장소에서 게임을 종료할 수 없습니다.'); }
  }

  function updateLibrary(update: (scripts: Script[]) => Script[]) {
    if (initialLibrary.error || !allowed.current) return false;
    try {
      const next = update(currentLibrary.current);
      libraryStore.write(next);
      currentLibrary.current = next;
      setLibrary(next);
      setLibraryError('');
      return true;
    } catch (error) {
      setLibraryError(error instanceof StorageConflictError ? error.message : '커스텀 시트를 저장할 수 없습니다. 저장 공간과 브라우저 설정을 확인하세요.');
      return false;
    }
  }

  return { game, library, commit, end, flush, updateLibrary, error, libraryError,
    readOnly, restoreError: initial.error, restoreLibraryError: initialLibrary.error };
}
