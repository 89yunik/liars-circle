import { useLanguage } from './Language.tsx';
import { type CSSProperties } from 'react';
import { useTableLayout } from './useTableLayout.ts';
import { PlayerToken } from './PlayerToken.tsx';
import { aliveAt, type Character, type Game, type PhaseId, type Whisper } from './model.ts';

import type { VoteDraft } from './tableSelection.ts';

const setupCounts = [
  [3, 0, 1, 1], [3, 1, 1, 1], [5, 0, 1, 1], [5, 1, 1, 1], [5, 2, 1, 1],
  [7, 0, 2, 1], [7, 1, 2, 1], [7, 2, 2, 1], [9, 0, 3, 1], [9, 1, 3, 1], [9, 2, 3, 1],
];
const setupRoles = ['주민', '외지인', '하수인', '악마'];

export function TableBoard({ game, phase, roles, selectedId, vote, whisper, tap, openMemo, openPlayer, selecting, selectSource, sourcePlayerId, movePlayer, completeVote, completeWhisper }: {
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
  sourcePlayerId?: string;
  movePlayer: (playerId: string, seat: number) => void;
  completeVote: () => void;
  completeWhisper: () => void;
}) {
  const { t } = useLanguage();
  const alive = game.players.filter(player => aliveAt(game, player.id, phase)).length;
  const count = game.players.length;
  const standardCount = game.players.filter(player => !player.traveller).length;
  const composition = setupCounts[standardCount - 5];
  const phaseEvents = game.events.filter(event => event.phaseId === phase);
  const { tableRef, diameter, tokenRatio, positions, drag, resetSuppressedClick, suppressDragClick } = useTableLayout(count, movePlayer);

  return <div className="table-area" onPointerDownCapture={resetSuppressedClick} onClickCapture={suppressDragClick}>
    <div className="table" ref={tableRef} style={{ '--diameter': `${diameter}px`, '--token-ratio': tokenRatio } as CSSProperties}>
      <div className="table-center">
        {selectSource ? <span className="vote-prompt" role="status">
          {t(selectSource === 'votes' ? '지명자 선택' : '밀담 기준 플레이어 선택')}
        </span> : vote ? (vote.step === 2
          ? <button data-selection-interactive className="primary vote-complete" onClick={completeVote}>{t('완료 · {count}표', { count: vote.countedVotes ?? vote.voterIds.length })}</button>
          : <span className="vote-prompt" role="status">{t('피지명자 선택')}</span>)
          : whisper ? <>
            <span className="vote-prompt" role="status">{t('밀담 상대 선택')}</span>
            <button data-selection-interactive className="primary vote-complete" disabled={!whisper.partnerIds.length}
              onClick={completeWhisper}>{t('완료 · {count}명', { count: whisper.partnerIds.length })}</button>
          </> : <>
            {composition
              ? <div className="role-counts" aria-label={t('기본 역할 구성')}>
                {setupRoles.map((label, index) => <span key={label}>{t(label)} <b>{composition[index]}</b></span>)}
              </div>
              : <span className="role-counts">{t('기본 구성 · 일반 인원 5–15명')}</span>}
            <span>{t('{alive} / {count} 생존', { alive, count })}</span></>}
      </div>
      {game.players.map(player => {
        const savedPosition = positions[player.seat];
        const pos = drag.preview?.playerId === player.id ? drag.preview.position : savedPosition;
        const role = roles.find(role => role.id === player.characterId);
        const aliveNow = aliveAt(game, player.id, phase);
        const executed = phaseEvents.some(event => event.kind === 'execution' && event.playerId === player.id);
        const diedThisPhase = !aliveNow && phaseEvents.some(event => event.kind === 'death' && event.playerId === player.id);
        return <PlayerToken key={player.id} player={player} role={role} phase={phase} position={pos}
          dragging={drag.preview?.playerId === player.id} selected={selectedId === player.id}
          aliveNow={aliveNow} executed={executed} diedThisPhase={diedThisPhase}
          marks={{
            nominator: vote?.nominatorId === player.id || (selectSource === 'votes' && sourcePlayerId === player.id),
            nominee: vote?.nomineeId === player.id,
            voter: vote?.voterIds.includes(player.id) ?? false,
            whisperSource: whisper?.playerId === player.id || (selectSource === 'whispers' && sourcePlayerId === player.id),
            whisperPartner: whisper?.partnerIds.includes(player.id) ?? false,
          }}
          selecting={selecting} selectingWhisper={whisper !== null} tap={tap} openPlayer={openPlayer} openMemo={openMemo}
          onPointerDown={event => { if (!selecting) drag.start(event, player.id, savedPosition); }}
          onTouchStart={event => { if (!selecting) drag.startTouch(event, player.id, savedPosition); }} />;
      })}
    </div>
  </div>;
}
