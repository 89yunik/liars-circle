import { useEffect, useRef, useState } from 'react';

export function useWriteLock() {
  const allowed = useRef(!navigator.locks);
  const [readOnly, setReadOnly] = useState(false);
  useEffect(() => {
    if (!navigator.locks) return;
    let disposed = false;
    let release: (() => void) | undefined;
    void navigator.locks.request('liars-circle:edit', { ifAvailable: true }, async lock => {
      if (disposed) return;
      allowed.current = lock !== null;
      setReadOnly(!lock);
      if (lock) await new Promise<void>(resolve => { release = resolve; });
    }).catch(() => {
      // Optimistic revision checks remain available when locking is unsupported or denied.
      if (!disposed) allowed.current = true;
    });
    return () => {
      disposed = true;
      allowed.current = false;
      release?.();
    };
  }, []);
  return { allowed, readOnly };
}
