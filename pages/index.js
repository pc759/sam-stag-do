import { useState, useEffect } from 'react';
import styles from '../styles/Home.module.css';

export default function Home() {
  const [stories, setStories] = useState([]);
  const [author, setAuthor] = useState('');
  const [story, setStory] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      const res = await fetch('/api/stories');
      const data = await res.json();
      setStories(data);
    } catch (error) {
      console.error('Failed to fetch stories:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!author.trim() || !story.trim()) {
      alert('Come on, fill in both fields. Sam deserves better than this.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author, story }),
      });

      if (res.ok) {
        setAuthor('');
        setStory('');
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 3000);
        fetchStories();
      } else {
        alert('Something went wrong. Try again.');
      }
    } catch (error) {
      console.error('Failed to submit story:', error);
      alert('Failed to submit. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>🍺 SAM'S STAG DO 🍺</h1>
        <p className={styles.subtitle}>
          The Official Repository of Sam's Questionable Life Choices
        </p>
      </header>

      <main className={styles.main}>
        <section className={styles.formSection}>
          <h2>Spill the Tea ☕</h2>
          <p className={styles.formDescription}>
            Got an embarrassing story about Sam? Of course you do. Share it here.
          </p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="author">Your Name (or Anonymous if you're a coward)</label>
              <input
                id="author"
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g., That One Mate"
                maxLength="50"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="story">The Embarrassing Story</label>
              <textarea
                id="story"
                value={story}
                onChange={(e) => setStory(e.target.value)}
                placeholder="Tell us about the time Sam did something absolutely ridiculous..."
                rows="6"
                maxLength="1000"
              />
              <p className={styles.charCount}>{story.length}/1000</p>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className={styles.submitBtn}
            >
              {loading ? 'Submitting...' : 'Submit This Gem'}
            </button>

            {submitted && (
              <p className={styles.successMessage}>
                ✅ Story submitted! Sam's going to love this...
              </p>
            )}
          </form>
        </section>

        <section className={styles.storiesSection}>
          <h2>The Hall of Shame 🏆</h2>
          <p className={styles.storiesDescription}>
            {stories.length === 0 
              ? "No stories yet. Come on, you must have something!" 
              : `${stories.length} glorious tale${stories.length !== 1 ? 's' : ''} of Sam's chaos`}
          </p>

          <div className={styles.storiesList}>
            {stories.map((s) => (
              <div key={s.id} className={styles.storyCard}>
                <div className={styles.storyHeader}>
                  <h3>{s.author}</h3>
                  <span className={styles.timestamp}>
                    {new Date(s.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className={styles.storyText}>{s.story}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>Sam's Stag Do © 2025 | Built with questionable judgment</p>
      </footer>
    </div>
  );
}