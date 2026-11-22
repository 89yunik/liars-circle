import { useWriteLock } from './useWriteLock.ts';
import { useGameStorage } from './useGameStorage.ts';
import { useScriptLibrary } from './useScriptLibrary.ts';
import { useSetupSettings } from './useSetupSettings.ts';

export function useGame() {
  const { allowed, readOnly } = useWriteLock();
  const active = useGameStorage(allowed);
  const scripts = useScriptLibrary(allowed);
  const setup = useSetupSettings(allowed);

  return {
    game: active.game, commit: active.commit, flush: active.flush,
    end: () => active.end(setup.saveGamePlayers),
    error: active.error, restoreError: active.restoreError,
    library: scripts.library, updateLibrary: scripts.update,
    libraryError: scripts.error, restoreLibraryError: scripts.restoreError,
    setupSettings: setup.settings, updateSetupSettings: setup.update, namesError: setup.error,
    readOnly,
  };
}
