import { useEffect, useRef, useState } from 'react';
import { gameKey, libraryKey, restoreGame, restoreLibrary } from './storage.ts';
import type { Game, Script } from './model.ts';

export function useGame() {
  const [initial] = useState(restoreGame);
  const [initialLibrary] = useState(restoreLibrary);
  const [game, setGame] = useState(initial.value);
  const [library, setLibrary] = useState(initialLibrary.value);
  const [error, setError] = useState('');
  const [libraryError, setLibraryError] = useState('');
  const current = useRef(game);
  const timer = useRef<number | undefined>(undefined);
  const pending = useRef(false);

  function flush() {
    window.clearTimeout(timer.current);
    if (!pending.current || !current.current) return;
    try {
      localStorage.setItem(gameKey, JSON.stringify(current.current));
      pending.current = false;
      setError('');
    } catch (error) {
      setError(error instanceof Error && error.name === 'QuotaExceededError'
        ? '저장 공간이 부족합니다. 최신 변경은 이 화면에 남아 있습니다.'
        : '게임을 저장할 수 없습니다. 최신 변경은 이 화면에 남아 있습니다.');
    }
  }

  useEffect(() => {
    const visibility = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', visibility);
      window.clearTimeout(timer.current);
    };
  }, []);

  function commit(next: Game, debounce = false) {
    if (initial.error) return;
    current.current = next;
    pending.current = true;
    setGame(next);
    window.clearTimeout(timer.current);
    if (debounce) timer.current = window.setTimeout(flush, 250);
    else flush();
  }

  function end() {
    try {
      localStorage.removeItem(gameKey);
      window.clearTimeout(timer.current);
      pending.current = false;
      current.current = null;
      setGame(null);
      setError('');
    } catch { setError('저장소에서 게임을 종료할 수 없습니다.'); }
  }

  function updateLibrary(next: Script[]) {
    if (initialLibrary.error) return false;
    try {
      localStorage.setItem(libraryKey, JSON.stringify(next));
      setLibrary(next);
      setLibraryError('');
      return true;
    } catch {
      setLibraryError('커스텀 시트를 저장할 수 없습니다. 저장 공간과 브라우저 설정을 확인하세요.');
      return false;
    }
  }

  return { game, library, commit, end, flush, updateLibrary, error, libraryError,
    restoreError: initial.error, restoreLibraryError: initialLibrary.error };
}
