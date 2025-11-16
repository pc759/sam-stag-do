import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import styles from '../styles/Details.module.css';

export default function Details() {
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
        <h1>Stag Do Details</h1>
        <p className={styles.subtitle}>Everything you need to know about the weekend</p>

        <div className={styles.grid}>
          <div className={styles.detailCard}>
            <div className={styles.icon}>📅</div>
            <h2>When</h2>
            <p className={styles.highlight}>June/July 2025</p>
            <p>Specific dates to be confirmed. Check back soon for exact dates and times.</p>
          </div>

          <div className={styles.detailCard}>
            <div className={styles.icon}>📍</div>
            <h2>Where</h2>
            <p className={styles.highlight}>Location TBD</p>
            <p>We're still finalizing the location. It's going to be epic, that's all we can say for now.</p>
          </div>

          <div className={styles.detailCard}>
            <div className={styles.icon}>👥</div>
            <h2>Who</h2>
            <p className={styles.highlight}>~12 People</p>
            <p>The core crew. If you're reading this, you're invited. Congratulations!</p>
          </div>

          <div className={styles.detailCard}>
            <div className={styles.icon}>💰</div>
            <h2>Cost</h2>
            <p className={styles.highlight}>TBD</p>
            <p>Budget breakdown and payment details coming soon. We'll keep it reasonable (probably).</p>
          </div>
        </div>

        <div className={styles.section}>
          <h2>What to Bring</h2>
          <ul className={styles.list}>
            <li>Valid ID / Passport</li>
            <li>Comfortable shoes (you'll be doing a lot of walking)</li>
            <li>Smart casual outfit for dinner</li>
            <li>Sense of humor (essential)</li>
            <li>Willingness to embarrass Sam (highly encouraged)</li>
            <li>Phone charger</li>
            <li>Sunscreen (if applicable)</li>
          </ul>
        </div>

        <div className={styles.section}>
          <h2>Itinerary</h2>
          <p>
            The full itinerary will be posted here as we get closer to the date. For now, just know that 
            it's going to involve good food, good drinks, and plenty of opportunities to remind Sam of his 
            questionable life choices.
          </p>
          <p>
            More details coming soon! In the meantime, start thinking about embarrassing stories to share.
          </p>
        </div>

        <div className={styles.section}>
          <h2>Questions?</h2>
          <p>
            Have questions about the stag do? Drop them in the chat (coming soon) or reach out to the group.
          </p>
        </div>
      </div>
    </Layout>
  );
}