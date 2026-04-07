import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from './Layout';
import styles from '../styles/Details.module.css';
import { defaultContent } from '../lib/siteContent';

export default function StagDetailsPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [content, setContent] = useState(defaultContent);
  const [attendingUsers, setAttendingUsers] = useState([]);
  const [cmsPages, setCmsPages] = useState([]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/check-auth', { method: 'GET' });
        if (res.status === 401) {
          router.push('/login');
        } else {
          const authData = await res.json();
          setIsAuthenticated(true);
          setUser(authData.user);

          const [contentRes, rosterRes] = await Promise.all([
            fetch('/api/site-content'),
            fetch('/api/roster')
          ]);

          if (contentRes.ok) {
            const contentData = await contentRes.json();
            setContent(contentData);
          }

          if (rosterRes.ok) {
            const roster = await rosterRes.json();
            const attending = roster.filter((attendee) =>
              (attendee.tags || []).some((tag) => tag.name?.toLowerCase() === 'attending')
            );
            setAttendingUsers(attending);
          }

          const pagesRes = await fetch('/api/pages');
          if (pagesRes.ok) {
            setCmsPages(await pagesRes.json());
          }
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

  const homepageCards = cmsPages
    .filter((p) => p.showOnHomepage)
    .sort((a, b) => (a.homepageOrder || 0) - (b.homepageOrder || 0));

  return (
    <Layout isAuthenticated={isAuthenticated} user={user}>
      <div className={styles.container}>
        <div className={styles.heroWrap}>
          <div className={styles.fogLayer} aria-hidden="true">
            <span className={styles.fogA} />
            <span className={styles.fogB} />
          </div>
          <header className={styles.hero}>
            <p className={styles.kicker}>Stag HQ</p>
            <h1>Stag Do Details</h1>
            <p className={styles.subtitle}>Everything you need to know about the weekend</p>
          </header>
        </div>

        <div className={styles.bento}>
          {/* Dynamic CMS cards */}
          {homepageCards.map((pg) => (
            <Link
              key={pg.id}
              href={`/p/${pg.slug}`}
              className={styles.card}
              style={{ gridColumn: `span ${pg.gridSpan || 4}`, textDecoration: 'none', color: 'inherit' }}
            >
              {pg.icon && <div className={styles.icon}>{pg.icon}</div>}
              <h2>{pg.title}</h2>
              {pg.subtitle && <p>{pg.subtitle}</p>}
            </Link>
          ))}

          {/* Built-in Who card (uses live attendee data) */}
          <section className={`${styles.card} ${styles.whoCard}`}>
            <div className={styles.icon}>👥</div>
            <h2>Who</h2>
            <p className={styles.highlight}>
              {attendingUsers.length ? `${attendingUsers.length} Attending` : content.detailsWho}
            </p>
            <p>{content.detailsWhoDescription}</p>
            <div className={styles.attendeeList}>
              {attendingUsers.length > 0 ? (
                attendingUsers.map((attendee) => (
                  <Link key={attendee.id} href={`/attendees/${attendee.id}`} className={styles.attendeePill}>
                    {attendee.photoUrl ? (
                      <img src={attendee.photoUrl} alt={attendee.name} className={styles.attendeeAvatar} />
                    ) : (
                      <span className={styles.attendeeInitial}>{attendee.name?.[0] || '?'}</span>
                    )}
                    <span>{attendee.name}</span>
                  </Link>
                ))
              ) : (
                <p className={styles.emptyAttending}>
                  No attendees are tagged <strong>Attending</strong> yet. Add the tag in admin.
                </p>
              )}
            </div>
          </section>

          {/* Nav-only pages (not on homepage but published) */}
          {cmsPages.filter((p) => !p.showOnHomepage).length > 0 && (
            <section className={`${styles.card} ${styles.pagesCard}`}>
              <h2>More to explore</h2>
              <div className={styles.pagesGrid}>
                {cmsPages.filter((p) => !p.showOnHomepage).map((pg) => (
                  <Link key={pg.id} href={`/p/${pg.slug}`} className={styles.pageLink}>
                    {pg.icon && <span className={styles.pageIcon}>{pg.icon}</span>}
                    <strong>{pg.title}</strong>
                    {pg.subtitle && <p className={styles.pageSub}>{pg.subtitle}</p>}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </Layout>
  );
}
