import korean from './roles.ko.json' with { type: 'json' };
import originalRoles from './roles.json' with { type: 'json' };
import type { Character, Script, Team } from './model.ts';

export type Language = 'ko' | 'en';
export const languageKey = 'liars-circle.language';

type Values = Record<string, string | number>;
const english: Record<string, string> = {
  '플레이어 수': 'Players',
  '캐릭터 시트': 'Script',
  '게임 시작': 'Start game',
  '삭제': 'Delete',
  '{name} 삭제': 'Delete {name}',
  '좌석 {seat} 이름': 'Seat {seat} name',
  '좌석 {seat} 여행자': 'Seat {seat} Traveller',
  '여행자': 'Traveller',
  '권장 인원은 일반 5–15명, 여행자 최대 5명입니다.': 'Recommended: 5–15 regular players and up to 5 Travellers.',
  '2 MB 이하 JSON을 사용하세요.': 'Choose a JSON file no larger than 2 MB.',
  '파일을 읽을 수 없습니다.': 'Unable to read the file.',
  '플레이어': 'Player',
  '플레이어명': 'Player name',
  '진영 변경': 'Change alignment',
  '선': 'Good',
  '악': 'Evil',
  '처형': 'Execution',
  '처형 취소': 'Undo execution',
  '사망': 'Dead',
  '부활': 'Revive',
  '사망 취소': 'Undo death',
  '부활 취소': 'Undo revival',
  '생존': 'Alive',
  '메모': 'Memo',
  '공통 메모': 'General memo',
  '플레이어 메뉴': 'Player menu',
  '플레이어 추가': 'Add player',
  '플레이어 추가 · 최대 {count}명': 'Add player · maximum {count}',
  '플레이어 삭제': 'Remove player',
  '플레이어 삭제 · 최소 5명': 'Remove player · minimum 5 players',
  '{name}의 좌석을 삭제할까요? 관련 기록도 정리됩니다.': 'Remove {name}? Their related records will also be removed.',
  '게임 종료': 'End game',
  '게임을 종료하고 저장된 기록을 삭제할까요?': 'End this game and delete its saved records?',
  '이전 일자': 'Previous phase',
  '다음 일자': 'Next phase',
  '{phase} 및 일자 기록 삭제': 'Delete {phase} and its records',
  '캐릭터': 'Character',
  '캐릭터 등록 해제': 'Clear character',
  '시트 캐릭터 설명': 'Script character reference',
  '캐릭터 설명 보기': 'View character reference',
  '캐릭터 설명': 'Character reference',
  '등록된 능력 설명이 없습니다.': 'No ability description provided.',
  '마을주민': 'Townsfolk',
  '주민': 'Townsfolk',
  '외지인': 'Outsiders',
  '하수인': 'Minions',
  '악마': 'Demons',
  '전설': 'Fabled',
  '로릭': 'Loric',
  '지명·투표': 'Vote',
  '밀담': 'Whisper',
  '기타': 'Other',
  '지명자 선택': 'Choose nominator',
  '피지명자 선택': 'Choose nominee',
  '밀담 인원 선택': 'Choose whisper participants',
  '밀담 기준 플레이어 선택': 'Choose whisper initiator',
  '밀담 상대 선택': 'Choose whisper partners',
  '완료 · {count}표': 'Done · {count} votes',
  '완료 · {count}명': 'Done · {count} partners',
  '기본 역할 구성': 'Default character composition',
  '기본 구성 · 일반 인원 5–15명': 'Default composition · 5–15 regular players',
  '{alive} / {count} 생존': '{alive} / {count} alive',
  '지명자': 'Nominator',
  '지명': 'Nominee',
  '피지명자': 'Nominee',
  '투표': 'Votes',
  '투표자': 'Voter',
  '밀담 기준 플레이어': 'Whisper initiator',
  '없음': 'None',
  '{count}표': '{count} votes',
  '{label} 기록 {count}건': '{label} records: {count}',
  '{label} 기록': '{label} records',
  '{label} 기록 삭제': 'Delete {label} record',
  '예': 'Yes',
  '아니오': 'No',
  '비공식 비상업 팬 프로젝트': 'Unofficial, non-commercial fan project',
  '공식 리소스': 'Official resources',
  '저장 재시도': 'Retry saving',
  '게임 복원 실패 · {error}. 기존 데이터가 보존되어 있습니다.': 'Could not restore game · {error}. Existing data is preserved.',
  '시트 복원 실패 · {error}. 기존 데이터가 보존되어 있습니다.': 'Could not restore scripts · {error}. Existing data is preserved.',
  '저장 공간이 부족합니다. 최신 변경은 이 화면에 남아 있습니다.': 'Storage is full. Your latest changes remain on this screen.',
  '게임을 저장할 수 없습니다. 최신 변경은 이 화면에 남아 있습니다.': 'Could not save the game. Your latest changes remain on this screen.',
  '저장소에서 게임을 종료할 수 없습니다.': 'Could not remove the game from storage.',
  '커스텀 시트를 저장할 수 없습니다. 저장 공간과 브라우저 설정을 확인하세요.': 'Could not save custom scripts. Check storage space and browser settings.',
  '지원하지 않는 데이터 버전 ({version})': 'Unsupported data version ({version})',
  '저장 데이터의 형식이 올바르지 않습니다.': 'Saved data has an invalid format.',
  '알 수 없는 오류': 'Unknown error',
  '올바른 JSON 파일을 선택하세요.': 'Choose a valid JSON file.',
  '스크립트는 캐릭터 항목의 배열이어야 합니다.': 'A script must be an array of character entries.',
  '캐릭터 ID가 올바르지 않습니다.': 'Invalid character ID.',
  '{id}의 이름, 유형 또는 능력을 확인하세요.': 'Check the name, type, and ability of {id}.',
  '{id}의 이미지에는 HTTP(S) URL을 사용하세요.': 'Use an HTTP(S) URL for the image of {id}.',
  '{id} 정의가 중복되었습니다.': 'Duplicate definition: {id}.',
  '알 수 없는 캐릭터 ID: {id}': 'Unknown character ID: {id}',
  '시트에 캐릭터가 없습니다.': 'The script has no characters.',
  '다른 창에서 앱을 편집 중입니다. 이 창에서는 저장할 수 없습니다. 편집 중인 창을 닫고 새로고침하세요.': 'This app is being edited in another tab. Saving is disabled here. Close the editing tab and reload.',
  '다른 창에서 데이터가 변경되었습니다. 이 화면의 내용은 유지되며 저장은 중단됩니다. 최신 내용을 확인하려면 새로고침하세요.': 'Data changed in another tab. This screen is preserved and saving has stopped. Reload to view the latest data.',
  '언어': 'Language',
};

