import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import styles from '../../styles/Attendee.module.css';

export default function AttendeeDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionUser, setSessionUser] = useState(null);
  const [attendee, setAttendee] = useState(null);
  const [allTags, setAllTags] = useState([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      const authRes = await fetch('/api/check-auth');
      if (authRes.status === 401) {
        router.push('/login');
        return;
      }

      const authData = await authRes.json();
      setSessionUser(authData.user);
      setIsAuthenticated(true);

      const attendeeRes = await fetch(`/api/attendees/${id}`);
      if (!attendeeRes.ok) {
        router.push('/roster');
        return;
      }

      const attendeeData = await attendeeRes.json();
      setAttendee(attendeeData);

      if (authData.user?.isAdmin) {
        const tagsRes = await fetch('/api/admin/tags');
        if (tagsRes.ok) {
          const tagsData = await tagsRes.json();
          setAllTags(tagsData);
        }
      }

      setIsLoading(false);
    };

    load();
  }, [id, router]);

  const canEdit = Boolean(
    sessionUser &&
      attendee &&
      (sessionUser.isAdmin || Number(sessionUser.id) === Number(attendee.id))
  );

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  const saveAttendee = async (e) => {
    e.preventDefault();
    if (!attendee) return;

    const res = await fetch(`/api/attendees/${attendee.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: attendee.name,
        photoUrl: attendee.photoUrl,
        connection: attendee.connection,
        memories: attendee.memories
      })
    });

    setStatus(res.ok ? 'Saved profile.' : 'Failed to save profile.');
  };

  const toggleTag = async (tagId, enabled) => {
    if (!sessionUser?.isAdmin || !attendee) return;

    const res = await fetch('/api/admin/user-tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: attendee.id, tagId, enabled })
    });

    if (!res.ok) {
      setStatus('Failed to update tag.');
      return;
    }

    const targetTag = allTags.find((tag) => tag.id === tagId);
    if (!targetTag) return;

    setAttendee((prev) => {
      const currentTags = prev.tags || [];
      if (enabled) {
        if (currentTags.some((tag) => tag.id === tagId)) {
          return prev;
        }
        return { ...prev, tags: [...currentTags, targetTag] };
      }
      return { ...prev, tags: currentTags.filter((tag) => tag.id !== tagId) };
    });
    setStatus('Tag updated.');
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!isAuthenticated || !attendee) {
    return null;
  }

  return (
    <Layout isAuthenticated={isAuthenticated} user={sessionUser}>
      <div className={styles.container}>
        <button type="button" className={styles.backBtn} onClick={goBack}>
          ← Back
        </button>
        <h1>{attendee.name}</h1>

        <div
          className={`${styles.avatarWrap} ${attendee.photoOverlay === 'murdered' ? styles.avatarMurdered : ''}`}
        >
          {attendee.photoUrl ? (
            <img src={attendee.photoUrl} alt={attendee.name} className={styles.avatar} />
          ) : (
            <div className={styles.avatarPlaceholder}>{attendee.name?.[0] || '?'}</div>
          )}
        </div>

        {sessionUser?.isAdmin && (
          <p className={styles.mobileRow}>
            <strong>Mobile:</strong> {attendee.mobile || 'No mobile set'}
          </p>
        )}

        <div className={styles.badges}>
          {(attendee.tags || []).map((tag) => (
            <span key={tag.id} className={styles.badge} style={{ background: tag.badgeColor }}>
              {tag.icon} {tag.name}
            </span>
          ))}
        </div>

        {sessionUser?.isAdmin && (
          <section className={styles.tagManager}>
            <h2>Manage Tags</h2>
            <div className={styles.tagButtons}>
              {allTags.map((tag) => {
                const hasTag = (attendee.tags || []).some((assigned) => assigned.id === tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    className={hasTag ? styles.tagOn : styles.tagOff}
                    onClick={() => toggleTag(tag.id, !hasTag)}
                    style={hasTag ? { background: tag.badgeColor } : undefined}
                  >
                    {tag.icon} {tag.name} {hasTag ? '✓' : '+'}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {canEdit ? (
          <form className={styles.form} onSubmit={saveAttendee}>
            <label>
              Name
              <input
                value={attendee.name || ''}
                onChange={(e) => setAttendee({ ...attendee, name: e.target.value })}
              />
            </label>
            <label>
              Photo URL
              <input
                value={attendee.photoUrl || ''}
                onChange={(e) => setAttendee({ ...attendee, photoUrl: e.target.value })}
              />
            </label>
            <label>
              Connection to Sam
              <input
                value={attendee.connection || ''}
                onChange={(e) => setAttendee({ ...attendee, connection: e.target.value })}
              />
            </label>
            <label>
              Memories / Thoughts
              <textarea
                rows="7"
                value={attendee.memories || ''}
                onChange={(e) => setAttendee({ ...attendee, memories: e.target.value })}
              />
            </label>
            <button type="submit">Save</button>
            {status && <p className={styles.status}>{status}</p>}
          </form>
        ) : (
          <div className={styles.readOnly}>
            <p><strong>Connection:</strong> {attendee.connection || 'Not set yet'}</p>
            <p><strong>Memories:</strong> {attendee.memories || 'No memories added yet.'}</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
