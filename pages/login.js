import { useState } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Login.module.css';

export default function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push('/');
      } else {
        setError('Invalid password. Try again.');
        setPassword('');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginBox}>
        <div className={styles.imageContainer}>
          <div className={styles.placeholder}>
            <span>📸</span>
            <p>Sam's Photo</p>
            <small>(Upload your photo here)</small>
          </div>
        </div>

        <div className={styles.formContainer}>
          <h1>Sam's Stag Do</h1>
          <p className={styles.subtitle}>What happens here, stays here...</p>

          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="password">Enter Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="🔐 Password"
                disabled={isLoading}
                autoFocus
              />
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <button 
              type="submit" 
              disabled={isLoading}
              className={styles.submitBtn}
            >
              {isLoading ? 'Unlocking...' : 'Enter'}
            </button>
          </form>

          <p className={styles.hint}>
            💡 Hint: Check your email or ask the group chat
          </p>
        </div>
      </div>
    </div>
  );
}