export function translate(language: Language, message: string, values: Values = {}) {
  const text = language === 'en' && Object.hasOwn(english, message) ? english[message] : message;
  return text.replace(/\{(\w+)\}/g, (placeholder, key: string) => String(values[key] ?? placeholder));
}

// Compile message patterns once rather than on every error render.
const errorPatterns = Object.keys(english).filter(key => key.includes('{')).map(key => {
  const names: string[] = [];
  const pattern = key.split(/(\{\w+\})/g).map(part => {
    if (/^\{\w+\}$/.test(part)) { names.push(part.slice(1, -1)); return '(.+?)'; }
    return part.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
  }).join('');
  return { key, names, regex: new RegExp('^' + pattern + '$') };
});

export function localizeError(language: Language, message: string) {
  if (language === 'ko' || Object.hasOwn(english, message)) return translate(language, message);
  for (const { key, names, regex } of errorPatterns) {
    const match = message.match(regex);
    if (match) return translate(language, key, Object.fromEntries(names.map((name, i) => [name, match[i + 1]])));
  }
  return message;
}

const koreanRoles: Record<string, { name: string; ability: string }> = korean.roles;
const originals = new Map(originalRoles.map(role => [role.id, role]));
export function localizeCharacter(role: Character, language: Language): Character {
  const original = originals.get(role.id);
  const translated = koreanRoles[role.id];
  if (language !== 'ko' || !translated || role.name !== original?.name || role.ability !== original?.ability) return role;
  return { ...role, name: translated.name, ability: translated.ability };
}

const editionNames: Record<string, string> = korean.editions;
const englishEditions: Record<string, string> = { tb: 'Trouble Brewing', bmr: 'Bad Moon Rising', snv: 'Sects & Violets' };
export function scriptName(script: Script, language: Language) {
  return language === 'ko' && script.name === englishEditions[script.id] ? editionNames[script.id] : script.name;
}

export const teamLabels: Record<Team, string> = {
  townsfolk: '마을주민', outsider: '외지인', minion: '하수인', demon: '악마',
  traveller: '여행자', fabled: '전설', loric: '로릭',
};
