import { Portrait, Sheet } from './Editors.tsx';
import { teams, type Character, type Team } from './model.ts';

const teamLabels: Record<Team, string> = { townsfolk: '마을주민', outsider: '외지인', minion: '하수인', demon: '악마', traveller: '여행자', fabled: '전설', loric: '로릭' };

export function ScriptReference({ name, roles, close }: {
  name: string;
  roles: Character[];
  close: () => void;
}) {
  return <Sheet centered title={`${name} · 캐릭터 설명`} close={close}>
    <div className="script-reference">
      <header className="reference-heading">
        <h2>{name}</h2>
      </header>
      {teams.map(team => {
        const members = roles.filter(role => role.team === team);
        if (!members.length) return null;
        return <section className="reference-group" key={team} aria-label={teamLabels[team]}>
          <h3>{teamLabels[team]} <small>{members.length}</small></h3>
          <ul>
            {members.map(role => <li className="reference-character" key={role.id}>
              <div className="reference-portrait"><Portrait src={role.image} /></div>
              <div>
                <h4>{role.name}</h4>
                <p>{role.ability || '등록된 능력 설명이 없습니다.'}</p>
              </div>
            </li>)}
          </ul>
        </section>;
      })}
    </div>
  </Sheet>;
}
