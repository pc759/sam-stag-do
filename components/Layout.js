import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import styles from '../styles/Layout.module.css';

export default function Layout({ children, isAuthenticated }) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await fetch('/api/logout', { method: 'POST' });
    router.push('/login');
  };

  if (!isAuthenticated) {
    return children;
  }

  const isActive = (path) => router.pathname === path;

  return (
    <div className={styles.container}>
      <nav className={styles.navbar}>
        <div className={styles.navContent}>
          <Link href="/" className={styles.logo}>
            🍺 Sam's Stag Do
          </Link>
          <div className={styles.navLinks}>
            <Link 
              href="/" 
              className={`${styles.navLink} ${isActive('/') ? styles.active : ''}`}
            >
              Home
            </Link>
            <Link 
              href="/details" 
              className={`${styles.navLink} ${isActive('/details') ? styles.active : ''}`}
            >
              Stag Do Details
            </Link>
            <Link 
              href="/stories" 
              className={`${styles.navLink} ${isActive('/stories') ? styles.active : ''}`}
            >
              Sam's Questionable Choices
            </Link>
            <button 
              className={styles.logoutBtn}
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </div>
      </nav>
      <main className={styles.main}>
        {children}
      </main>
      <footer className={styles.footer}>
        <p>Sam's Stag Do 2025 • What happens here, stays here (mostly)</p>
      </footer>
    </div>
  );
}