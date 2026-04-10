import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import styles from '../styles/TraitorBoard.module.css';
import pageStyles from '../styles/Page.module.css';

const MarkdownRenderer = dynamic(() => import('../components/MarkdownRenderer'), { ssr: false });

export default function TraitorBoard() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [cmsPage, setCmsPage] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { router.push('/login'); return; }
    if (!user?.traitorChannelAccess) { router.push('/'); return; }

    const loadData = async () => {
      try { const cmsRes = await fetch('/api/pages?slug=traitor-board'); if (cmsRes.ok) setCmsPage(await cmsRes.json()); } catch (e) { /* silent */ }
      const res = await fetch('/api/traitor-board');
      if (res.status === 403) { router.push('/'); return; }
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
      setDataLoading(false);
    };
    loadData();
  }, [authLoading, isAuthenticated, user, router]);

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

  if (authLoading || dataLoading) {
    return <div className={styles.loading}>Loading\u2026</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Layout>
      <div className={styles.container}>
        <div className={pageStyles.contentCard}>
          <h1>{cmsPage?.title || "Traitors' channel"}</h1>
          <p className={styles.hint}>
            {cmsPage?.subtitle || "Private to players with the traitor tag. Don't share your screen with faithfuls."}
          </p>
          {cmsPage?.body?.trim() && (
            <div className={pageStyles.prose}><MarkdownRenderer content={cmsPage.body} /></div>
          )}
        </div>
        <form className={styles.composer} onSubmit={send}>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Message the other traitors\u2026"
            maxLength={8000}
          />
          <button type="submit" disabled={sending || !body.trim()}>
            {sending ? 'Sending\u2026' : 'Post'}
          </button>
        </form>
        <div className={styles.posts}>
          {posts.map((p) => (
            <article key={p.id} className={styles.post}>
              <header>
                <strong>{p.authorName}</strong>
                <span> \u00b7 {new Date(p.createdAt).toLocaleString()}</span>
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
