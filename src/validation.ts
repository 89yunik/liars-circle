import { MAX_PHASES, phaseIndex, type PhaseId } from './model.ts';

export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isHttpImageUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) return false;
  try {
    const url = new URL(value);
    return !!url.hostname && !url.username && !url.password;
  } catch { return false; }
}

export function isImageUrl(value: unknown): value is string {
  return typeof value === 'string' && (/^\.\/botc\/[a-z0-9_-]+\.webp$/i.test(value) || isHttpImageUrl(value));
}

export function isPhase(value: unknown): value is PhaseId {
  return typeof value === 'string' && /^[ND][1-9]\d*$/.test(value) &&
    phaseIndex(value as PhaseId) < MAX_PHASES;
}
