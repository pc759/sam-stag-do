import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/Layout';
import styles from '../styles/Roster.module.css';

export default function Roster() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [newUser, setNewUser] = useState({ name: '', mobile: '', password: '' });
  const [status, setStatus] = useState('');

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

      await fetchRoster();
      setIsLoading(false);
    };
    load();
  }, [router]);

  const fetchRoster = async () => {
    const rosterRes = await fetch('/api/roster');
    const roster = await rosterRes.json();
    setAttendees(roster);
  };

  const handleAddAttendee = async (e) => {
    e.preventDefault();
    setStatus('');
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    });

    if (res.ok) {
      setStatus('Attendee added.');
      setNewUser({ name: '', mobile: '', password: '' });
      await fetchRoster();
      return;
    }

    setStatus('Could not add attendee. Check mobile uniqueness.');
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Layout isAuthenticated={isAuthenticated} user={user}>
      <div className={styles.container}>
        <h1>Attendee Roster</h1>

        {user?.isAdmin && (
          <section className={styles.addPanel}>
            <h2>Add Attendee</h2>
            <form className={styles.addForm} onSubmit={handleAddAttendee}>
              <input
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="Name"
              />
              <input
                value={newUser.mobile}
                onChange={(e) => setNewUser({ ...newUser, mobile: e.target.value })}
                placeholder="Mobile"
              />
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="Initial password"
              />
              <button type="submit">Add</button>
            </form>
            {status && <p className={styles.status}>{status}</p>}
          </section>
        )}

        <div className={styles.grid}>
          {attendees.map((attendee) => (
            <article key={attendee.id} className={styles.card}>
              <div
                className={`${styles.avatarWrap} ${attendee.photoOverlay === 'murdered' ? styles.avatarMurdered : ''}`}
              >
                {attendee.photoUrl ? (
                  <img src={attendee.photoUrl} alt={attendee.name} className={styles.avatar} />
                ) : (
                  <div className={styles.avatarPlaceholder}>{attendee.name?.[0] || '?'}</div>
                )}
              </div>
              <h3>{attendee.name}</h3>
              <p className={styles.connection}>{attendee.connection || 'Connection not set yet'}</p>
              {attendee.memories && <p className={styles.memories}>{attendee.memories}</p>}
              <div className={styles.badges}>
                {(attendee.tags || []).map((tag) => (
                  <span key={tag.id} className={styles.badge} style={{ background: tag.badgeColor }}>
                    {tag.icon} {tag.name}
                  </span>
                ))}
              </div>
              <Link href={`/attendees/${attendee.id}`} className={styles.viewLink}>
                View Profile
              </Link>
            </article>
          ))}
        </div>
      </div>
    </Layout>
  );
}
