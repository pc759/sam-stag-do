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
  const [navTree, setNavTree] = useState([]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch('/api/navigation')
      .then((r) => (r.ok ? r.json() : []))
      .then(setNavTree)
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
    return router.asPath === path || router.pathname === path;
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
            {navTree.map((item) =>
              item.children && item.children.length > 0 ? (
                <div key={item.id} className={styles.navDropdown}>
                  <button
                    type="button"
                    className={styles.navDropdownTrigger}
                  >
                    {item.label} &#9662;
                  </button>
                  <div className={styles.navDropdownMenu}>
                    <Link
                      href={item.url}
                      className={`${styles.navLink} ${isActive(item.url) ? styles.active : ''}`}
                      {...(item.openInNewTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    >
                      {item.label}
                    </Link>
                    {item.children.map((child) => (
                      <Link
                        key={child.id}
                        href={child.url}
                        className={`${styles.navLink} ${isActive(child.url) ? styles.active : ''}`}
                        {...(child.openInNewTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <Link
                  key={item.id}
                  href={item.url}
                  className={`${styles.navLink} ${isActive(item.url) ? styles.active : ''}`}
                  {...(item.openInNewTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                >
                  {item.label}
                </Link>
              )
            )}
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
