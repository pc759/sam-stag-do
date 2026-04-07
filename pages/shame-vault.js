import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/Layout';
import styles from '../styles/ShameVault.module.css';

export default function ShameVault() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const load = async () => {
      const authRes = await fetch('/api/check-auth');
      if (authRes.status === 401) {
        router.push('/login');
        return;
      }
      const authData = await authRes.json();
      setIsAuthenticated(true);
      setUser(authData.user);
      setIsLoading(false);
    };
    load();
  }, [router]);

  if (isLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Layout isAuthenticated={isAuthenticated} user={user}>
      <div className={styles.container}>
        <header className={styles.hero}>
          <h1>Shame Vault</h1>
          <p className={styles.subtitle}>Stories, chat, and other questionable content.</p>
        </header>
        <div className={styles.grid}>
          <Link href="/stories" className={styles.card}>
            <span className={styles.cardIcon} aria-hidden="true">
              😂
            </span>
            <h2>Sam&apos;s Questionable Choices</h2>
            <p>Embarrassing stories and moments we&apos;ll never let him forget.</p>
            <span className={styles.cardCta}>Read stories →</span>
          </Link>
          <Link href="/chat" className={styles.card}>
            <span className={styles.cardIcon} aria-hidden="true">
              🤖
            </span>
            <h2>Chat with Simtheory</h2>
            <p>Discuss a memory and let Simtheory help you pad out the details.</p>
            <span className={styles.cardCta}>Open chat →</span>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
