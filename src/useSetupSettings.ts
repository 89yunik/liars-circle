import { useRef, useState, type RefObject } from 'react';
import { restoreSetupSettings, setupSettingsKey, isSetupSettings } from './storage.ts';
import { createStoredValue, StorageConflictError } from './persistence.ts';
import { setupFromGame, type SetupSettings } from './setupSettings.ts';
import type { Game } from './model.ts';

export function useSetupSettings(allowed: RefObject<boolean>) {
  const [initial] = useState(restoreSetupSettings);
  const [settings, setSettings] = useState(initial.value);
  const current = useRef(settings);
  const [store] = useState(() => createStoredValue<SetupSettings>(setupSettingsKey, initial.raw, isSetupSettings));
  const [error, setError] = useState(initial.error);

  function save(next: SetupSettings) {
    store.write(next);
    current.current = next;
    setSettings(next);
    setError('');
  }
  function update(next: SetupSettings) {
    if (!allowed.current) return;
    try { save(next); }
    catch (error) {
      setError(error instanceof StorageConflictError ? error.message : '플레이어 이름을 저장할 수 없습니다.');
    }
  }
  // Propagate failures so ending the game never removes it before names are saved.
  function saveGamePlayers(game: Game) {
    save(setupFromGame(current.current, game));
  }
  return { settings, update, saveGamePlayers, error };
}
