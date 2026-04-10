import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import styles from '../styles/ShameVault.module.css';

export default function ShameVault() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  if (authLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Layout>
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
              💌
            </span>
            <h2>Dear Stagony Aunt</h2>
            <p>Got a problem? Got a Sam story? Write in and let the Stagony Aunt roast him for you.</p>
            <span className={styles.cardCta}>Write in →</span>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
