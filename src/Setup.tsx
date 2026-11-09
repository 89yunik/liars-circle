import { useLanguage } from './Language.tsx';
import { localizeError, scriptName } from './locale.ts';
import { useEffect, useRef, useState } from 'react';
import { MAX_PLAYERS, MIN_PLAYERS, newGame, type Game, type Script } from './model.ts';
import { officialScripts, parseScript } from './scripts.ts';

export function Setup({ library, update, start, blocked, libraryBlocked }: {
  library: Script[];
  update: (scripts: Script[]) => boolean;
  start: (game: Game) => void;
  blocked: boolean;
  libraryBlocked: boolean;
}) {
  const { t, language } = useLanguage();
  const [seats, setSeats] = useState(Array.from({ length: MAX_PLAYERS }, () => ({ name: '', traveller: false })));
  const [count, setCount] = useState(15);
  const [sheet, setSheet] = useState('tb');
  const [error, setError] = useState('');
  const importInput = useRef<HTMLInputElement>(null);
  const sheetPicker = useRef<HTMLDetailsElement>(null);
  const sheetTrigger = useRef<HTMLElement>(null);
  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      const picker = sheetPicker.current;
      if (picker?.open && event.target instanceof Node && !picker.contains(event.target)) picker.open = false;
    }
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, []);

  function closeSheetPicker() {
    if (sheetPicker.current) sheetPicker.current.open = false;
    sheetTrigger.current?.focus();
  }

  const selected = [...officialScripts, ...library].find(script => script.id === sheet) ?? officialScripts[0];
  const travellers = seats.slice(0, count).filter(seat => seat.traveller).length;
  function changeSeat(index: number, seat: typeof seats[number]) {
    setSeats(previous => previous.map((current, i) => i === index ? seat : current));
  }

  return <section className="setup">
    <form onSubmit={event => {
      event.preventDefault();
      if (!blocked) start(newGame(selected, seats.slice(0, count)));
    }}>
      <div className="setup-options">
        <label>{t('플레이어 수')}<select value={count} onChange={event => setCount(Number(event.target.value))}>
          {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => <option key={i + MIN_PLAYERS}>{i + MIN_PLAYERS}</option>)}
        </select></label>
        <div className="sheet-field">
          <span id="setup-sheet-label">{t('캐릭터 시트')}</span>
          <details className="sheet-picker" ref={sheetPicker} onKeyDown={event => {
            if (event.key === 'Escape' && event.currentTarget.open) {
              event.preventDefault();
              closeSheetPicker();
            }
          }} onBlur={event => {
            if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
          }}>
            <summary ref={sheetTrigger} aria-labelledby="setup-sheet-label setup-sheet-value">
              <span id="setup-sheet-value">{scriptName(selected, language)}</span>
            </summary>
            <div className="sheet-picker-list">
              {officialScripts.map(script => <button key={script.id} type="button" aria-pressed={selected.id === script.id}
                onClick={() => { setSheet(script.id); closeSheetPicker(); }}>{scriptName(script, language)}</button>)}
              <button type="button" disabled={libraryBlocked} onClick={() => {
                closeSheetPicker();
                importInput.current?.click();
              }}>Custom sheets...</button>
              {library.map(script => <div className="sheet-picker-row" key={script.id}>
                <button type="button" aria-pressed={selected.id === script.id}
                  onClick={() => { setSheet(script.id); closeSheetPicker(); }}>{scriptName(script, language)}</button>
                <button type="button" className="danger sheet-remove" aria-label={t('{name} 삭제', { name: scriptName(script, language) })} onClick={() => {
                  if (update(library.filter(item => item.id !== script.id))) {
                    closeSheetPicker();
                    if (selected.id === script.id) {
                      setSheet(officialScripts[0].id);
                    }
                  }
                }}>×</button>
              </div>)}
            </div>
          </details>
        </div>
        <button type="submit" className="primary setup-start" aria-label={t('게임 시작')} title={t('게임 시작')} disabled={blocked}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M7 4v16l13-8z" />
          </svg>
        </button>
      </div>
      <input ref={importInput} type="file" hidden accept=".json,application/json" disabled={libraryBlocked} onChange={async event => {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = '';
        if (!file) return;
        setError('');
        try {
          if (file.size > 2_000_000) throw new Error('2 MB 이하 JSON을 사용하세요.');
          const script = parseScript(await file.text(), file.name);
          if (update([...library, script])) setSheet(script.id);
        } catch (error) { setError(error instanceof Error ? error.message : '파일을 읽을 수 없습니다.'); }
      }} />
      {error && <p className="notice" role="alert">{localizeError(language, error)}</p>}
      <div className="seat-list">
        <div className="traveller-heading">{t('여행자')}</div>
        {seats.slice(0, count).map((seat, index) => <div className="seat-row" key={index}>
          <span className="seat-number">{String(index + 1).padStart(2, '0')}</span>
          <input aria-label={t('좌석 {seat} 이름', { seat: index + 1 })} placeholder={`P${index + 1}`} maxLength={32}
            value={seat.name} onChange={event => changeSeat(index, { ...seat, name: event.target.value })} />
          <label className="check"><input type="checkbox" aria-label={t('좌석 {seat} 여행자', { seat: index + 1 })} checked={seat.traveller}
            onChange={event => changeSeat(index, { ...seat, traveller: event.target.checked })} /></label>
        </div>)}
      </div>
      {(count - travellers > 15 || count - travellers < 5 || travellers > 5) &&
        <p className="notice">{t('권장 인원은 일반 5–15명, 여행자 최대 5명입니다.')}</p>}
    </form>
  </section>;
}
