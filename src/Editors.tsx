import { useEffect, useRef, useState, type ReactNode } from 'react';
import { sameTarget, type Game, type MemoTarget, type PhaseId } from './model.ts';

export function Sheet({ title, close, centered, compact, children }: {
  title: string; centered?: boolean; compact?: boolean; close: () => void; children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} className={centered ? (compact ? 'table-dialog compact-dialog' : 'table-dialog') : undefined} aria-label={title}
    onCancel={event => { event.preventDefault(); close(); }}
    onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <section className="sheet">{children}</section>
  </dialog>;
}

export function Portrait({ src, fallback = null }: { src?: string; fallback?: ReactNode }) {
  const [failed, setFailed] = useState(false);
  return src && !failed ? <img src={src} alt="" onError={() => setFailed(true)} /> : fallback;
}

export function MemoEditor({ game, phase, target, label, rows = 3, save }: {
  game: Game; phase: PhaseId; target: MemoTarget; label: string; rows?: number;
  save: (phase: PhaseId, target: MemoTarget, text: string) => void;
}) {
  const memo = game.memos.find(item => item.phaseId === phase && sameTarget(item, target));
  return <div className="memo-editor">
    <label>{label}<textarea rows={rows} value={memo?.text ?? ''} placeholder="메모를 입력하세요"
      onChange={event => save(phase, target, event.target.value)} /></label>
  </div>;
}
