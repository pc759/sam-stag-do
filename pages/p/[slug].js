import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/Layout';
import styles from '../../styles/Page.module.css';

const MarkdownRenderer = dynamic(() => import('../../components/MarkdownRenderer'), { ssr: false });

export default function DynamicPage() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { slug } = router.query;
  const [page, setPage] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!slug || authLoading) return;
    if (!isAuthenticated) { router.push('/login'); return; }
    const load = async () => {
      const pageRes = await fetch(`/api/pages?slug=${encodeURIComponent(slug)}`);
      if (pageRes.ok) {
        setPage(await pageRes.json());
      }
      setDataLoading(false);
    };
    load();
  }, [slug, authLoading, isAuthenticated, router]);

  if (authLoading || dataLoading) {
    return <div className={styles.loading}>Loading&hellip;</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!page) {
    return (
      <Layout>
        <div className={styles.notFound}>
          <h1>Page not found</h1>
          <p>This page doesn&apos;t exist or hasn&apos;t been published yet.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.contentCard}>
          <header className={styles.hero}>
            <h1>{page.icon ? `${page.icon} ` : ''}{page.title}</h1>
            {page.subtitle && <p className={styles.subtitle}>{page.subtitle}</p>}
          </header>
          {page.body?.trim() ? (
            <div className={styles.prose}><MarkdownRenderer content={page.body} /></div>
          ) : (
            <p style={{ opacity: 0.6, textAlign: 'center' }}>This page has no content yet.</p>
          )}
        </div>
      </div>
    </Layout>
  );
}
