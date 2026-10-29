import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Team = { _id?: string; name: string; mascot: string; members: unknown[] };

export default function Teams() {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    getJson<{ teams: Team[] }>('/api/teams')
      .then(({ teams: result }) => { if (active) setTeams(result); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, []);

  return <section className="card h-100"><div className="card-body">
    <h2 className="h4">Teams</h2>
    <p>Manage teams and members.</p>
    {error ? <p role="alert">Unable to load teams. Please try again.</p>
      : teams === null ? <p role="status">Loading teams...</p>
        : teams.length === 0 ? <p role="status">No teams yet.</p>
          : <ul className="list-group list-group-flush">{teams.map((team, index) => <li className="list-group-item px-0" key={team._id ?? `${team.name}-${index}`}>
            <strong>{team.name}</strong>
            <span className="ms-2">Mascot: {team.mascot}</span>
            <span className="ms-2">{team.members.length} members</span>
          </li>)}</ul>}
  </div></section>;
}
