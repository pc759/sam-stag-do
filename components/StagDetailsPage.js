import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import Layout from './Layout';
import styles from '../styles/Details.module.css';
import { defaultContent } from '../lib/siteContent';

export default function StagDetailsPage() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [content, setContent] = useState(defaultContent);
  const [attendingUsers, setAttendingUsers] = useState([]);
  const [cmsPages, setCmsPages] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { router.push('/login'); return; }

    const loadData = async () => {
      const [contentRes, rosterRes, pagesRes] = await Promise.all([
        fetch('/api/site-content'),
        fetch('/api/roster'),
        fetch('/api/pages')
      ]);

      if (contentRes.ok) setContent(await contentRes.json());

      if (rosterRes.ok) {
        const roster = await rosterRes.json();
        setAttendingUsers(
          roster.filter((a) => (a.tags || []).some((t) => t.name?.toLowerCase() === 'attending'))
        );
      }

      if (pagesRes.ok) setCmsPages(await pagesRes.json());

      setDataLoading(false);
    };
    loadData();
  }, [authLoading, isAuthenticated, router]);

  if (authLoading || dataLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  const homepageCards = cmsPages
    .filter((p) => p.showOnHomepage)
    .sort((a, b) => (a.homepageOrder || 0) - (b.homepageOrder || 0));

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.bento}>
          {/* Logo + Title row */}
          <div className={`${styles.card} ${styles.logoCard}`} style={{ gridColumn: 'span 4' }}>
            <div className={styles.logoCardInner}>
              <img
                src={content.siteLogoUrl || '/brand/logo.png'}
                alt="Site logo"
                className={styles.logoCardImage}
              />
            </div>
          </div>
          <div className={`${styles.card} ${styles.detailsCard}`} style={{ gridColumn: 'span 8' }}>
            <p className={styles.kicker}>Stag HQ</p>
            <h1 className={styles.detailsTitle}>Stag Do Details</h1>
            <p className={styles.detailsSubtitle}>Everything you need to know about the weekend</p>
          </div>
          {homepageCards.map((pg) => {
            const spanVal = String(pg.gridSpan || 4).replace(/^span\s*/i, '');
            return (
            <Link
              key={pg.id}
              href={`/p/${pg.slug}`}
              className={styles.card}
              style={{ gridColumn: `span ${spanVal}`, textDecoration: 'none', color: 'inherit' }}
            >
              {pg.icon && <div className={styles.icon}>{pg.icon}</div>}
              <h2>{pg.title}</h2>
              {pg.subtitle && <p>{pg.subtitle}</p>}
            </Link>
            );
          })}

          {/* Who card — full width at bottom */}
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
        </div>
      </div>
    </Layout>
  );
}
