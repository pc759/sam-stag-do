import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import styles from '../../styles/Page.module.css';

export default function DynamicPage() {
  const router = useRouter();
  const { slug } = router.query;
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [page, setPage] = useState(null);

  useEffect(() => {
    if (!slug) return;

    const load = async () => {
      const authRes = await fetch('/api/check-auth');
      if (authRes.status === 401) {
        router.push('/login');
        return;
      }
      const authData = await authRes.json();
      setUser(authData.user);
      setIsAuthenticated(true);

      const pageRes = await fetch(`/api/pages?slug=${encodeURIComponent(slug)}`);
      if (pageRes.ok) {
        setPage(await pageRes.json());
      }
      setIsLoading(false);
    };
    load();
  }, [slug, router]);

  if (isLoading) {
    return <div className={styles.loading}>Loading&hellip;</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!page) {
    return (
      <Layout isAuthenticated={isAuthenticated} user={user}>
        <div className={styles.notFound}>
          <h1>Page not found</h1>
          <p>This page doesn&apos;t exist or hasn&apos;t been published yet.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout isAuthenticated={isAuthenticated} user={user}>
      <div className={styles.container}>
        <div className={styles.contentCard}>
          <header className={styles.hero}>
            <h1>{page.icon ? `${page.icon} ` : ''}{page.title}</h1>
            {page.subtitle && <p className={styles.subtitle}>{page.subtitle}</p>}
          </header>
          {page.body?.trim() ? (
            <div className={styles.prose} dangerouslySetInnerHTML={{ __html: page.body }} />
          ) : (
            <p style={{ opacity: 0.6, textAlign: 'center' }}>This page has no content yet.</p>
          )}
        </div>
      </div>
    </Layout>
  );
}