import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import styles from '../styles/Kitty.module.css';

const MarkdownRenderer = dynamic(() => import('../components/MarkdownRenderer'), { ssr: false });

export default function Kitty() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [html, setHtml] = useState('');

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

      const contentRes = await fetch('/api/site-content');
      if (contentRes.ok) {
        const data = await contentRes.json();
        setHtml(data.kittyHtml || '');
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
        <header className={styles.hero}>
          <h1>Kitty &amp; prizes</h1>
          <p className={styles.subtitle}>What&apos;s in the pot — and what you might win.</p>
        </header>
        {html?.trim() ? (
          <div className={styles.prose}><MarkdownRenderer content={html} /></div>
        ) : (
          <p className={styles.empty}>Nothing listed yet. Check back after the organiser updates this page.</p>
        )}
      </div>
    </Layout>
  );
}
