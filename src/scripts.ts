import { isHttpImageUrl, isObject } from './validation.ts';
import roles from './roles.json' with { type: 'json' };
import alignmentIcons from './alignment-icons.json' with { type: 'json' };
import { id, MAX_SCRIPT_ENTRIES, teams, type Alignment, type Character, type Script, type Team } from './model.ts';

const icons: Record<string, Partial<Record<Alignment, string>>> = alignmentIcons;
const catalog = new Map<string, Character>(roles.map(role => [role.id, {
  ...role, team: role.team as Team, alignmentImages: icons[role.id],
}]));

export function characterImage(character: Character | undefined, alignment?: Alignment) {
  return (alignment && character?.alignmentImages?.[alignment]) || character?.image;
}
export const officialScripts: Script[] = [
  ['tb', 'Trouble Brewing'], ['bmr', 'Bad Moon Rising'], ['snv', 'Sects & Violets'],
].map(([edition, name]) => ({
  id: edition, name, homebrew: [],
  characterIds: roles.filter(role => role.edition === edition).map(role => role.id),
}));

export function characters(script: Script) {
  const custom = new Map(script.homebrew.map(role => [role.id, role]));
  return script.characterIds.flatMap(key => custom.get(key) ?? catalog.get(key) ?? []);
}

export function parseScript(raw: string, filename: string): Script {
  let input: unknown;
  try { input = JSON.parse(raw); }
  catch { throw new Error('올바른 JSON 파일을 선택하세요.'); }
  if (!Array.isArray(input) || !input.length || input.length > MAX_SCRIPT_ENTRIES) throw new Error('스크립트는 캐릭터 항목의 배열이어야 합니다.');
  let name = filename.replace(/\.json$/i, '') || '커스텀 시트';
  const characterIds = new Set<string>();
  const homebrew: Character[] = [];
  for (const entry of input) {
    const key = typeof entry === 'string' ? entry : isObject(entry) ? entry.id : undefined;
    if (key === '_meta' && isObject(entry)) {
      if (typeof entry.name === 'string' && entry.name.trim()) name = entry.name.trim();
      continue;
    }
    if (typeof key !== 'string' || !/^[a-z0-9_-]+$/i.test(key)) throw new Error('캐릭터 ID가 올바르지 않습니다.');
    const known = catalog.has(key);
    if (isObject(entry) && ('name' in entry || 'team' in entry || 'ability' in entry || 'image' in entry)) {
      const base = catalog.get(key);
      const role = { ...base, ...entry };
      if (typeof role.name !== 'string' || !role.name.trim() || typeof role.ability !== 'string' || !teams.some(team => team === role.team)) {
        throw new Error(`${key}의 이름, 유형 또는 능력을 확인하세요.`);
      }
      const suppliedImage = role.image;
      const image = Array.isArray(suppliedImage) ? suppliedImage[0] : suppliedImage;
      if (entry.image !== undefined && !isHttpImageUrl(image)) {
        throw new Error(`${key}의 이미지에는 HTTP(S) URL을 사용하세요.`);
      }
      if (homebrew.some(role => role.id === key)) throw new Error(`${key} 정의가 중복되었습니다.`);
      homebrew.push({ id: key, name: role.name, team: role.team as Team, ability: role.ability, image: typeof image === 'string' ? image : undefined });
    } else if (!known) {
      throw new Error(`알 수 없는 캐릭터 ID: ${key}`);
    }
    characterIds.add(key);
  }
  if (!characterIds.size) throw new Error('시트에 캐릭터가 없습니다.');
  return { id: id(), name, characterIds: [...characterIds], homebrew };
}
