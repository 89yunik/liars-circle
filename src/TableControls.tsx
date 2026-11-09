import { Sheet } from './Editors.tsx';

export function Confirmation({ title, message, close, confirm }: {
  title: string; message: string; close: () => void; confirm: () => void;
}) {
  return <Sheet centered compact title={title} close={close}>
    <div className="confirmation">
      <p>{message}</p>
      <div className="confirmation-actions">
        <button onClick={confirm}>예</button>
        <button onClick={close}>아니오</button>
      </div>
    </div>
  </Sheet>;
}

const menuPaths = {
  alignment: 'M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4',
  character: 'M3 5l9 2 9-2v6c0 4-4 8-9 10-5-2-9-6-9-10zM7 11h2m6 0h2m-7 5h4',
  profile: 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21v-2a5 5 0 0 1 5-5h3m2 5 5-5 2 2-5 5h-2z',
  memo: 'M5 3h10l4 4v14H5zM15 3v5h4M8 12h8m-8 4h6',
  nomination: 'M4 11l5 5L20 5M19 12v8H4v-5',
  whisper: 'M3 4h14v9H9l-5 4v-4H3zM20 8h1v10h-3v3l-4-3h-3',
  execution: 'M12 3l6 6-4 4-6-6zM11 10l-8 8m11 2h8',
  life: 'M12 3a7 7 0 0 1 7 7c0 3-2 5-4 6v4H9v-4c-2-1-4-3-4-6a7 7 0 0 1 7-7zM9 10h1m4 0h1m-3 7v3',
  revival: 'M12 20V4m-6 6l6-6 6 6M5 20h14',
};

export function MenuIcon({ kind }: { kind: keyof typeof menuPaths }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none"
    stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d={menuPaths[kind]} />
  </svg>;
}

export function DeleteButton({ label, remove, disabled }: { label: string; remove: () => void; disabled?: boolean }) {
  return <button className="icon vote-history-delete" aria-label={label} title={label} disabled={disabled} onClick={remove}>
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7m4-7v7" />
    </svg>
  </button>;
}
