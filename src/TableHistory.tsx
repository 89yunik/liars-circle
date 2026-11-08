import type { ReactNode } from 'react';
import { DeleteButton, MenuIcon } from './TableControls.tsx';
import { phaseIndex, type Nomination, type PhaseId, type Whisper } from './model.ts';

export type HistoryKind = 'votes' | 'whispers';

export function TableHistory({
  nominations, whispers, history, selecting, setHistory, name, openMemo,
  editVote, editWhisper, deleteVote, deleteWhisper, startSelection, isDay,
}: {
  nominations: Nomination[];
  whispers: Whisper[];
  history: HistoryKind | null;
  selecting: boolean;
  isDay: boolean;
  startSelection: (kind: HistoryKind) => void;
  setHistory: (history: HistoryKind | null) => void;
  name: (id: string) => string;
  openMemo: () => void;
  editVote: (record: Nomination) => void;
  editWhisper: (record: Whisper) => void;
  deleteVote: (id: string) => void;
  deleteWhisper: (id: string) => void;
}) {
  return <section className="vote-history">
    {([['votes', '지명·투표', 'nomination', nominations.length], ['whispers', '밀담', 'whisper', whispers.length]] as const)
      .map(([kind, label, icon, total]) => <div className="record-actions" key={kind}>
        <button className="history-button record-start" disabled={!isDay}
          aria-label={kind === 'votes' ? '지명자 선택' : '밀담 인원 선택'} onClick={() => startSelection(kind)}>
          <MenuIcon kind={icon} /> {label}
        </button>
        <button className="history-button record-log" disabled={!total || selecting}
          aria-label={`${label} 기록 ${total}건`} title={`${label} 기록`}
          aria-expanded={history === kind} aria-controls={`${kind}-history-content`}
          onClick={() => setHistory(history === kind ? null : kind)}>
          <small>{total}</small>
        </button>
      </div>)}
    <button className="history-button" aria-label="기타" onClick={openMemo}><MenuIcon kind="memo" /> 기타</button>
    <HistoryPanel kind="votes" hidden={history !== 'votes' || selecting} records={nominations}
      edit={editVote} remove={deleteVote}
      deleteLabel={record => `${record.phaseId} ${name(record.nominatorId)} → ${name(record.nomineeId)} 기록 삭제`}
      render={record => <>
        <span className="mark-vote">지명자 <b>{name(record.nominatorId)}</b></span>
        <span aria-hidden="true"> → </span>
        <span className="mark-vote">지명 <b>{name(record.nomineeId)}</b></span>
        <span> 투표 <b className="mark-vote">{record.voterIds.map(name).join(' ') || '없음'}</b></span>
        {record.countedVotes !== undefined && <span> · {record.countedVotes}표</span>}
      </>} />
    <HistoryPanel kind="whispers" hidden={history !== 'whispers' || selecting} records={whispers}
      edit={editWhisper} remove={deleteWhisper}
      deleteLabel={record => `${record.phaseId} ${name(record.playerId)} 밀담 기록 삭제`}
      render={record => <>
        <b className="mark-whisper">{name(record.playerId)}</b>
        <span aria-hidden="true"> · </span>
        <span className="mark-whisper">{record.partnerIds.map(name).join(', ')}</span>
      </>} />
  </section>;
}

function HistoryPanel<T extends { id: string; phaseId: PhaseId; sequence: number }>({
  kind, hidden, records, edit, remove, deleteLabel, render,
}: {
  kind: HistoryKind;
  hidden: boolean;
  records: T[];
  edit: (record: T) => void;
  remove: (id: string) => void;
  deleteLabel: (record: T) => string;
  render: (record: T) => ReactNode;
}) {
  const ordered = [...records].sort((a, b) =>
    phaseIndex(b.phaseId) - phaseIndex(a.phaseId) || a.sequence - b.sequence);
  return <div className="history-content" id={`${kind}-history-content`} hidden={hidden || !records.length}>
    {ordered.map(record => <div className="vote-history-row" key={record.id}>
      <button className="vote-history-edit" onClick={() => edit(record)}>
        <b className="vote-history-phase">{record.phaseId}</b>{' '}{render(record)}
      </button>
      <DeleteButton label={deleteLabel(record)} remove={() => remove(record.id)} />
    </div>)}
  </div>;
}
