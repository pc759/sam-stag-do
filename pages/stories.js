import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import styles from '../styles/Stories.module.css';

export default function Stories() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stories, setStories] = useState([]);
  const [author, setAuthor] = useState('');
  const [story, setStory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/check-auth', { method: 'GET' });
        if (res.status === 401) {
          router.push('/login');
        } else {
          setIsAuthenticated(true);
          fetchStories();
        }
      } catch (err) {
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const fetchStories = async () => {
    try {
      const res = await fetch('/api/stories');
      const data = await res.json();
      setStories(data);
    } catch (err) {
      console.error('Failed to fetch stories:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author, story }),
      });

      if (res.ok) {
        setSubmitMessage('✓ Story added! Thanks for the laugh.');
        setAuthor('');
        setStory('');
        fetchStories();
        setTimeout(() => setSubmitMessage(''), 3000);
      } else {
        setSubmitMessage('✗ Failed to add story. Try again.');
      }
    } catch (err) {
      setSubmitMessage('✗ Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Layout isAuthenticated={isAuthenticated}>
      <div className={styles.container}>
        <h1>Sam's Questionable Choices</h1>
        <p className={styles.subtitle}>A repository of embarrassing stories and moments we'll never let him forget</p>

        <div className={styles.formSection}>
          <h2>Add Your Story</h2>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="author">Your Name</label>
              <input
                id="author"
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Who's telling this story?"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="story">The Story</label>
              <textarea
                id="story"
                value={story}
                onChange={(e) => setStory(e.target.value)}
                placeholder="Tell us about Sam's questionable choice... Be creative, be crude, be funny!"
                rows="6"
                required
                disabled={isSubmitting}
              />
            </div>

            {submitMessage && (
              <div className={`${styles.message} ${submitMessage.startsWith('✓') ? styles.success : styles.error}`}>
                {submitMessage}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isSubmitting}
              className={styles.submitBtn}
            >
              {isSubmitting ? 'Adding Story...' : 'Add Story'}
            </button>
          </form>
        </div>

        <div className={styles.storiesSection}>
          <h2>The Stories ({stories.length})</h2>
          
          {stories.length === 0 ? (
            <div className={styles.noStories}>
              <p>No stories yet. Be the first to roast Sam!</p>
            </div>
          ) : (
            <div className={styles.storiesList}>
              {stories.map((s) => (
                <div key={s.id} className={styles.storyCard}>
                  <div className={styles.storyHeader}>
                    <h3>{s.author}</h3>
                    <span className={styles.date}>
                      {new Date(s.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className={styles.storyText}>{s.story}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}