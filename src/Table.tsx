import { useLanguage } from './Language.tsx';
import { localizeCharacter, scriptName } from './locale.ts';
import { flushSync } from 'react-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MemoEditor, Portrait, Sheet } from './Editors.tsx';
import {
  aliveAt, byTime, id, MAX_PLAYERS, MIN_PLAYERS, nextSequence, phaseAt, phaseIndex, playerAlignment, putRecord, removeLifeEvent, removePlayer, reorderPlayer, writeMemo,
  type EventResult, type Game, type GameEvent, type MemoTarget, type PhaseId, type Whisper,
} from './model.ts';
import { characters } from './scripts.ts';
import { TableBoard, type VoteDraft } from './TableBoard.tsx';
import { Confirmation, DeleteButton, MenuIcon } from './TableControls.tsx';
import { TableHistory, type HistoryKind } from './TableHistory.tsx';
import { ScriptReference } from './ScriptReference.tsx';

type Popup =
  | { kind: 'player' | 'character' | 'memo' | 'profile' | 'delete-player'; playerId: string }
  | { kind: 'general' | 'end' | 'script' };

export function Table({ game, commit, flush, end }: {
  game: Game; commit: (game: Game, debounce?: boolean) => void; flush: () => void;
  end: () => void;
}) {
  const { t, language } = useLanguage();
  const phaseTouch = useRef(false);
  const [showPhaseDelete, setShowPhaseDelete] = useState(false);
  const [view, setView] = useState<PhaseId | null>(null);
  const [popup, setPopup] = useState<Popup | null>(null);
  const [history, setHistory] = useState<HistoryKind | null>(null);
  const phase = view ?? game.currentPhase;
  const [vote, setVote] = useState<VoteDraft | null>(null);
  const [whisper, setWhisper] = useState<Whisper | null>(null);
  const [selectSource, setSelectSource] = useState<HistoryKind | null>(null);
  const whispers = game.whispers ?? [];
  const selecting = vote !== null || whisper !== null || selectSource !== null;
  useEffect(() => {
    if (!selecting) return;
    function dismissOutside(event: MouseEvent) {
      if (event.target instanceof Element && event.target.closest('.token, .vote-complete, .token-label, .record-start')) return;
      event.preventDefault();
      event.stopPropagation();
      setVote(null);
      setWhisper(null);
      setSelectSource(null);
    }
    function dismissOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setVote(null);
      setWhisper(null);
      setSelectSource(null);
    }
    document.addEventListener('click', dismissOutside, true);
    document.addEventListener('keydown', dismissOnEscape);
    return () => {
      document.removeEventListener('click', dismissOutside, true);
      document.removeEventListener('keydown', dismissOnEscape);
    };
  }, [selecting]);
  useEffect(() => {
    if (!history) return;
    function dismissHistory(event: MouseEvent) {
      if (event.target instanceof Element && event.target.closest('.vote-history')) return;
      setHistory(null);
    }
    document.addEventListener('click', dismissHistory, true);
    return () => document.removeEventListener('click', dismissHistory, true);
  }, [history]);
  const isDay = phase.startsWith('D');
  const canNominate = (playerId: string) => isDay && aliveAt(game, playerId, phase) &&
    !game.nominations.some(record => record.phaseId === phase && record.nominatorId === playerId);
  const roles = useMemo(() => characters(game.script).map(role => localizeCharacter(role, language)), [game.script, language]);
  const selected = popup && 'playerId' in popup ? game.players.find(player => player.id === popup.playerId) : undefined;
  const selectedAlive = selected && aliveAt(game, selected.id, phase);
  const selectedAlignment = selected && playerAlignment(selected, roles.find(role => role.id === selected.characterId));
  const selectedExecuted = selected && game.events.some(event => isExecution(event, selected.id));
  const selectedLifeEvent = selected && game.events.filter(event =>
    event.playerId === selected.id && event.phaseId === phase && event.kind !== 'execution').sort(byTime).at(-1);
  const lifeLabel = selectedLifeEvent
    ? selectedLifeEvent.kind === 'revival' ? '부활 취소' : '사망 취소'
    : selectedAlive ? '사망' : '부활';
  const name = (key: string) => game.players.find(player => player.id === key)?.name ?? '—';
  const close = () => { flush(); setPopup(null); };
  const saveMemo = (phaseId: PhaseId, target: MemoTarget, text: string) =>
    commit(writeMemo(game, phaseId, target, text), true);
  const navigate = (offset: number) => {
    setShowPhaseDelete(false);
    const next = phaseAt(phaseIndex(phase) + offset);
    if (offset === 1 && !view) commit({ ...game, currentPhase: next });
    else setView(next === game.currentPhase ? null : next);
  };
  function openRecordPhase(phaseId: PhaseId) {
    setView(phaseId === game.currentPhase ? null : phaseId);
    setHistory(null);
  }

  function startVote(nominatorId: string) {
    if (!canNominate(nominatorId)) return;
    setPopup(null);
    setHistory(null);
    setSelectSource(null);
    setVote({
      id: id(), phaseId: phase, sequence: nextSequence([...game.events, ...game.nominations], phase),
      nominatorId, nomineeId: '', voterIds: [], step: 1,
    });
  }

  function startWhisper(playerId: string) {
    if (!phase.startsWith('D')) return;
    const day = phase as Whisper['phaseId'];
    setPopup(null);
    setHistory(null);
    setSelectSource(null);
    setWhisper({ id: id(), phaseId: day, sequence: nextSequence(whispers, day), playerId, partnerIds: [] });
  }

  function completeWhisper() {
    if (!whisper?.partnerIds.length) return;
    commit({ ...game, whispers: putRecord(whispers, whisper) });
    setWhisper(null);
    setHistory(null);
  }

  function isExecution(event: GameEvent, playerId: string) {
    return event.kind === 'execution' && event.playerId === playerId && event.phaseId === phase;
  }

  function recordPlayerEvent(playerId: string, action: 'execution' | 'life') {
    const existing = action === 'execution'
      ? game.events.find(event => isExecution(event, playerId))
      : game.events.filter(event => event.playerId === playerId && event.phaseId === phase &&
        event.kind !== 'execution').sort(byTime).at(-1);
    if (existing) {
      commit(removeLifeEvent(game, existing.id));
      close();
      return;
    }
    const result: EventResult = action === 'execution' ? { kind: 'execution', result: 'dead' }
      : aliveAt(game, playerId, phase) ? { kind: 'death', result: 'dead' } : { kind: 'revival', result: 'alive' };
    const event: GameEvent = { ...result, id: id(), phaseId: phase, playerId, reason: '',
      sequence: nextSequence([...game.events, ...game.nominations], phase) };
    commit({ ...game, events: [...game.events, event] });
    close();
  }

  function addPlayer() {
    const seat = game.players.length;
    if (seat >= MAX_PLAYERS) return;
    const names = new Set(game.players.map(player => player.name));
    let number = names.has(`P${seat + 1}`) ? 1 : seat + 1;
    while (names.has(`P${number}`)) number++;
    const player = { id: id(), name: `P${number}`, seat, traveller: false };
    commit({ ...game, players: [...game.players, player] });
    setPopup({ kind: 'profile', playerId: player.id });
  }

  function saveProfile(playerId: string, changes: { name?: string; traveller?: boolean }) {
    commit({
      ...game,
      players: game.players.map(player => {
        if (player.id !== playerId) return player;
        const traveller = changes.traveller ?? player.traveller;
        return {
          ...player,
          name: changes.name === undefined ? player.name : changes.name.trim() || `P${player.seat + 1}`,
          traveller,
          characterId: traveller === player.traveller ? player.characterId : undefined,
        };
      }),
    }, true);
  }

  function openMemo(playerId?: string) {
    // Mount and focus within the tap event so mobile browsers can open the keyboard.
    flushSync(() => {
      setHistory(null);
      setPopup(playerId ? { kind: 'memo', playerId } : { kind: 'general' });
    });
  }

  function beginSelection(kind: HistoryKind) {
    setHistory(null);
    setVote(null);
    setWhisper(null);
    setSelectSource(kind);
  }

  function tap(playerId: string) {
    if (selectSource === 'votes') { startVote(playerId); return; }
    if (selectSource === 'whispers') { startWhisper(playerId); return; }
    if (whisper) {
      if (playerId !== whisper.playerId) setWhisper({
        ...whisper,
        partnerIds: toggleParticipant(whisper.partnerIds, playerId),
      });
      return;
    }
    if (!vote) { setPopup({ kind: 'character', playerId }); return; }
    if (vote.step === 1) setVote({ ...vote, step: 2, nomineeId: playerId });
    else setVote({
      ...vote,
      voterIds: toggleParticipant(vote.voterIds, playerId),
    });
  }

  const count = game.players.length;

  function completeVote() {
    if (!vote || vote.step !== 2) return;
    const { step: _step, ghostOverrides, ...record } = vote;
    const overrides = Object.fromEntries(Object.entries(ghostOverrides ?? {})
      .filter(([playerId]) => record.voterIds.includes(playerId)));
    commit({ ...game, nominations: putRecord(game.nominations, {
      ...record, ghostOverrides: Object.keys(overrides).length ? overrides : undefined,
    }) });
    setVote(null);
    setHistory(null);
  }

  function removeLatestPhase() {
    if (selecting || phase === 'N1' || phase !== game.currentPhase) return;
    setShowPhaseDelete(false);
    commit({
      ...game,
      currentPhase: phaseAt(phaseIndex(phase) - 1),
      memos: game.memos.filter(memo => memo.phaseId !== phase),
      nominations: game.nominations.filter(record => record.phaseId !== phase),
      whispers: whispers.filter(record => record.phaseId !== phase),
      events: game.events.filter(event => event.phaseId !== phase),
    });
    setView(null);
    setHistory(null);
  }

  return <>
    <header className="board-head">
      <div className="board-brand">
        <h1>Liars’ Circle</h1>
        <button type="button" className="eyebrow script-reference-trigger" title={t('시트 캐릭터 설명')}
          aria-label={`${scriptName(game.script, language)} · ${t('캐릭터 설명 보기')}`} onClick={() => setPopup({ kind: 'script' })}>
          <span>{scriptName(game.script, language)}</span><MenuIcon kind="memo" />
        </button>
      </div>
      <div className="phase">
        <button className="icon" aria-label={t('이전 일자')} disabled={phase === 'N1'} onClick={() => navigate(-1)}>‹</button>
        {phase !== 'N1' && phase === game.currentPhase
          ? <button className={showPhaseDelete ? 'phase-label show-delete' : 'phase-label'}
              aria-label={t('{phase} 및 일자 기록 삭제', { phase })}
              onPointerDown={event => {
                phaseTouch.current = event.pointerType === 'touch';
                if (phaseTouch.current) setShowPhaseDelete(true);
              }}
              onPointerUp={event => {
                if (event.pointerType !== 'touch') return;
                setShowPhaseDelete(false);
                const target = document.elementFromPoint(event.clientX, event.clientY);
                if (event.currentTarget.contains(target)) removeLatestPhase();
              }}
              onPointerCancel={() => setShowPhaseDelete(false)}
              onLostPointerCapture={() => setShowPhaseDelete(false)}
              onClick={event => {
                if (!phaseTouch.current || event.detail === 0) removeLatestPhase();
              }}>
              <span className="phase-date">{phase}</span>
              <span className="phase-delete" aria-hidden="true">×</span>
            </button>
          : <strong>{phase}</strong>}
        <button className={phase === game.currentPhase ? 'icon phase-next-new' : 'icon'} aria-label={t('다음 일자')} onClick={() => navigate(1)}>›</button>
      </div>
      <button className="icon board-action" aria-label={t('플레이어 추가')}
        title={count >= MAX_PLAYERS ? t('플레이어 추가 · 최대 {count}명', { count: MAX_PLAYERS }) : t('플레이어 추가')}
        disabled={count >= MAX_PLAYERS} onClick={addPlayer}>
        <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none"
          stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="7" r="3.5" />
          <path d="M2 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2m3-14v6m-3-3h6" />
        </svg>
      </button>
      <button className="icon board-action" aria-label={t('게임 종료')} title={t('게임 종료')}
        onClick={() => setPopup({ kind: 'end' })}>
        <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none"
          stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 17l5-5-5-5m5 5H8m3-9H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6" />
        </svg>
      </button>
    </header>
    <TableBoard game={game} phase={phase} roles={roles} selectedId={selected?.id} vote={vote} whisper={whisper}
      tap={tap} openMemo={openMemo} selecting={selecting} selectSource={selectSource}
      canNominate={canNominate}
      openPlayer={playerId => setPopup({ kind: 'player', playerId })}
      movePlayer={(playerId, seat) => commit(reorderPlayer(game, playerId, seat))}
      completeVote={completeVote} completeWhisper={completeWhisper} />
    <TableHistory nominations={game.nominations} whispers={whispers} history={history} selecting={selecting}
      setHistory={setHistory} name={name} openMemo={() => openMemo()}
      startSelection={beginSelection} isDay={isDay}
      editVote={record => {
        openRecordPhase(record.phaseId);
        setVote({ ...record, step: 1 });
      }}
      editWhisper={record => {
        openRecordPhase(record.phaseId);
        setWhisper(record);
      }}
      deleteVote={id => commit({ ...game, nominations: game.nominations.filter(record => record.id !== id) })}
      deleteWhisper={id => commit({ ...game, whispers: whispers.filter(record => record.id !== id) })} />

    {popup?.kind === 'script' && <ScriptReference name={scriptName(game.script, language)} roles={roles} close={close} />}
    {popup?.kind === 'end' && <Confirmation title={t('게임 종료')}
      message={t('게임을 종료하고 저장된 기록을 삭제할까요?')} close={close} confirm={end} />}
    {popup?.kind === 'player' && selected && <Sheet centered compact title={selected.name} close={close}>
      <div className="stack player-menu">
        {([['profile', '플레이어'], ['alignment', '진영 변경'], ['execution', selectedExecuted ? '처형 취소' : '처형'], ['life', lifeLabel]] as const)
          .filter(([kind]) => isDay || kind !== 'execution')
          .map(([kind, label]) => <button key={kind} className="record-link"
            onClick={() => {
            if (kind === 'alignment') {
              commit({ ...game, players: game.players.map(player => player.id === selected.id
                ? { ...player, alignment: selectedAlignment === 'good' ? 'evil' : 'good' } : player) });
              close();
            } else if (kind === 'execution' || kind === 'life') recordPlayerEvent(selected.id, kind);
            else setPopup({ kind, playerId: selected.id });
          }}>
            <MenuIcon kind={kind === 'life' && !selectedAlive ? 'revival' : kind} />
            <span>{t(label)}{kind === 'alignment' && selectedAlignment && <small> · {t(selectedAlignment === 'good' ? '선' : '악')}</small>}</span>
          </button>)}
      </div>
    </Sheet>}
    {popup?.kind === 'profile' && selected && <Sheet centered title={`${selected.name} · ${t('플레이어')}`} close={close}>
      <div className="player-profile">
        <input aria-label={t('플레이어명')} defaultValue={selected.name} placeholder={`P${selected.seat + 1}`} maxLength={32}
          onChange={event => saveProfile(selected.id, { name: event.target.value })} />
        <label className="check">
          <input type="checkbox" checked={selected.traveller}
            onChange={event => saveProfile(selected.id, { traveller: event.target.checked })} /> {t('여행자')}
        </label>
        <DeleteButton label={t(count <= MIN_PLAYERS ? '플레이어 삭제 · 최소 5명' : '플레이어 삭제')}
          disabled={count <= MIN_PLAYERS} remove={() => setPopup({ kind: 'delete-player', playerId: selected.id })} />
      </div>
    </Sheet>}
    {popup?.kind === 'delete-player' && selected && <Confirmation title={t('플레이어 삭제')}
      message={t('{name}의 좌석을 삭제할까요? 관련 기록도 정리됩니다.', { name: selected.name })}
      close={close} confirm={() => {
        commit(removePlayer(game, selected.id));
        close();
      }} />}
    {popup?.kind === 'character' && selected && <Sheet title={`${selected.name} · ${t('캐릭터')}`} close={close}>
      <div className="role-grid">
        <button className="role" aria-label={t('캐릭터 등록 해제')} title={t('캐릭터 등록 해제')}
          aria-pressed={selected.characterId === undefined}
          onClick={() => { commit({ ...game, players: putCharacter(game, selected.id) }); close(); }} />
        {roles.filter(role => selected.traveller ? role.team === 'traveller'
          : role.team !== 'traveller' && role.team !== 'fabled' && role.team !== 'loric').map(role =>
          <button key={role.id} className="role" data-team={role.team} aria-label={role.name} title={role.name}
            aria-pressed={selected.characterId === role.id}
            onClick={() => { commit({ ...game, players: putCharacter(game, selected.id, role.id) }); close(); }}>
            <Portrait src={role.image} fallback={<span className="role-name">{role.name}</span>} />
          </button>)}
      </div>
    </Sheet>}
    {(popup?.kind === 'general' || (popup?.kind === 'memo' && selected)) && <Sheet centered memo title={selected ? `${selected.name} · ${t('메모')}` : t('공통 메모')} close={close}>
      <div className="memo-timeline">
        {Array.from({ length: phaseIndex(game.currentPhase) + 1 }, (_, index) => {
          const memoPhase = phaseAt(index);
          return <div key={memoPhase} className={memoPhase === phase ? 'viewed-phase' : undefined}>
            <MemoEditor game={game} phase={memoPhase} target={selected ? { target: 'player', playerId: selected.id } : { target: 'general' }}
              label={memoPhase} autoFocus={memoPhase === phase} rows={1} save={saveMemo} />
          </div>;
        })}
      </div>
    </Sheet>}
  </>;
}

function putCharacter(game: Game, playerId: string, characterId?: string) {
  return game.players.map(player => player.id === playerId ? { ...player, characterId } : player);
}

function toggleParticipant(ids: string[], playerId: string) {
  return ids.includes(playerId) ? ids.filter(id => id !== playerId) : [...ids, playerId];
}
