import { useEffect, useRef, useState, type RefObject } from 'react';
import { isLibrary, libraryKey, restoreLibrary } from './storage.ts';
import { createStoredValue, StorageConflictError } from './persistence.ts';
import type { Script } from './model.ts';

export function useScriptLibrary(allowed: RefObject<boolean>) {
  const [initial] = useState(restoreLibrary);
  const [store] = useState(() => createStoredValue<Script[]>(libraryKey, initial.raw, isLibrary));
  const [library, setLibrary] = useState(initial.value);
  const current = useRef(library);
  const [error, setError] = useState('');
  useEffect(() => {
    function checkRevision(event: StorageEvent) {
      if (event.key !== null && event.key !== libraryKey) return;
      try { if (!store.isCurrent()) setError(new StorageConflictError().message); } catch { /* Report errors on save. */ }
    }
    window.addEventListener('storage', checkRevision);
    return () => window.removeEventListener('storage', checkRevision);
  }, []);

  function update(update: (scripts: Script[]) => Script[]) {
    if (initial.error || !allowed.current) return false;
    try {
      const next = update(current.current);
      store.write(next);
      current.current = next;
      setLibrary(next);
      setError('');
      return true;
    } catch (error) {
      setError(error instanceof StorageConflictError ? error.message : '커스텀 시트를 저장할 수 없습니다. 저장 공간과 브라우저 설정을 확인하세요.');
      return false;
    }
  }
  return { library, update, error, restoreError: initial.error };
}
