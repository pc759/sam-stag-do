import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useBranding } from '../contexts/BrandingContext';
import styles from '../styles/Layout.module.css';

export default function Layout({ children, isAuthenticated, user }) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { branding } = useBranding();
  const siteTitle = branding?.homeTitle || "Sam's Stag Do";
  const logoUrl = (branding?.siteLogoUrl || '').trim() || '/brand/logo.png';
  const [navPages, setNavPages] = useState([]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch('/api/pages')
      .then((r) => (r.ok ? r.json() : []))
      .then(setNavPages)
      .catch(() => {});
  }, [isAuthenticated]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await fetch('/api/logout', { method: 'POST' });
    router.push('/login');
  };

  if (!isAuthenticated) {
    return children;
  }

  const isActive = (path) => {
    if (path === '/votes') {
      return router.pathname === '/votes' || router.pathname.startsWith('/votes/');
    }
    return router.pathname === path;
  };

  return (
    <div className={styles.container}>
      <nav className={styles.navbar} aria-label="Main">
        <div className={styles.navContent}>
          <Link href="/" className={styles.logo} aria-label={siteTitle} title={siteTitle}>
            <span className={styles.logoCircle}>
              <img
                src={logoUrl}
                alt=""
                className={styles.logoImage}
                width={56}
                height={56}
                decoding="async"
              />
            </span>
          </Link>
          <div className={styles.navLinks}>
            <Link
              href="/"
              className={`${styles.navLink} ${isActive('/') ? styles.active : ''}`}
            >
              Home
            </Link>
            {navPages.filter((p) => p.showInNav).map((p) => (
              <Link
                key={p.id}
                href={`/p/${p.slug}`}
                className={`${styles.navLink} ${router.asPath === `/p/${p.slug}` ? styles.active : ''}`}
              >
                {p.icon ? `${p.icon} ` : ''}{p.title}
              </Link>
            ))}
            <Link
              href="/shame-vault"
              className={`${styles.navLink} ${isActive('/shame-vault') ? styles.active : ''}`}
            >
              Shame Vault
            </Link>
            <Link
              href="/votes"
              className={`${styles.navLink} ${isActive('/votes') ? styles.active : ''}`}
            >
              Votes
            </Link>
            {user?.traitorChannelAccess ? (
              <Link
                href="/traitor-board"
                className={`${styles.navLink} ${isActive('/traitor-board') ? styles.active : ''}`}
              >
                Traitors
              </Link>
            ) : null}
            {user?.isAdmin && (
              <Link
                href="/admin"
                className={`${styles.navLink} ${isActive('/admin') ? styles.active : ''}`}
              >
                Admin
              </Link>
            )}
          </div>
          <div className={styles.navUser}>
            <button
              type="button"
              className={styles.logoutBtn}
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </button>
            <Link
              href="/profile"
              className={`${styles.navLink} ${styles.navProfile} ${
                isActive('/profile') ? styles.active : ''
              }`}
            >
              My Profile
            </Link>
          </div>
        </div>
      </nav>
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}>
        <p>
          {siteTitle} • What happens here, stays here (mostly)
        </p>
      </footer>
    </div>
  );
}
