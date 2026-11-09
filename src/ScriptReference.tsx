import { useLanguage } from './Language.tsx';
import { teamLabels } from './locale.ts';
import { Portrait, Sheet } from './Editors.tsx';
import { teams, type Character } from './model.ts';

export function ScriptReference({ name, roles, close }: {
  name: string;
  roles: Character[];
  close: () => void;
}) {
  const { t } = useLanguage();
  return <Sheet centered title={`${name} · ${t('캐릭터 설명')}`} close={close}>
    <div className="script-reference">
      <header className="reference-heading">
        <h2>{name}</h2>
      </header>
      {teams.map(team => {
        const members = roles.filter(role => role.team === team);
        if (!members.length) return null;
        return <section className="reference-group" key={team} aria-label={t(teamLabels[team])}>
          <h3>{t(teamLabels[team])} <small>{members.length}</small></h3>
          <ul>
            {members.map(role => <li className="reference-character" key={role.id}>
              <div className="reference-portrait"><Portrait src={role.image} /></div>
              <div>
                <h4>{role.name}</h4>
                <p>{role.ability || t('등록된 능력 설명이 없습니다.')}</p>
              </div>
            </li>)}
          </ul>
        </section>;
      })}
    </div>
  </Sheet>;
}
