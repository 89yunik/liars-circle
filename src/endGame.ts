import type { Game } from './model.ts';
import { StorageConflictError } from './persistence.ts';

// Save reusable player settings first. If either step fails, the caller retains
// the active game in memory and can retry with the stores' updated revisions.
export function endStoredGame(
  store: { isCurrent: () => boolean; remove: () => void },
  game: Game | null,
  savePlayers: (game: Game) => void,
) {
  if (!store.isCurrent()) throw new StorageConflictError();
  if (game) savePlayers(game);
  store.remove();
}
