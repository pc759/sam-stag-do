import { useState } from 'react';
import { useRouter } from 'next/router';
import { useBranding } from '../contexts/BrandingContext';
import styles from '../styles/Login.module.css';

export default function Login() {
  const { branding } = useBranding();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const siteTitle = branding?.homeTitle || "Sam's Stag Do";
  const siteTagline = branding?.homeTagline || 'What happens here, stays here...';
  const logoUrl = (branding?.siteLogoUrl || '').trim() || '/brand/logo.png';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      if (res.ok) {
        router.push('/');
      } else {
        setError('Invalid login. Try again.');
        setIdentifier('');
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
          <div className={styles.logoCircleLarge}>
            <img src={logoUrl} alt="" width={160} height={160} decoding="async" />
          </div>
        </div>

        <div className={styles.formContainer}>
          <h1>{siteTitle}</h1>
          <p className={styles.subtitle}>{siteTagline}</p>

          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="identifier">Mobile Number (or admin username)</label>
              <input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. 07123456789"
                disabled={isLoading}
                autoFocus
                autoComplete="username"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="🔐 Password"
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <button type="submit" disabled={isLoading} className={styles.submitBtn}>
              {isLoading ? 'Unlocking...' : 'Enter'}
            </button>
          </form>

          <p className={styles.hint}>
            Use your mobile number and password. Admin can log in with username `pete`.
          </p>
        </div>
      </div>
    </div>
  );
}
