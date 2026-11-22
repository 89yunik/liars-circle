import { type CSSProperties, type PointerEventHandler, type TouchEventHandler } from 'react';
import { useLanguage } from './Language.tsx';
import { MenuIcon } from './TableControls.tsx';
import { Portrait } from './Editors.tsx';
import { characterImage } from './scripts.ts';
import { playerAlignment, type Character, type Player, type PhaseId } from './model.ts';
import type { Position } from './playerDrag.ts';

export interface TokenMarks {
  nominator: boolean;
  nominee: boolean;
  voter: boolean;
  whisperSource: boolean;
  whisperPartner: boolean;
}

export function PlayerToken({ player, role, phase, position, dragging, selected, aliveNow, executed, diedThisPhase,
  marks, selecting, selectingWhisper, tap, openPlayer, openMemo, onPointerDown, onTouchStart }: {
  player: Player; role?: Character; phase: PhaseId; position: Position;
  dragging: boolean; selected: boolean; aliveNow: boolean; executed: boolean; diedThisPhase: boolean;
  marks: TokenMarks; selecting: boolean; selectingWhisper: boolean;
  tap: (id: string) => void; openPlayer: (id: string) => void; openMemo: (id: string) => void;
  onPointerDown: PointerEventHandler<HTMLDivElement>; onTouchStart: TouchEventHandler<HTMLDivElement>;
}) {
  const { t } = useLanguage();
  const { nominator, nominee, voter, whisperSource, whisperPartner } = marks;
  const alignment = playerAlignment(player, role);
  const image = characterImage(role, alignment);
  const defaultAlignment = playerAlignment({ ...player, alignment: undefined }, role);
  const imageTint = image && alignment && alignment !== defaultAlignment && !role?.alignmentImages?.[alignment]
    ? alignment : undefined;
  const statusMark = executed ? '처형' : diedThisPhase ? '사망' : '';
  return <div data-team={role?.team} data-alignment={alignment} className={dragging ? 'token-seat dragging' : 'token-seat'}
    style={{ '--seat-x': position.x, '--seat-y': position.y } as CSSProperties}
    onDragStart={event => event.preventDefault()}
    onPointerDown={onPointerDown}
    onTouchStart={onTouchStart}
  >
    <button data-selection-interactive className={`token ${aliveNow ? '' : 'dead'} ${selected ? 'selected' : ''}`}
    aria-pressed={selectingWhisper && !whisperSource ? !!whisperPartner : undefined}
    aria-label={[player.name, t(aliveNow ? '생존' : '사망'), executed && t('처형'), role?.name,
      alignment && t(alignment === 'good' ? '선' : '악'), nominator && t('지명자'), nominee && t('피지명자'),
      voter && t('투표자'), whisperSource && t('밀담 기준 플레이어')].filter(Boolean).join(', ')}
    title={role ? `${player.name} · ${role.name}` : player.name}
    onClick={() => tap(player.id)}>
    <span className="token-art" data-image-tint={imageTint}><Portrait key={image} src={image}
      fallback={role ? <span className="role-name">{role.name}</span> : null} /></span>
    {statusMark && <span className="token-status" aria-hidden="true">{t(statusMark)}</span>}
    {(nominator || nominee || voter || whisperSource || whisperPartner) && <span className="vote-marks" aria-hidden="true">
      {nominator && <i className="mark-vote">{t('지명자').slice(0, 1)}</i>}{nominee && <i className="mark-vote">{t('피지명자').slice(0, 1)}</i>}{voter && <i className="mark-vote">{t('투표자').slice(0, 1)}</i>}
      {whisperSource && <i className="mark-whisper">{t('밀담').slice(0, 1)}</i>}{whisperPartner && <i className="mark-whisper">✓</i>}
    </span>}
    </button>
    <div className="token-caption">
      <button type="button"
        aria-label={`${player.name} · ${t('플레이어 메뉴')}`}
        data-selection-interactive
        className={Array.from(player.name).length > 5 ? 'token-label long-name' : 'token-label'}
        onClick={() => {
          if (selecting) tap(player.id);
          else openPlayer(player.id);
        }}>
        {player.name}{player.traveller && <sup> T</sup>}
      </button>
    </div>
    <button type="button" className="token-memo" disabled={selecting}
      aria-label={`${player.name} · ${phase} ${t('메모')}`} title={t('메모')}
      onClick={() => openMemo(player.id)}>
      <MenuIcon kind="memo" />
    </button>
  </div>;
}
