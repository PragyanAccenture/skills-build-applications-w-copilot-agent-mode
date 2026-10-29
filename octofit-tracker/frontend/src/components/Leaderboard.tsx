import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Standing = { teamName: string; totalPoints: number; rank: number };

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<Standing[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    getJson<{ leaderboard: Standing[] }>('/api/leaderboard')
      .then(({ leaderboard: result }) => { if (active) setLeaderboard(result); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, []);

  return <section className="card h-100"><div className="card-body">
    <h2 className="h4">Leaderboard</h2>
    <p>Compare team point totals.</p>
    {error ? <p role="alert">Unable to load leaderboard. Please try again.</p>
      : leaderboard === null ? <p role="status">Loading leaderboard...</p>
        : leaderboard.length === 0 ? <p role="status">No rankings yet.</p>
          : <ol className="list-group list-group-numbered list-group-flush">{leaderboard.map((standing) => <li className="list-group-item d-flex justify-content-between px-0" key={standing.rank}>
            <span>{standing.teamName}</span><strong>{standing.totalPoints} points</strong>
          </li>)}</ol>}
  </div></section>;
}
