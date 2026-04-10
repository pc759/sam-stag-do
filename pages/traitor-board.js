import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import styles from '../styles/TraitorBoard.module.css';

const MarkdownRenderer = dynamic(() => import('../components/MarkdownRenderer'), { ssr: false });

export default function TraitorBoard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [cmsPage, setCmsPage] = useState(null);

  useEffect(() => {
    const load = async () => {
      const authRes = await fetch('/api/check-auth');
      if (authRes.status === 401) {
        router.push('/login');
        return;
      }
      const authData = await authRes.json();
      if (!authData.user?.traitorChannelAccess) {
        router.push('/');
        return;
      }
      setUser(authData.user);
      setIsAuthenticated(true);
      try { const cmsRes = await fetch('/api/pages?slug=traitor-board'); if (cmsRes.ok) setCmsPage(await cmsRes.json()); } catch (e) { /* silent */ }

      const res = await fetch('/api/traitor-board');
      if (res.status === 403) {
        router.push('/');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
      setIsLoading(false);
    };
    load();
  }, [router]);

  const send = async (e) => {
    e.preventDefault();
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    const res = await fetch('/api/traitor-board', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: text })
    });
    if (res.ok) {
      setBody('');
      const refresh = await fetch('/api/traitor-board');
      if (refresh.ok) {
        const data = await refresh.json();
        setPosts(data.posts || []);
      }
    }
    setSending(false);
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading…</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Layout isAuthenticated={isAuthenticated} user={user}>
      <div className={styles.container}>
        <h1>{cmsPage?.title || "Traitors' channel"}</h1>
        <p className={styles.hint}>
          {cmsPage?.subtitle || "Private to players with the traitor tag. Don't share your screen with faithfuls."}
        </p>
        {cmsPage?.body?.trim() && (
          <div style={{marginBottom:'1rem'}}><MarkdownRenderer content={cmsPage.body} /></div>
        )}
        <form className={styles.composer} onSubmit={send}>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Message the other traitors…"
            maxLength={8000}
          />
          <button type="submit" disabled={sending || !body.trim()}>
            {sending ? 'Sending…' : 'Post'}
          </button>
        </form>
        <div className={styles.posts}>
          {posts.map((p) => (
            <article key={p.id} className={styles.post}>
              <header>
                <strong>{p.authorName}</strong>
                <span> · {new Date(p.createdAt).toLocaleString()}</span>
              </header>
              <p>{p.body}</p>
            </article>
          ))}
        </div>
        {posts.length === 0 ? <p className={styles.hint}>No messages yet.</p> : null}
      </div>
    </Layout>
  );
}
