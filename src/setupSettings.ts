import { MAX_PLAYERS, type Game } from './model.ts';

export interface SetupSettings {
  count: number;
  names: string[];
}

export function defaultSetupSettings(): SetupSettings {
  return { count: 15, names: Array(MAX_PLAYERS).fill('') };
}

export function changeSetupName(settings: SetupSettings, index: number, name: string): SetupSettings {
  return { ...settings, names: settings.names.map((current, seat) => seat === index ? name : current) };
}

export function setupFromGame(settings: SetupSettings, game: Game): SetupSettings {
  const names = [...settings.names];
  game.players.forEach(player => { names[player.seat] = player.name; });
  return { count: game.players.length, names };
}
