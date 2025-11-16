import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import styles from '../styles/Home.module.css';

export default function Home() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/check-auth', { method: 'GET' });
        if (res.status === 401) {
          router.push('/login');
        } else {
          setIsAuthenticated(true);
        }
      } catch (err) {
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Layout isAuthenticated={isAuthenticated}>
      <div className={styles.container}>
        <div className={styles.hero}>
          <h1>Welcome to Sam's Stag Do</h1>
          <p className={styles.tagline}>June/July 2025 • A weekend to remember (or forget)</p>
        </div>

        <div className={styles.grid}>
          <div className={styles.card}>
            <div className={styles.cardIcon}>📋</div>
            <h2>Stag Do Details</h2>
            <p>Everything you need to know about the weekend. Dates, times, locations, and what to bring.</p>
            <a href="/details" className={styles.cardLink}>View Details →</a>
          </div>

          <div className={styles.card}>
            <div className={styles.cardIcon}>😂</div>
            <h2>Sam's Questionable Choices</h2>
            <p>A repository of embarrassing stories, questionable decisions, and moments we'll never let him forget.</p>
            <a href="/stories" className={styles.cardLink}>Read Stories →</a>
          </div>

          <div className={styles.card}>
            <div className={styles.cardIcon}>🤖</div>
            <h2>Chat with Sam's AI</h2>
            <p>Coming soon... Ask Sam's AI anything about the stag do, or just have a laugh.</p>
            <a href="#" className={`${styles.cardLink} ${styles.disabled}`}>Coming Soon</a>
          </div>
        </div>

        <div className={styles.section}>
          <h2>What's This All About?</h2>
          <p>
            This is your private hub for all things Sam's Stag Do. Share stories, coordinate plans, and make sure 
            we've got everything sorted for an epic weekend. What happens here, stays here... mostly.
          </p>
          <p>
            Password protected and not indexed by search engines, so feel free to be as crude and witty as you like!
          </p>
        </div>
      </div>
    </Layout>
  );
}