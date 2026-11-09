import { LanguageProvider, LanguageSwitcher, useLanguage } from './Language.tsx';
import { localizeError } from './locale.ts';
import { createRoot } from 'react-dom/client';
import { Setup } from './Setup.tsx';
import { Table } from './Table.tsx';
import { useGame } from './useGame.ts';
import './style.css';

function App() {
  const state = useGame();
  const { t, language } = useLanguage();
  return <main className={state.game ? 'active-game' : 'game-setup'}>
    {!state.game && <header className="board-head">
      <div className="board-brand"><h1>Liars’ Circle</h1></div>
    </header>}
    {state.restoreError && <p role="alert" className="notice">{t('게임 복원 실패 · {error}. 기존 데이터가 보존되어 있습니다.', { error: localizeError(language, state.restoreError) })}</p>}
    {state.restoreLibraryError && <p role="alert" className="notice">{t('시트 복원 실패 · {error}. 기존 데이터가 보존되어 있습니다.', { error: localizeError(language, state.restoreLibraryError) })}</p>}
    {state.error && <div role="alert" className="notice sticky-error">{localizeError(language, state.error)} <button onClick={state.flush}>{t('저장 재시도')}</button></div>}
    {state.libraryError && <p role="alert" className="notice">{localizeError(language, state.libraryError)}</p>}
    {state.game ? <Table key={state.game.id} game={state.game} commit={state.commit} flush={state.flush} end={state.end} /> :
      <Setup library={state.library} update={state.updateLibrary} start={state.commit}
        blocked={!!state.restoreError} libraryBlocked={!!state.restoreLibraryError} />}
    <footer>
      <img src="./botc/ccc.png" alt="Blood on the Clocktower Community Created Content" />
      <p>{t('비공식 비상업 팬 프로젝트')} · Blood on the Clocktower © The Pandemonium Institute</p>
      <a href="https://release.botc.app/resources/">{t('공식 리소스')}</a>
      <LanguageSwitcher />
    </footer>
  </main>;
}

createRoot(document.getElementById('root')!).render(<LanguageProvider><App /></LanguageProvider>);
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(error => console.warn('Offline installation failed', error));
  });
}
