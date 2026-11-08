import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { usePlayerDrag } from './usePlayerDrag.ts';
import { MenuIcon } from './TableControls.tsx';
import { Portrait } from './Editors.tsx';
import { aliveAt, evenlySpacedSeats, seatPosition, type Character, type Game, type Nomination, type PhaseId, type Whisper } from './model.ts';

export type VoteDraft = Nomination & { step: 1 | 2 };

const setupCounts = [
  [3, 0, 1, 1], [3, 1, 1, 1], [5, 0, 1, 1], [5, 1, 1, 1], [5, 2, 1, 1],
  [7, 0, 2, 1], [7, 1, 2, 1], [7, 2, 2, 1], [9, 0, 3, 1], [9, 1, 3, 1], [9, 2, 3, 1],
];
const setupRoles = ['주민', '외지인', '하수인', '악마'];

export function TableBoard({ game, phase, roles, selectedId, vote, whisper, tap, openMemo, openPlayer, selecting, selectSource, canNominate, movePlayer, completeVote, completeWhisper }: {
  game: Game;
  phase: PhaseId;
  roles: Character[];
  selectedId?: string;
  vote: VoteDraft | null;
  whisper: Whisper | null;
  tap: (playerId: string) => void;
  openMemo: (playerId: string) => void;
  openPlayer: (playerId: string) => void;
  selecting: boolean;
  selectSource: 'votes' | 'whispers' | null;
  canNominate: (playerId: string) => boolean;
  movePlayer: (playerId: string, seat: number) => void;
  completeVote: () => void;
  completeWhisper: () => void;
}) {
  const tableRef = useRef<HTMLDivElement>(null);
  const [tableSize, setTableSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const table = tableRef.current;
    if (!table) return;
    const measure = () => {
      const { width, height } = table.getBoundingClientRect();
      setTableSize(previous => previous.width === width && previous.height === height ? previous : { width, height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(table);
    return () => observer.disconnect();
  }, []);
  const alive = game.players.filter(player => aliveAt(game, player.id, phase)).length;
  const count = game.players.length;
  const standardCount = game.players.filter(player => !player.traveller).length;
  const composition = setupCounts[standardCount - 5];
  const phaseEvents = game.events.filter(event => event.phaseId === phase);
  const radius = Math.max(111, Math.ceil(76 / (2 * Math.sin(Math.PI / count))));
  const diameter = radius * 2 + 76;
  const tokenRatio = 56 / diameter;
  // Match the inset used to position the token centers in CSS.
  const inset = Math.min(tableSize.width, tableSize.height) * tokenRatio / 2 + 10;
  const radiusX = tableSize.width / 2 - inset;
  const radiusY = tableSize.height / 2 - inset - 5;
  const positions = radiusX > 0 && radiusY > 0
    ? evenlySpacedSeats(count, radiusX, radiusY)
    : game.players.map(player => seatPosition(player.seat, count, 1));

  const drag = usePlayerDrag(radiusX, radiusY, (playerId, position) => {
    let nearestSeat = 0;
    let nearestDistance = Infinity;
    positions.forEach((seat, index) => {
      const distance = Math.hypot((seat.x - position.x) * radiusX, (seat.y - position.y) * radiusY);
      if (distance < nearestDistance) {
        nearestSeat = index;
        nearestDistance = distance;
      }
    });
    movePlayer(playerId, nearestSeat);
  });

  return <div className="table-area" onPointerDownCapture={() => { drag.suppressClick.current = false; }} onClickCapture={event => {
    if (event.detail !== 0 && drag.suppressClick.current) {
      drag.suppressClick.current = false;
      event.preventDefault();
      event.stopPropagation();
    }
  }}>
    <div className="table" ref={tableRef} style={{ '--diameter': `${diameter}px`, '--token-ratio': tokenRatio } as CSSProperties}>
      <div className="table-center">
        {selectSource ? <span className="vote-prompt" role="status">
          {selectSource === 'votes' ? '지명자 선택' : '밀담 기준 플레이어 선택'}
        </span> : vote ? (vote.step === 2
          ? <button className="primary vote-complete" onClick={completeVote}>완료 · {vote.countedVotes ?? vote.voterIds.length}표</button>
          : <span className="vote-prompt" role="status">피지명자 선택</span>)
          : whisper ? <>
            <span className="vote-prompt" role="status">밀담 상대 선택</span>
            <button className="primary vote-complete" disabled={!whisper.partnerIds.length}
              onClick={completeWhisper}>완료 · {whisper.partnerIds.length}명</button>
          </> : <>
            {composition
              ? <div className="role-counts" aria-label="기본 역할 구성">
                {setupRoles.map((label, index) => <span key={label}>{label} <b>{composition[index]}</b></span>)}
              </div>
              : <span className="role-counts">기본 구성 · 일반 인원 5–15명</span>}
            <span>{alive} / {count} 생존</span></>}
      </div>
      {game.players.map(player => {
        const savedPosition = positions[player.seat];
        const pos = drag.preview?.playerId === player.id ? drag.preview.position : savedPosition;
        const role = roles.find(role => role.id === player.characterId);
        const aliveNow = aliveAt(game, player.id, phase);
        const executed = phaseEvents.some(event => event.kind === 'execution' && event.playerId === player.id);
        const diedThisPhase = !aliveNow && phaseEvents.some(event => event.kind === 'death' && event.playerId === player.id);
        const statusMark = executed ? '처형' : diedThisPhase ? '사망' : '';
        const nominator = vote?.nominatorId === player.id;
        const nominee = vote?.nomineeId === player.id;
        const voter = vote?.voterIds.includes(player.id);
        const whisperSource = whisper?.playerId === player.id;
        const whisperPartner = whisper?.partnerIds.includes(player.id);
        return <div key={player.id} className={drag.preview?.playerId === player.id ? 'token-seat dragging' : 'token-seat'}
          style={{ '--seat-x': pos.x, '--seat-y': pos.y } as CSSProperties}
          onDragStart={event => event.preventDefault()}
          onPointerDown={event => { if (!selecting) drag.start(event, player.id, savedPosition); }}
          onPointerMove={drag.move}
          onPointerUp={event => drag.finish(event)}
          onPointerCancel={event => drag.finish(event, true)}
          onLostPointerCapture={drag.lostCapture}
        >
          <button data-team={role?.team} className={`token ${aliveNow ? '' : 'dead'} ${executed ? 'executed' : ''} ${selectedId === player.id ? 'selected' : ''}`}
          aria-disabled={selectSource === 'votes' && !canNominate(player.id)}
          aria-pressed={whisper && !whisperSource ? !!whisperPartner : undefined}
          aria-label={`${player.name}, ${aliveNow ? '생존' : '사망'}${executed ? ', 처형' : ''}${role ? ', ' + role.name : ''}${nominator ? ', 지명자' : ''}${nominee ? ', 피지명자' : ''}${voter ? ', 투표자' : ''}${whisperSource ? ', 밀담 기준 플레이어' : ''}`}
          title={role ? `${player.name} · ${role.name}` : player.name}
          onClick={() => tap(player.id)}>
          <span className="token-art"><Portrait key={role?.image} src={role?.image} /></span>
          {statusMark && <span className="token-status" aria-hidden="true">{statusMark}</span>}
          {(nominator || nominee || voter || whisperSource || whisperPartner) && <span className="vote-marks" aria-hidden="true">
            {nominator && <i className="mark-vote">지</i>}{nominee && <i className="mark-vote">피</i>}{voter && <i className="mark-vote">표</i>}
            {whisperSource && <i className="mark-whisper">밀</i>}{whisperPartner && <i className="mark-whisper">✓</i>}
          </span>}
          </button>
          <div className="token-caption">
            <button type="button"
              aria-label={`${player.name} · 플레이어 메뉴`}
              className={Array.from(player.name).length > 5 ? 'token-label long-name' : 'token-label'}
              onClick={() => {
                if (selecting) tap(player.id);
                else openPlayer(player.id);
              }}>
              {player.name}{player.traveller && <sup> T</sup>}
            </button>
            <button type="button" className="token-memo" disabled={selecting}
              aria-label={`${player.name} · ${phase} 메모`} title="메모"
              onClick={() => openMemo(player.id)}>
              <MenuIcon kind="memo" />
            </button>
          </div>
        </div>;
      })}
    </div>
  </div>;
}
