import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/Layout';
import styles from '../styles/Votes.module.css';

export default function VotesList() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [votes, setVotes] = useState([]);

  useEffect(() => {
    const load = async () => {
      const authRes = await fetch('/api/check-auth');
      if (authRes.status === 401) {
        router.push('/login');
        return;
      }
      const authData = await authRes.json();
      setUser(authData.user);
      setIsAuthenticated(true);

      const res = await fetch('/api/votes');
      if (res.ok) {
        const data = await res.json();
        setVotes(data.votes || []);
      }
      setIsLoading(false);
    };
    load();
  }, [router]);

  if (isLoading) {
    return <div className={styles.loading}>Loading…</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Layout isAuthenticated={isAuthenticated} user={user}>
      <div className={styles.container}>
        <h1>Votes</h1>
        <p className={styles.intro}>
          Cast your vote while a round is open. You won&apos;t see who anyone else voted for. After a vote
          closes, everyone sees totals only.
        </p>
        {votes.length === 0 ? (
          <p>No votes yet.</p>
        ) : (
          <ul className={styles.list}>
            {votes.map((v) => (
              <li key={v.id}>
                <Link href={`/votes/${v.id}`} className={styles.cardLink}>
                  <strong>{v.title || `Vote #${v.id}`}</strong>
                  <div className={styles.cardMeta}>
                    <span className={v.status === 'open' ? styles.statusOpen : styles.statusClosed}>
                      {v.status === 'open' ? 'Open' : 'Closed'}
                    </span>
                    {v.status === 'closed' && v.results?.length ? (
                      <span>{v.results.reduce((s, r) => s + r.count, 0)} votes cast</span>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
}
