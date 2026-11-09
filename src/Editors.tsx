import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { isImageUrl } from './validation.ts';
import { sameTarget, type Game, type MemoTarget, type PhaseId } from './model.ts';

export function Sheet({ title, close, centered, compact, memo, children }: {
  title: string; centered?: boolean; compact?: boolean; memo?: boolean; close: () => void; children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const initialField = element.querySelector<HTMLTextAreaElement>('textarea[data-initial-focus="true"]');
    initialField?.setAttribute('autofocus', '');
    element.showModal();

    const viewport = memo ? window.visualViewport : null;
    if (!viewport) return;
    function fitMemoToViewport() {
      if (!element || !viewport) return;
      element.style.setProperty('--memo-center-x', `${viewport.offsetLeft + viewport.width / 2}px`);
      element.style.setProperty('--memo-center-y', `${viewport.offsetTop + viewport.height / 2}px`);
      element.style.setProperty('--memo-viewport-width', `${viewport.width}px`);
      element.style.setProperty('--memo-viewport-height', `${viewport.height}px`);

      const field = document.activeElement;
      if (field instanceof HTMLTextAreaElement && element.contains(field)) {
        const bounds = element.getBoundingClientRect();
        const input = field.getBoundingClientRect();
        if (input.top < bounds.top + 5) element.scrollTop += input.top - bounds.top - 5;
        else if (input.bottom > bounds.bottom - 5) element.scrollTop += input.bottom - bounds.bottom + 5;
      }
    }
    fitMemoToViewport();
    viewport.addEventListener('resize', fitMemoToViewport);
    viewport.addEventListener('scroll', fitMemoToViewport);
    return () => {
      viewport.removeEventListener('resize', fitMemoToViewport);
      viewport.removeEventListener('scroll', fitMemoToViewport);
    };
  }, [memo]);
  const className = centered ? ['table-dialog', compact && 'compact-dialog', memo && 'memo-dialog'].filter(Boolean).join(' ') : undefined;
  return <dialog ref={dialog} className={className} aria-label={title}
    onCancel={event => { event.preventDefault(); close(); }}
    onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <section className="sheet">{children}</section>
  </dialog>;
}

export function Portrait({ src, fallback = null }: { src?: string; fallback?: ReactNode }) {
  const [failed, setFailed] = useState(false);
  return src && isImageUrl(src) && !failed ? <img src={src} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} /> : fallback;
}

export function MemoEditor({ game, phase, target, label, rows = 3, autoFocus = false, save }: {
  game: Game; phase: PhaseId; target: MemoTarget; label: string; rows?: number; autoFocus?: boolean;
  save: (phase: PhaseId, target: MemoTarget, text: string) => void;
}) {
  const memo = game.memos.find(item => item.phaseId === phase && sameTarget(item, target));
  return <div className="memo-editor">
    <label>{label}<textarea rows={rows} data-initial-focus={autoFocus} value={memo?.text ?? ''}
      onChange={event => save(phase, target, event.target.value)} /></label>
  </div>;
}
