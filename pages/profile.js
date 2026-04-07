import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import styles from '../styles/Profile.module.css';

export default function Profile() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const load = async () => {
      const authRes = await fetch('/api/check-auth');
      if (authRes.status === 401) {
        router.push('/login');
        return;
      }
      const authData = await authRes.json();
      setIsAuthenticated(true);

      const profileRes = await fetch('/api/profile');
      const profile = await profileRes.json();
      setUser({ ...authData.user, ...profile });
      setIsLoading(false);
    };
    load();
  }, [router]);

  const saveProfile = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: user.name,
        photoUrl: user.photoUrl,
        connection: user.connection,
        memories: user.memories
      })
    });
    if (res.ok) {
      setStatus('Saved profile.');
      const profileRes = await fetch('/api/profile');
      if (profileRes.ok) {
        const profile = await profileRes.json();
        setUser((u) => ({ ...u, ...profile }));
      }
    } else {
      setStatus('Failed to save profile.');
    }
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <Layout isAuthenticated={isAuthenticated} user={user}>
      <div className={styles.container}>
        <h1>Your Profile</h1>
        {user.tags && user.tags.length > 0 ? (
          <div className={styles.tagBadges} aria-label="Your tags">
            {user.tags.map((tag) => (
              <span key={tag.id} className={styles.tagBadge} style={{ background: tag.badgeColor }}>
                {tag.icon} {tag.name}
              </span>
            ))}
          </div>
        ) : null}
        {user.photoUrl ? (
          <div
            className={`${styles.avatarWrap} ${user.photoOverlay === 'murdered' ? styles.avatarMurdered : ''}`}
          >
            <img src={user.photoUrl} alt="" className={styles.avatar} />
          </div>
        ) : null}
        <form className={styles.form} onSubmit={saveProfile}>
          <label>
            Name
            <input value={user.name || ''} onChange={(e) => setUser({ ...user, name: e.target.value })} />
          </label>
          <label>
            Photo URL
            <input
              value={user.photoUrl || ''}
              onChange={(e) => setUser({ ...user, photoUrl: e.target.value })}
              placeholder="https://..."
            />
          </label>
          <label>
            How are you connected to Sam?
            <input
              value={user.connection || ''}
              onChange={(e) => setUser({ ...user, connection: e.target.value })}
            />
          </label>
          <label>
            Memories / Thoughts
            <textarea
              rows="6"
              value={user.memories || ''}
              onChange={(e) => setUser({ ...user, memories: e.target.value })}
            />
          </label>
          <button type="submit">Save Profile</button>
          {status && <p>{status}</p>}
        </form>
      </div>
    </Layout>
  );
}
